import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { HomeLinkIcon } from "@/components/dashboard/HomeLinkIcon";
import NavSidebar from "@/components/dashboard/NavSidebar";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import { prisma } from "@/lib/prisma";

export default async function ListyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, email: true, navMode: true, globalHiddenModules: true, clientLogoUrl: true },
  });

  const displayName = dbUser?.name || dbUser?.email || null;
  const navMode = dbUser?.navMode ?? "dashboard";
  const hiddenModules = dbUser?.globalHiddenModules ?? [];
  const logoUrl = dbUser?.clientLogoUrl ?? null;

  return (
    <div className="h-screen flex flex-col bg-muted/60">
      <nav>
        <div className="px-4 flex items-center gap-4 py-3 relative">
          {/* Left: home + logo */}
          <div className="flex items-center gap-2 shrink-0">
            <HomeLinkIcon hidden={navMode === "sidebar"} />
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span className="text-[1.5625rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-story-script)" }}>veedeck</span>
            </Link>
          </div>

          {/* Search - centered */}
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-sm px-4 hidden sm:block">
            <GlobalSearch />
          </div>

          {/* Right: bell + avatar + logout */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="md:hidden"><MobileSearch /></div>
            <NotificationBell userId={session.user.id!} iconOnly />
            {displayName && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    : displayName[0].toUpperCase()
                  }
                </div>
                <span className="text-sm font-medium text-foreground">{displayName}</span>
              </div>
            )}
            <div className="hidden md:block"><SignOutButton /></div>
            <div className="md:hidden">
              <MobileMenu userName={displayName} logoUrl={logoUrl} hiddenModules={hiddenModules} />
            </div>
          </div>
        </div>
      </nav>
      {navMode === "sidebar" ? (
        <div className="flex flex-1 min-h-0">
          <NavSidebar hiddenModules={hiddenModules} />
          <main className="flex-1 px-6 py-6 overflow-y-auto bg-background rounded-tl-2xl">
            {children}
          </main>
        </div>
      ) : (
        <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
          {children}
        </main>
      )}
    </div>
  );
}
