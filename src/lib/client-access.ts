import { Session } from "next-auth";
import { prisma } from "./prisma";

/**
 * Verifies that the session user (role: "client") has access to the given project.
 * Returns the project with designer settings, or null if no access.
 */
export async function getClientProject(session: Session, projectId: string) {
  if (!session?.user?.id) return null;
  if ((session.user as any).role !== "client") return null;

  // Check direct ProjectClient link to this project
  const directLink = await prisma.projectClient.findFirst({
    where: { projectId, userId: session.user.id },
  });

  if (!directLink) {
    // Also allow access via Client entity: if the project has clientId that matches
    // one of this user's ProjectClient records' clientId
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    });
    if (!proj?.clientId) return null;
    const clientLink = await prisma.projectClient.findFirst({
      where: { userId: session.user.id, clientId: proj.clientId },
    });
    if (!clientLink) return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: {
        select: {
          name: true,
          allowDirectStatusChange: true,
          allowClientComments: true,
          allowClientAcceptance: true,
          requireClientEmail: true,
          hideCommentCount: true,
          clientWelcomeMessage: true,
          clientLogoUrl: true,
          accentColor: true,
          defaultRenderOrder: true,
          notifyClientOnStatusChange: true,
          notifyClientOnReply: true,
          allowClientVersionRestore: true,
          showProfileName: true,
          showClientLogo: true,
          navMode: true,
          colorTheme: true,
        },
      },
    },
  });

  if (!project || project.archived) return null;
  return project;
}
