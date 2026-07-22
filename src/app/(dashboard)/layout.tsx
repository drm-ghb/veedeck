import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavSidebar from "@/components/dashboard/NavSidebar";
import { prisma } from "@/lib/prisma";
import TrialCheck from "@/components/dashboard/TrialCheck";
import AppNavbar from "@/components/dashboard/AppNavbar";
import { TrialContextProvider } from "@/lib/trial-context";

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
    select: { name: true, fullName: true, email: true, isAdmin: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, trialEndsAt: true, isFree: true, viewPreferences: true, subscription: { select: { status: true, cancelAt: true } } },
  });

  const ownerId = dbUser?.ownerId;
  const [ownerSettings, memberPerms] = await Promise.all([
    ownerId
      ? prisma.user.findUnique({
          where: { id: ownerId },
          select: { globalHiddenModules: true, clientLogoUrl: true },
        })
      : null,
    ownerId
      ? prisma.teamMemberPermission.findUnique({
          where: { memberId: session.user.id! },
          select: { hiddenModules: true },
        })
      : null,
  ]);

  const fullName = dbUser?.fullName ?? null;
  const firstName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const baseHidden = (ownerSettings ?? dbUser)?.globalHiddenModules ?? [];
  const memberHidden = memberPerms?.hiddenModules ?? [];
  const hiddenModules = [...new Set([...baseHidden, ...memberHidden])];
  const sidebarOrder = ((dbUser?.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? [];
  const isTrial = !!(dbUser?.trialEndsAt && !dbUser.isFree);
  const subStatus = dbUser?.subscription?.status ?? null;
  const cancelAt = dbUser?.subscription?.cancelAt ?? null;
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
        notificationUserId={dbUser?.ownerId ?? session.user.id!}
        sidebarCollapsed={sidebarCollapsed}
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
    </div>
  );
}
