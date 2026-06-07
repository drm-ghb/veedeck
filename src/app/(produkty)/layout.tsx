import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NavSidebar from "@/components/dashboard/NavSidebar";
import { prisma } from "@/lib/prisma";
import TrialCheck from "@/components/dashboard/TrialCheck";
import AppNavbar from "@/components/dashboard/AppNavbar";

export default async function ProduktyLayout({
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
    select: { name: true, fullName: true, email: true, globalHiddenModules: true, clientLogoUrl: true, avatarUrl: true, ownerId: true, viewPreferences: true },
  });

  const ownerId = dbUser?.ownerId;
  const ownerSettings = ownerId
    ? await prisma.user.findUnique({
        where: { id: ownerId },
        select: { globalHiddenModules: true, clientLogoUrl: true },
      })
    : null;

  const fullName = dbUser?.fullName ?? null;
  const displayName = (fullName || dbUser?.name)?.split(" ")[0] ?? dbUser?.email ?? null;
  const avatarUrl = dbUser?.avatarUrl ?? null;
  const hiddenModules = (ownerSettings ?? dbUser)?.globalHiddenModules ?? [];
  const sidebarOrder = ((dbUser?.viewPreferences as Record<string, unknown>)?.sidebarOrder as string[]) ?? [];

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      <AppNavbar
        firstName={displayName}
        avatarUrl={avatarUrl}
        hiddenModules={hiddenModules}
        notificationUserId={dbUser?.ownerId ?? session.user.id!}
        sidebarCollapsed={sidebarCollapsed}
      />
      <div className="flex flex-1 min-h-0">
        <NavSidebar hiddenModules={hiddenModules} sidebarOrder={sidebarOrder} userId={session.user.id!} initialCollapsed={sidebarCollapsed} />
        <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
          {children}
        </main>
      </div>
      <TrialCheck />
    </div>
  );
}
