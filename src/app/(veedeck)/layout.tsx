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
import CancelledBadge from "@/components/dashboard/CancelledBadge";
import AppNavbar from "@/components/dashboard/AppNavbar";
import { TrialContextProvider } from "@/lib/trial-context";
import FloatingChatPanel from "@/components/dyskusje/FloatingChatPanel";
import { getMemberHiddenModules } from "@/lib/permissions";

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
    select: { name: true, fullName: true, email: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, primaryAccountId: true, colorTheme: true, customTheme: true, trialEndsAt: true, isFree: true, viewPreferences: true, subscription: { select: { status: true, cancelAt: true } } },
  });

  const ownerId = dbUser?.ownerId;
  const primaryAccountId = dbUser?.primaryAccountId ?? null;
  const systemRole = (dbUser as any)?.systemRole ?? "member";
  const [ownerSettings, memberGroupHidden, workspaceAccountCount] = await Promise.all([
    ownerId ? prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, fullName: true, globalHiddenModules: true, clientLogoUrl: true, colorTheme: true, customTheme: true } }) : null,
    ownerId ? getMemberHiddenModules(session.user.id!, ownerId, systemRole) : Promise.resolve([] as string[]),
    // Workspace switcher: primary account → count linked workspace accounts; workspace member → always 1 (can switch to primary)
    primaryAccountId !== null
      ? Promise.resolve(1)
      : prisma.user.count({ where: { primaryAccountId: session.user.id! } }),
  ]);

  const fullName = dbUser?.fullName ?? null;
  const firstName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const hiddenModules = [...new Set([...((ownerSettings ?? dbUser)?.globalHiddenModules ?? []), ...memberGroupHidden])];
  const colorTheme = ((ownerSettings?.colorTheme ?? dbUser?.colorTheme) ?? "champagne") as ColorTheme;

  const viewPrefs = (dbUser?.viewPreferences ?? {}) as Record<string, unknown>;
  const sidebarOrder = (viewPrefs.sidebarOrder as string[]) ?? [];
  const subStatus = dbUser?.subscription?.status ?? null;
  const cancelAt = dbUser?.subscription?.cancelAt ?? null;
  const isTrial = !!(dbUser?.trialEndsAt && dbUser.trialEndsAt > new Date() && !dbUser.isFree && !subStatus);
  const hasAccess = !!(dbUser?.isFree || subStatus === "active" || (subStatus === "cancelled" && !!cancelAt && new Date(cancelAt) > new Date()));
  const isTrialExpired = !!(dbUser?.trialEndsAt && new Date(dbUser.trialEndsAt) < new Date() && !hasAccess && !dbUser?.ownerId);
  const isCancelled = subStatus === "cancelled" || subStatus === "canceled";
  const isScheduledCancel = subStatus === "active" && !!cancelAt && new Date(cancelAt) > new Date();
  const showOnboarding = isTrial && !viewPrefs.onboardingSeen;

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <ColorThemeSync dbTheme={colorTheme} dbCustomTheme={(ownerSettings?.customTheme ?? dbUser?.customTheme) as import("@/lib/theme").CustomThemeColors | null} forceApply={!!ownerId} />
      <AppNavbar
        firstName={firstName}
        avatarUrl={avatarUrl}
        hiddenModules={hiddenModules}
        isTrial={isTrial}
        trialEndsAt={isTrial ? dbUser!.trialEndsAt!.toISOString() : null}
        isTrialExpired={isTrialExpired}
        notificationUserId={dbUser?.ownerId ?? session.user.id!}
        sidebarCollapsed={sidebarCollapsed}
        extraRight={isCancelled ? <CancelledBadge /> : isScheduledCancel ? <CancelledBadge cancelAt={cancelAt!.toISOString()} /> : isTrial ? <OnboardingTrigger /> : undefined}
        hasWorkspaces={workspaceAccountCount > 0}
        workspaceName={ownerId ? (ownerSettings?.name || ownerSettings?.fullName || null) : null}
      />
      <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
        <NavSidebar hiddenModules={hiddenModules} sidebarOrder={sidebarOrder} userId={session.user.id!} isTrial={isTrial} initialCollapsed={sidebarCollapsed} />
        <main className="flex-1 flex flex-col min-h-0 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          <TrialContextProvider value={isTrialExpired}>
            {children}
          </TrialContextProvider>
        </main>
      </div>
      <TrialCheck />
      <OnboardingModal show={showOnboarding} userId={session.user.id!} />
      <FloatingChatPanel userId={session.user.id!} currentUserAvatarUrl={avatarUrl} />
    </div>
  );
}
