import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logActivity } from "./activity-log";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = credentials.email as string;

        // Support both email (designers) and login (clients)
        const user = identifier.includes("@")
          ? await prisma.user.findUnique({ where: { email: identifier } })
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin;
        token.role = (user as any).role ?? "designer";
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id as string },
            select: { needsNameSetup: true, ownerId: true, role: true },
          });
          token.needsNameSetup = dbUser?.needsNameSetup ?? false;
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
        } catch (e) {
          console.error("[auth] JWT callback prisma error:", e);
          token.needsNameSetup = false;
          token.ownerId = null;
        }
      } else if (token.ownerId === undefined) {
        // Stary token bez ownerId — jednorazowe doładowanie z bazy
        const userId = (token.id ?? token.sub) as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { ownerId: true, role: true },
          });
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
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
            select: { needsNameSetup: true, name: true, ownerId: true, role: true },
          });
          token.needsNameSetup = dbUser?.needsNameSetup ?? false;
          token.name = dbUser?.name ?? token.name;
          token.ownerId = dbUser?.ownerId ?? null;
          token.role = dbUser?.role ?? "designer";
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
      }
      return session;
    },
  },
});
