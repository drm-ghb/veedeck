import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;
  const isAdmin = (session?.user as any)?.isAdmin === true;
  const isLoggedIn = !!session?.user;

  // --- Admin routes ---

  // Redirect already-logged-in admin away from /admin/login
  if (pathname === "/admin/login" && isLoggedIn && isAdmin) {
    return NextResponse.redirect(new URL("/admin/users", req.url));
  }

  // Protect all /admin/* except /admin/login — require admin session
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Block admin users from accessing regular app routes
  if (
    isLoggedIn &&
    isAdmin &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/admin/users", req.url));
  }

  // --- Regular user routes ---

  // Redirect to complete-profile if needsNameSetup
  if (
    session?.user &&
    !isAdmin &&
    (session.user as any).needsNameSetup &&
    !pathname.startsWith("/complete-profile") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/complete-profile", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
