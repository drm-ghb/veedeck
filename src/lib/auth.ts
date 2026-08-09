import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logActivity } from "./activity-log";
import { authConfig } from "./auth.config";
import { verifyAccessToken, extendTokenExpiry } from "./access-token";

/** Find the designer responsible for a client/contractor and send first-login notification. */
async function notifyDesignerFirstLogin(userId: string, role: string): Promise<void> {
  try {
    let designerId: string | null = null;
    let personName: string | null = null;

    if (role === "client") {
      // Find via ProjectClient → Client → designer
      const contact = await prisma.projectClient.findFirst({
        where: { userId },
        include: { client: { select: { designerId: true, name: true } } },
      });
      designerId = contact?.client?.designerId ?? null;
      personName = contact?.name ?? null;
    } else if (role === "contractor") {
      const contractor = await prisma.contractor.findFirst({
        where: { userId },
        select: { designerId: true, name: true },
      });
      designerId = contractor?.designerId ?? null;
      personName = contractor?.name ?? null;
    }

    if (!designerId) return;

    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: { email: true, contactEmail: true },
    });
    if (!designer) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    const label = role === "client" ? "Klient" : "Wykonawca";

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: designerId,
        message: `${label} ${personName ?? "nieznany"} po raz pierwszy otworzył panel (${dateStr} ${timeStr}).`,
        link: role === "client" ? "/klienci" : "/wykonawcy",
        type: "info",
      },
    });

    // Email notification
    const toEmail = designer.contactEmail ?? designer.email;
    if (toEmail) {
      const { sendFirstLoginNotification } = await import("./email");
      await sendFirstLoginNotification({
        to: toEmail,
        personName: personName ?? "Nieznany",
        role: label,
        date: dateStr,
        time: timeStr,
      });
    }
  } catch (err) {
    console.error("[auth] notifyDesignerFirstLogin error:", err);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: {
    ...PrismaAdapter(prisma),
    // Override getUserByEmail to use findFirst (email is not @unique in schema due to legacy data)
    getUserByEmail: (email: string) =>
      prisma.user.findFirst({ where: { email } }),
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [GoogleProvider({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
        impersonateToken: { label: "Impersonate Token", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        // Access token path — passwordless entry via /p/[token]
        if (credentials?.accessToken) {
          const raw = credentials.accessToken as string;
          const result = await verifyAccessToken(raw);
          if (!result.ok) return null;

          const user = await prisma.user.findUnique({
            where: { id: result.userId },
            select: { id: true, email: true, name: true, role: true },
          });
          if (!user) return null;

          // Extend sliding window
          await extendTokenExpiry(result.tokenId);

          // First login — set firstLoginAt atomically and notify designer
          const updated = await prisma.user.updateMany({
            where: { id: user.id, firstLoginAt: null },
            data: { firstLoginAt: new Date() },
          });
          if (updated.count > 0) {
            // Fire-and-forget: notify designer of first login
            void notifyDesignerFirstLogin(user.id, user.role).catch(() => {});
          }

          return { id: user.id, email: user.email, name: user.name, isAdmin: false, role: user.role };
        }

        // Impersonation path — admin-generated one-time token
        if (credentials?.impersonateToken) {
          const rec = await prisma.impersonationToken.findUnique({
            where: { token: credentials.impersonateToken as string },
            include: { user: true },
          });
          if (!rec || rec.expiresAt < new Date()) return null;
          await prisma.impersonationToken.delete({ where: { id: rec.id } });
          const u = rec.user;
          return { id: u.id, email: u.email, name: u.name, isAdmin: false, role: u.role };
        }

        if (!credentials?.email || !credentials?.password) return null;

        const identifier = credentials.email as string;

        // Support both email (designers) and login (clients)
        // For email logins, find the primary account (not a workspace member copy)
        const user = identifier.includes("@")
          ? await prisma.user.findFirst({ where: { email: identifier, primaryAccountId: null } })
          : await prisma.user.findUnique({ where: { login: identifier } });

        if (!user || !user.password) {
          await prisma.loginLog.create({ data: { email: identifier, success: false } });
          await logActivity({ level: "warn", action: "LOGIN_FAILED", message: `Nieudane logowanie: ${identifier} (użytkownik nie istnieje)` });
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          await prisma.loginLog.create({ data: { email: identifier, userId: user.id, success: false } });
          await logActivity({ level: "warn", action: "LOGIN_FAILED", message: `Nieudane logowanie: ${identifier} (złe hasło)`, userId: user.id });
          return null;
        }

        if (user.activationToken) {
          await prisma.loginLog.create({ data: { email: identifier, userId: user.id, success: false } });
          return null;
        }

        await prisma.loginLog.create({ data: { email: identifier, userId: user.id, success: true } });

        return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, role: user.role };
      },
    }),
  ],
  events: {
    async linkAccount({ user, account }) {
      // When a Google account is linked for the first time, require the user to set their name
      if (account.provider === "google") {
        await prisma.user.update({
          where: { id: user.id },
          data: { needsNameSetup: true },
        });
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile && user.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true },
          });
          if (!dbUser?.fullName && profile.name) {
            await prisma.user.update({
              where: { id: user.id },
              data: { fullName: profile.name as string },
            });
          }
        } catch (e) {
          console.error("[auth] signIn callback error (Google fullName):", e);
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin;
        token.role = (user as any).role ?? "designer";
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id as string },
            select: { needsNameSetup: true, ownerId: true, role: true, systemRole: true, trialEndsAt: true, isFree: true, subscription: { select: { status: true } } },
          });
          token.needsNameSetup = dbUser?.needsNameSetup ?? false;
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
          token.systemRole = dbUser?.systemRole ?? "member";
          token.trialEndsAt = dbUser?.trialEndsAt?.toISOString() ?? null;
          token.isFree = dbUser?.isFree ?? false;
          token.hasActiveSubscription = dbUser?.subscription?.status === "active";
          token.memberHiddenModules = [];
          // isMainContact — for clients, determines who can accept renders/lists
          if (dbUser?.role === "client") {
            const contact = await prisma.projectClient.findFirst({
              where: { userId: user.id as string },
              select: { isMainContact: true },
            });
            token.isMainContact = contact?.isMainContact ?? false;
          }
        } catch (e) {
          console.error("[auth] JWT callback prisma error:", e);
          token.needsNameSetup = false;
          token.ownerId = null;
        }
      } else if (token.ownerId === undefined || token.isAdmin === undefined) {
        // Stary token bez ownerId/isAdmin — jednorazowe doładowanie z bazy
        const userId = (token.id ?? token.sub) as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { ownerId: true, role: true, isAdmin: true, systemRole: true, trialEndsAt: true, isFree: true, subscription: { select: { status: true } } },
          });
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
          token.isAdmin = dbUser?.isAdmin ?? false;
          token.systemRole = dbUser?.systemRole ?? "member";
          token.trialEndsAt = dbUser?.trialEndsAt?.toISOString() ?? null;
          token.isFree = dbUser?.isFree ?? false;
          token.hasActiveSubscription = dbUser?.subscription?.status === "active";
          token.memberHiddenModules = [];
        } catch (e) {
          console.error("[auth] JWT callback prisma error (refresh):", e);
          token.ownerId = null;
        }
      }
      if (trigger === "update") {
        const userId = (token.id ?? token.sub) as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { needsNameSetup: true, name: true, ownerId: true, role: true, isAdmin: true, systemRole: true, trialEndsAt: true, isFree: true, subscription: { select: { status: true } } },
          });
          token.needsNameSetup = dbUser?.needsNameSetup ?? false;
          token.name = dbUser?.name ?? token.name;
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
          token.isAdmin = dbUser?.isAdmin ?? false;
          token.systemRole = dbUser?.systemRole ?? "member";
          token.trialEndsAt = dbUser?.trialEndsAt?.toISOString() ?? null;
          token.isFree = dbUser?.isFree ?? false;
          token.hasActiveSubscription = dbUser?.subscription?.status === "active";
          token.memberHiddenModules = [];
        } catch (e) {
          console.error("[auth] JWT callback prisma error (update):", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
        (session.user as any).needsNameSetup = token.needsNameSetup as boolean;
        (session.user as any).ownerId = token.ownerId ?? null;
        (session.user as any).role = token.role ?? "designer";
        (session.user as any).trialEndsAt = token.trialEndsAt ?? null;
        (session.user as any).isFree = token.isFree ?? false;
        (session.user as any).hasActiveSubscription = token.hasActiveSubscription ?? false;
        (session.user as any).isMainContact = token.isMainContact ?? null;
        (session.user as any).systemRole = token.systemRole ?? "member";
      }
      return session;
    },
  },
});
