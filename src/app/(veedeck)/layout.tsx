import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavSidebar from "@/components/dashboard/NavSidebar";
import { prisma } from "@/lib/prisma";
import { ColorThemeSync } from "@/components/dashboard/ColorThemeSync";
import type { ColorTheme } from "@/lib/theme";
import TrialCheck from "@/components/dashboard/TrialCheck";
import OnboardingModal from "@/components/dashboard/OnboardingModal";
import OnboardingTrigger from "@/components/dashboard/OnboardingTrigger";
import AppNavbar from "@/components/dashboard/AppNavbar";

export default async function VeedeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("nav-sidebar-collapsed")?.value === "true";

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { name: true, fullName: true, email: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, colorTheme: true, customTheme: true, trialEndsAt: true, isFree: true, viewPreferences: true, subscription: { select: { status: true, cancelAt: true } } },
  });

  const ownerId = dbUser?.ownerId;
  const [ownerSettings, memberPerms] = await Promise.all([
    ownerId ? prisma.user.findUnique({ where: { id: ownerId }, select: { globalHiddenModules: true, clientLogoUrl: true } }) : null,
    ownerId ? prisma.teamMemberPermission.findUnique({ where: { memberId: session.user.id! }, select: { hiddenModules: true } }) : null,
  ]);

  const fullName = dbUser?.fullName ?? null;
  const firstName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const hiddenModules = [...new Set([...((ownerSettings ?? dbUser)?.globalHiddenModules ?? []), ...(memberPerms?.hiddenModules ?? [])])];
  const colorTheme = (dbUser?.colorTheme ?? "champagne") as ColorTheme;
  const viewPrefs = (dbUser?.viewPreferences ?? {}) as Record<string, unknown>;
  const sidebarOrder = (viewPrefs.sidebarOrder as string[]) ?? [];
  const isTrial = !!(dbUser?.trialEndsAt && dbUser.trialEndsAt > new Date() && !dbUser.isFree && dbUser.subscription?.status !== "active");
  const showOnboarding = isTrial && !viewPrefs.onboardingSeen;

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <ColorThemeSync dbTheme={colorTheme} dbCustomTheme={dbUser?.customTheme as import("@/lib/theme").CustomThemeColors | null} />
      <AppNavbar
        firstName={firstName}
        avatarUrl={avatarUrl}
        hiddenModules={hiddenModules}
        isTrial={isTrial}
        trialEndsAt={isTrial ? dbUser!.trialEndsAt!.toISOString() : null}
        notificationUserId={dbUser?.ownerId ?? session.user.id!}
        sidebarCollapsed={sidebarCollapsed}
        extraRight={isTrial ? <OnboardingTrigger /> : undefined}
      />
      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} sidebarOrder={sidebarOrder} userId={session.user.id!} isTrial={isTrial} initialCollapsed={sidebarCollapsed} />
        <main className="flex-1 flex flex-col min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
      <TrialCheck />
      <OnboardingModal show={showOnboarding} />
    </div>
  );
}
