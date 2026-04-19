import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientDiscussionView from "@/components/dyskusje/ClientDiscussionView";
import ClientNameGate from "@/components/share/ClientNameGate";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";

export default async function ShareDyskusjePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      shoppingLists: { select: { id: true, name: true, shareToken: true } },
      user: { select: { clientLogoUrl: true, name: true, navMode: true, showProfileName: true, showClientLogo: true, requireClientEmail: true, colorTheme: true } },
      discussion: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!project || project.archived) notFound();
  if (!project.discussion) notFound();

  const isSidebar = project.user.navMode === "sidebar";

  const content = (
    <ClientDiscussionView
      token={token}
      discussionId={project.discussion.id}
      discussionTitle={project.discussion.title}
    />
  );

  return (
    <ClientNameGate
      token={token}
      requireClientEmail={project.user.requireClientEmail}
      clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
      designerName={project.user.showProfileName ? project.user.name : null}
    >
    <ClientThemeApplier colorTheme={project.user.colorTheme} />
    <div className={`${isSidebar ? "h-screen" : "min-h-screen"} flex flex-col bg-muted/60`}>
      <ShareNavbar
        clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
        designerName={project.user.showProfileName ? project.user.name : null}
        projectShareToken={token}
      />

      {isSidebar ? (
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token={token}
            discussionId={project.discussion.id}
            showRenderFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={true}
            shoppingLists={project.shoppingLists}
          />
          <main className="flex-1 overflow-hidden bg-background rounded-tl-2xl flex flex-col">
            {content}
          </main>
        </div>
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col px-3 sm:px-6 py-4 sm:py-6">
          {content}
        </main>
      )}
    </div>
    </ClientNameGate>
  );
}
