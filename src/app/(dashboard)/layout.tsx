import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "@/components/ui/icons";
import { LogoBrand } from "@/components/dashboard/LogoBrand";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import NavSidebar from "@/components/dashboard/NavSidebar";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import TrialBadge from "@/components/dashboard/TrialBadge";
import { QuickNoteButton } from "@/components/notatnik/QuickNoteButton";
import { prisma } from "@/lib/prisma";
import TrialCheck from "@/components/dashboard/TrialCheck";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, fullName: true, email: true, isAdmin: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, trialEndsAt: true, isFree: true, viewPreferences: true },
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
  const firstName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
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
            {dbUser?.isAdmin && (
              <Link href="/admin" className="hidden md:flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors ml-2">
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}
          </div>

          {/* Search - centered on full screen width (sm+) */}
          <div className="hidden sm:flex flex-1 justify-center px-2 min-w-0">
            <div className="w-full max-w-sm">
              <GlobalSearch />
            </div>
          </div>

          {/* Right: bell + avatar + logout */}
          <div className="ml-auto sm:ml-0 shrink-0 sm:flex-1 flex items-center gap-2 justify-end">
            {dbUser?.trialEndsAt && !dbUser.isFree && (
              <TrialBadge trialEndsAt={dbUser.trialEndsAt.toISOString()} />
            )}
            <div className="md:hidden"><MobileSearch /></div>
            <QuickNoteButton />
            <NotificationBell userId={session.user.id!} iconOnly />
            {firstName && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold leading-none shrink-0 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : firstName[0].toUpperCase()
                  }
                </div>
                <span className="text-sm font-medium text-foreground">{firstName}</span>
              </div>
            )}
            <div className="hidden md:block"><SignOutButton /></div>
            <div className="md:hidden">
              <MobileMenu userName={firstName} logoUrl={avatarUrl} hiddenModules={hiddenModules} />
            </div>
          </div>
        </div>
      </nav>
      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} isAdmin={dbUser?.isAdmin ?? false} sidebarOrder={sidebarOrder} userId={session.user.id!} />
        <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
      <TrialCheck />
    </div>
  );
}
