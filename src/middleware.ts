import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;
  const isAdmin = (session?.user as any)?.isAdmin === true;
  const isLoggedIn = !!session?.user;
  const role = (session?.user as any)?.role ?? "designer";
  const isClient = isLoggedIn && role === "client";
  const isContractor = isLoggedIn && role === "contractor";

  let redirectTo: URL | null = null;

  // --- Admin routes ---

  if (pathname === "/admin/login" && isLoggedIn && isAdmin) {
    redirectTo = new URL("/admin/users", req.url);
  } else if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isLoggedIn || !isAdmin) {
      redirectTo = new URL("/admin/login", req.url);
    }
  } else if (
    isLoggedIn &&
    isAdmin &&
    (session?.user as any)?.email !== "bigdan799@gmail.com" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/")
  ) {
    redirectTo = new URL("/admin/users", req.url);
  }

  // --- Contractor routes ---

  if (!redirectTo) {
    if (
      isContractor &&
      !pathname.startsWith("/wykonawca") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/p/") &&
      !pathname.startsWith("/_next")
    ) {
      redirectTo = new URL("/wykonawca", req.url);
    } else if (pathname.startsWith("/wykonawca") && !pathname.startsWith("/api/")) {
      if (!isLoggedIn) {
        redirectTo = new URL("/login/wykonawca", req.url);
      } else if (!isContractor) {
        redirectTo = new URL("/panel-glowny", req.url);
      }
    }
  }

  // --- Client routes ---

  if (!redirectTo) {
    if (
      isClient &&
      !pathname.startsWith("/client") &&
      !pathname.startsWith("/share/") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/p/") &&
      !pathname.startsWith("/_next")
    ) {
      redirectTo = new URL("/client", req.url);
    } else if (pathname.startsWith("/client") && !pathname.startsWith("/api/")) {
      if (!isLoggedIn) {
        const loginUrl = new URL("/login/klient", req.url);
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
        redirectTo = loginUrl;
      }
    }
  }

  // --- Team member module access ---

  if (!redirectTo) {
    const memberHiddenModules: string[] = (session?.user as any)?.memberHiddenModules ?? [];
    if (memberHiddenModules.length > 0 && !pathname.startsWith("/api/")) {
      const MODULE_ROUTES: Record<string, string> = {
        renderflow: "/projectflow",
        klienci: "/klienci",
        listy: "/listy-zakupowe",
        wykonawcy: "/wykonawcy",
        zadania: "/zadania",
        produkty: "/biblioteka",
        kalendarz: "/kalendarz",
        notatnik: "/notatnik",
        dyskusje: "/dyskusje",
        ankiety: "/ankiety",
        veezard: "/veezard",
      };
      for (const [slug, route] of Object.entries(MODULE_ROUTES)) {
        if (memberHiddenModules.includes(slug) && pathname.startsWith(route)) {
          redirectTo = new URL("/panel-glowny", req.url);
          break;
        }
      }
    }
  }

  // Backward compat: redirect /dashboard → /panel-glowny
  if (!redirectTo && pathname === "/dashboard") {
    redirectTo = new URL("/panel-glowny", req.url);
  }

  // --- Regular user routes ---

  const profileComplete = req.cookies.get("profile-complete")?.value === "1";
  if (
    !redirectTo &&
    session?.user &&
    !isAdmin &&
    !isClient &&
    !isContractor &&
    (session.user as any).needsNameSetup &&
    !profileComplete &&
    !pathname.startsWith("/complete-profile") &&
    !pathname.startsWith("/api/")
  ) {
    redirectTo = new URL("/complete-profile", req.url);
  }

  // Build response
  const response = redirectTo
    ? NextResponse.redirect(redirectTo)
    : NextResponse.next();

  // Signal cookie readable by veedeck.com static site JS
  const cookieOpts = {
    domain: ".veedeck.com",
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    httpOnly: false,
  };
  if (isLoggedIn) {
    response.cookies.set("vd_logged_in", "1", { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
  } else {
    response.cookies.set("vd_logged_in", "", { ...cookieOpts, maxAge: 0 });
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.woff2$|.*\\.woff$|.*\\.ttf$|.*\\.eot$|.*\\.ico$|api/auth).*)"],
};
