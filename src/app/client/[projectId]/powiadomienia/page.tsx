import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import NotificationsClient from "@/app/(dashboard)/notifications/NotificationsClient";

export default async function ClientNotificationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/login");

  const project = await getClientProject(session, projectId);
  if (!project) notFound();

  const [shoppingLists, discussion, hasRenders] = await Promise.all([
    prisma.shoppingList.findMany({
      where: { projectId, archived: false },
      select: { id: true, name: true, shareToken: true },
    }),
    prisma.discussion.findUnique({ where: { projectId }, select: { id: true } }),
    prisma.render.count({ where: { room: { projectId }, archived: false } }).then((n) => n > 0),
  ]);

  const userLinks = await prisma.projectClient.findMany({
    where: { userId: session.user.id, clientId: { not: null } },
    select: { clientId: true },
  });
  const surveyClientIds = [...new Set([
    ...(project.clientId ? [project.clientId] : []),
    ...userLinks.map((l) => l.clientId as string),
  ])];
  const hasSurveys = surveyClientIds.length > 0
    ? await prisma.survey.count({
        where: { assignedClientId: { in: surveyClientIds }, status: "ACTIVE", archived: false },
      }).then((n) => n > 0)
    : false;

  const { user } = project;

  const clientUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  return (
    <>
      <ClientThemeApplier colorTheme={user.colorTheme} customTheme={user.customTheme as any} />
      <div className="h-dvh flex flex-col bg-muted/60">
        <ShareNavbar
          clientLogoUrl={user.showClientLogo ? user.clientLogoUrl : null}
          designerName={user.showProfileName ? user.name : null}
          currentUserId={session.user.id}
          clientName={clientUser?.name ?? null}
        />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: "var(--sidebar)" }}>
          <ShareSidebar
            token=""
            discussionId={discussion?.id}
            showProjectFlow={!project.hiddenModules.includes("renderflow") && hasRenders}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            showPayments={project.paymentsSharedWithClient}
            showHarmonogram={project.scheduleSharedWithClient}
            showAnkiety={hasSurveys}
            showMoodboard={false}
            shoppingLists={shoppingLists}
            clientProjectId={projectId}
            activeView="powiadomienia"
          />
          <main className="flex-1 px-6 py-6 overflow-y-auto overflow-x-hidden bg-background rounded-tl-2xl">
            <NotificationsClient userId={session.user.id} />
          </main>
        </div>
      </div>
    </>
  );
}
