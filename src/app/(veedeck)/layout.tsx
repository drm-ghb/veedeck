import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import NotificationBell from "@/components/dashboard/NotificationBell";
import NavSidebar from "@/components/dashboard/NavSidebar";
import MobileMenu from "@/components/dashboard/MobileMenu";
import MobileSearch from "@/components/dashboard/MobileSearch";
import { LogoBrand } from "@/components/dashboard/LogoBrand";
import { QuickNoteButton } from "@/components/notatnik/QuickNoteButton";
import { prisma } from "@/lib/prisma";
import { ColorThemeSync } from "@/components/dashboard/ColorThemeSync";
import type { ColorTheme } from "@/lib/theme";
import TrialBadge from "@/components/dashboard/TrialBadge";
import TrialCheck from "@/components/dashboard/TrialCheck";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import OnboardingTrigger from "@/components/dashboard/OnboardingTrigger";

export default async function VeedeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, fullName: true, email: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, colorTheme: true, trialEndsAt: true, isFree: true, viewPreferences: true, subscription: { select: { status: true, cancelAt: true } } },
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
  const colorTheme = (dbUser?.colorTheme ?? "champagne") as ColorTheme;
  const viewPrefs = (dbUser?.viewPreferences ?? {}) as Record<string, unknown>;
  const sidebarOrder = (viewPrefs.sidebarOrder as string[]) ?? [];
  const isTrial = !!(dbUser?.trialEndsAt && dbUser.trialEndsAt > new Date() && !dbUser.isFree && dbUser.subscription?.status !== "active");
  const showOnboarding = isTrial && !viewPrefs.onboardingSeen;

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <ColorThemeSync dbTheme={colorTheme} />
      <nav className="relative z-30">
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
            {isTrial && (
              <>
                <TrialBadge trialEndsAt={dbUser!.trialEndsAt!.toISOString()} />
                <OnboardingTrigger />
              </>
            )}
            <div className="md:hidden"><MobileSearch /></div>
            <QuickNoteButton />
            <NotificationBell userId={session.user.id!} iconOnly />
            {firstName && (
              <a href="/ustawienia/ogolne" className="hidden md:flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold leading-none shrink-0 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : firstName[0].toUpperCase()
                  }
                </div>
                <span className="text-sm font-medium text-foreground">{firstName}</span>
              </a>
            )}
            <div className="hidden md:block"><SignOutButton /></div>
            <div className="md:hidden">
              <MobileMenu userName={firstName} logoUrl={avatarUrl} hiddenModules={hiddenModules} isTrial={isTrial} />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} sidebarOrder={sidebarOrder} userId={session.user.id!} isTrial={isTrial} />
        <main className="flex-1 flex flex-col min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
      <TrialCheck />
      <OnboardingModal show={showOnboarding} />
    </div>
  );
}
