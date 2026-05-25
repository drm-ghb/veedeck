import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { LogoBrand } from "@/components/dashboard/LogoBrand";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import NavSidebar from "@/components/dashboard/NavSidebar";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import { QuickNoteButton } from "@/components/notatnik/QuickNoteButton";
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
    select: { name: true, fullName: true, email: true, globalHiddenModules: true, clientLogoUrl: true, ownerId: true, viewPreferences: true },
  });

  // Jeśli to członek zespołu — pobierz ustawienia projektanta
  const ownerId = dbUser?.ownerId;
  const ownerSettings = ownerId
    ? await prisma.user.findUnique({
        where: { id: ownerId },
        select: { globalHiddenModules: true, clientLogoUrl: true },
      })
    : null;

  const fullName = dbUser?.fullName ?? null;
  const displayName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const hiddenModules = (ownerSettings ?? dbUser)?.globalHiddenModules ?? [];
  const logoUrl = (ownerSettings ?? dbUser)?.clientLogoUrl ?? null;
  const sidebarOrder = ((dbUser?.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? [];

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <nav className="relative z-10">
        <div className="px-4 flex items-center gap-2 py-3">
          {/* Left: logo */}
          <div className="shrink-0 sm:flex-1 flex items-center gap-2">
            <LogoBrand />
          </div>

          {/* Search - centered on full screen width (sm+) */}
          <div className="hidden sm:flex flex-1 justify-center px-2 min-w-0">
            <div className="w-full max-w-sm">
              <GlobalSearch />
            </div>
          </div>

          {/* Right: bell + avatar + logout */}
          <div className="ml-auto sm:ml-0 shrink-0 sm:flex-1 flex items-center gap-2 justify-end">
            <div className="md:hidden"><MobileSearch /></div>
            <QuickNoteButton />
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
      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} sidebarOrder={sidebarOrder} userId={session.user.id!} />
        <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
    </div>
  );
}
