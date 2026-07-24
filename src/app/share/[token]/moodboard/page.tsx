import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientNameGate from "@/components/share/ClientNameGate";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import MoodboardCanvas from "@/components/moodboard/MoodboardCanvas";

export default async function ShareMoodboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: { select: { id: true, name: true, shareToken: true } },
      user: { select: { clientLogoUrl: true, name: true, navMode: true, showProfileName: true, showClientLogo: true, requireClientEmail: true, colorTheme: true } },
      discussion: { select: { id: true } },
      moodboards: {
        where: { isSharedWithClient: true, archived: false },
        select: { id: true, title: true, canvasData: true, clientId: true, projectId: true },
        take: 1,
      },
    },
  });

  if (!project || project.archived) notFound();

  const moodboard = project.moodboards[0];
  if (!moodboard) notFound();

  const session = await auth();
  if (!session?.user) {
    const hasClientAccounts = await prisma.projectClient.findFirst({
      where: { projectId: project.id, userId: { not: null } },
    });
    if (hasClientAccounts) redirect("/login");
  }

  const hasRenders = project.renders.length > 0;

  return (
    <ClientNameGate
      token={token}
      requireClientEmail={project.user.requireClientEmail}
      clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
      designerName={project.user.showProfileName ? project.user.name : null}
    >
    <ClientThemeApplier colorTheme={project.user.colorTheme} />
    <div className="h-dvh flex flex-col bg-muted/60">
      <ShareNavbar
        clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
        designerName={project.user.showProfileName ? project.user.name : null}
        projectShareToken={token}
      />
      <div className="flex flex-1 min-h-0">
        <ShareSidebar
          token={token}
          discussionId={project.discussion?.id}
          showProjectFlow={!project.hiddenModules.includes("renderflow") && hasRenders}
          showListy={!project.hiddenModules.includes("listy")}
          showDyskusje={!project.hiddenModules.includes("dyskusje")}
          showMoodboard={true}
          shoppingLists={project.shoppingLists}
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
    </ClientNameGate>
  );
}
