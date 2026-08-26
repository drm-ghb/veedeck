import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/** Zwraca ID właściciela workspace'u.
 *  Dla członka zespołu — ID projektanta (ownerId).
 *  Dla projektanta — jego własne ID. */
export function getWorkspaceUserId(session: Session): string {
  return (session.user as any).ownerId ?? (session.user as any).id;
}

/** Checks if user has access to a discussion (owner, team member participant, or client participant). */
export async function hasDiscussionAccess(
  discussionId: string,
  ownerId: string,
  sessionUserId: string,
  workspaceUserId: string
): Promise<boolean> {
  if (ownerId === workspaceUserId) return true;
  const participant = await prisma.discussionParticipant.findFirst({
    where: { discussionId, userId: sessionUserId },
  });
  return !!participant;
}
