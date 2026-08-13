import { prisma } from "@/lib/prisma";

/**
 * Returns userIds of all logged-in clients for a project.
 * Checks both paths:
 * - ProjectClient.projectId = projectId (direct)
 * - ProjectClient.clientId = project.clientId (via Client entity)
 */
export async function getClientUserIds(projectId: string): Promise<string[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true },
  });

  const records = await prisma.projectClient.findMany({
    where: {
      userId: { not: null },
      OR: [
        { projectId },
        ...(project?.clientId ? [{ clientId: project.clientId }] : []),
      ],
    },
    select: { userId: true },
  });

  return [...new Set(records.map((r) => r.userId!))];
}
