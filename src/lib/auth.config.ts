import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no DB, no bcrypt) — used by middleware
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // providers are added in auth.ts
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
        (session.user as any).needsNameSetup = token.needsNameSetup as boolean;
        (session.user as any).role = token.role ?? "designer";
      }
      return session;
    },
  },
};
