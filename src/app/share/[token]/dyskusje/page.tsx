import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
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

  const session = await auth();
  if (!session?.user) {
    const hasClientAccounts = await prisma.projectClient.findFirst({
      where: { projectId: project.id, userId: { not: null } },
      select: { id: true },
    });
    if (hasClientAccounts) redirect("/login");
  }

  const hasRenders = project.renders.length > 0;

  const clientAvatarUrl = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } }))?.avatarUrl ?? null
    : null;

  return (
    <ClientNameGate
      token={token}
      requireClientEmail={project.user.requireClientEmail}
      clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
      designerName={project.user.showProfileName ? project.user.name : null}
    >
    <ClientThemeApplier colorTheme={project.user.colorTheme} />
    <div className="h-screen flex flex-col bg-muted/60">
      <ShareNavbar
        clientLogoUrl={project.user.showClientLogo ? project.user.clientLogoUrl : null}
        designerName={project.user.showProfileName ? project.user.name : null}
        projectShareToken={token}
      />
      <div className="flex flex-1 min-h-0">
        <ShareSidebar
          token={token}
          discussionId={project.discussion.id}
          showProjectFlow={!project.hiddenModules.includes("renderflow") && hasRenders}
          showListy={!project.hiddenModules.includes("listy")}
          showDyskusje={true}
          shoppingLists={project.shoppingLists}
        />
        <main className="flex-1 overflow-hidden bg-background rounded-tl-2xl flex flex-col">
          <ClientDiscussionView
            token={token}
            discussionId={project.discussion.id}
            discussionTitle={project.discussion.title}
            initialAuthorName={session?.user ? (session.user.name || session.user.email?.split('@')[0] || "Klient") : undefined}
            currentUserAvatarUrl={clientAvatarUrl}
          />
        </main>
      </div>
    </div>
    </ClientNameGate>
  );
}
