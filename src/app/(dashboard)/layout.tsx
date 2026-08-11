import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavSidebar from "@/components/dashboard/NavSidebar";
import { prisma } from "@/lib/prisma";
import TrialCheck from "@/components/dashboard/TrialCheck";
import AppNavbar from "@/components/dashboard/AppNavbar";
import { TrialContextProvider } from "@/lib/trial-context";
import { getMemberHiddenModules } from "@/lib/permissions";
import FloatingChatPanel from "@/components/dyskusje/FloatingChatPanel";

export default async function DashboardLayout({
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
    select: { name: true, fullName: true, email: true, isAdmin: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, primaryAccountId: true, trialEndsAt: true, isFree: true, viewPreferences: true, subscription: { select: { status: true, cancelAt: true } } },
  });

  const ownerId = dbUser?.ownerId;
  const primaryAccountId = dbUser?.primaryAccountId ?? null;
  const systemRole = (dbUser as any)?.systemRole ?? "member";
  const [ownerSettings, memberGroupHidden, workspaceAccountCount] = await Promise.all([
    ownerId ? prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, fullName: true, globalHiddenModules: true, clientLogoUrl: true } }) : null,
    ownerId ? getMemberHiddenModules(session.user.id!, ownerId, systemRole) : Promise.resolve([] as string[]),
    primaryAccountId !== null ? Promise.resolve(1) : prisma.user.count({ where: { primaryAccountId: session.user.id! } }),
  ]);

  const fullName = dbUser?.fullName ?? null;
  const firstName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const hiddenModules = [...new Set([...((ownerSettings ?? dbUser)?.globalHiddenModules ?? []), ...memberGroupHidden])];
  const sidebarOrder = ((dbUser?.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? [];
  const subStatus = dbUser?.subscription?.status ?? null;
  const cancelAt = dbUser?.subscription?.cancelAt ?? null;
  const isTrial = !!(dbUser?.trialEndsAt && dbUser.trialEndsAt > new Date() && !dbUser.isFree && !subStatus);
  const hasAccess = !!(dbUser?.isFree || subStatus === "active" || (subStatus === "cancelled" && !!cancelAt && new Date(cancelAt) > new Date()));
  const isTrialExpired = !!(dbUser?.trialEndsAt && new Date(dbUser.trialEndsAt) < new Date() && !hasAccess && !dbUser?.ownerId);

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <AppNavbar
        firstName={firstName}
        avatarUrl={avatarUrl}
        hiddenModules={hiddenModules}
        isAdmin={dbUser?.isAdmin ?? false}
        isTrial={isTrial}
        trialEndsAt={isTrial ? dbUser!.trialEndsAt!.toISOString() : null}
        isTrialExpired={isTrialExpired}
        notificationUserId={dbUser?.ownerId ?? session.user.id!}
        sidebarCollapsed={sidebarCollapsed}
        hasWorkspaces={workspaceAccountCount > 0}
        workspaceName={ownerId ? (ownerSettings?.name || ownerSettings?.fullName || null) : null}
      />
      <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
        <NavSidebar hiddenModules={hiddenModules} isAdmin={dbUser?.isAdmin ?? false} sidebarOrder={sidebarOrder} userId={session.user.id!} initialCollapsed={sidebarCollapsed} />
        <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          <TrialContextProvider value={isTrialExpired}>
            {children}
          </TrialContextProvider>
        </main>
      </div>
      <TrialCheck />
      <FloatingChatPanel userId={session.user.id!} currentUserAvatarUrl={avatarUrl} />
    </div>
  );
}
