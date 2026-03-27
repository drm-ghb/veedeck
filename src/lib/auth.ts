import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logActivity } from "./activity-log";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await prisma.loginLog.create({ data: { email, success: false } });
          await logActivity({ level: "warn", action: "LOGIN_FAILED", message: `Nieudane logowanie: ${email} (użytkownik nie istnieje)` });
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          await prisma.loginLog.create({ data: { email, userId: user.id, success: false } });
          await logActivity({ level: "warn", action: "LOGIN_FAILED", message: `Nieudane logowanie: ${email} (złe hasło)`, userId: user.id });
          return null;
        }

        await prisma.loginLog.create({ data: { email, userId: user.id, success: true } });

        return { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
