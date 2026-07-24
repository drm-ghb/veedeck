import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClientProject } from "@/lib/client-access";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import MoodboardCanvas from "@/components/moodboard/MoodboardCanvas";

export default async function ClientMoodboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "client") redirect("/login");

  const project = await getClientProject(session, projectId);
  if (!project) notFound();

  const moodboard = await prisma.moodboard.findFirst({
    where: { projectId, isSharedWithClient: true, archived: false },
    select: { id: true, title: true, canvasData: true },
  });

  if (!moodboard) notFound();

  const shoppingLists = await prisma.shoppingList.findMany({
    where: { projectId, archived: false },
    select: { id: true, name: true, shareToken: true },
  });

  const discussion = await prisma.discussion.findUnique({
    where: { projectId },
    select: { id: true },
  });

  const hasRenders = await prisma.render.count({
    where: { room: { projectId }, archived: false },
  }).then((n) => n > 0);

  const { user } = project;

  return (
    <>
      <ClientThemeApplier colorTheme={user.colorTheme} customTheme={user.customTheme as any} />
      <div className="h-dvh flex flex-col bg-muted/60">
        <ShareNavbar
          clientLogoUrl={user.showClientLogo ? user.clientLogoUrl : null}
          designerName={user.showProfileName ? user.name : null}
        />
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token=""
            discussionId={discussion?.id}
            showProjectFlow={!project.hiddenModules.includes("renderflow") && hasRenders}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            showMoodboard={true}
            shoppingLists={shoppingLists}
            clientProjectId={projectId}
            activeView="moodboard"
          />
          <main className="flex-1 min-h-0 overflow-hidden bg-background rounded-tl-2xl">
            <MoodboardCanvas
              id={moodboard.id}
              title={moodboard.title}
              canvasData={moodboard.canvasData as object}
              isSharedWithClient={true}
              client={null}
              project={null}
              readOnly={true}
            />
          </main>
        </div>
      </div>
    </>
  );
}
