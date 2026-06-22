import type { Session } from "next-auth";
import { prisma } from "./prisma";

export function isTeamMember(session: Session): boolean {
  return !!((session.user as any).ownerId);
}

/** Fetches TeamMemberPermission for the current session user.
 *  Returns null if the user is the workspace owner (not a team member). */
export async function getTeamPermissions(session: Session) {
  if (!isTeamMember(session)) return null;
  return prisma.teamMemberPermission.findUnique({
    where: { memberId: session.user!.id! },
  });
}

/** Checks a single boolean permission field for the current user.
 *  Owners always pass. Team members without a permission record also pass (defaults are permissive).
 *  Returns false only when the record exists and the field is explicitly false. */
export async function checkTeamPermission(
  session: Session,
  field: string
): Promise<boolean> {
  if (!isTeamMember(session)) return true;
  const perms = await getTeamPermissions(session);
  if (!perms) return true; // no record yet → all defaults = allowed
  return (perms as Record<string, unknown>)[field] !== false;
}

/** Checks whether a team member has access to a specific client.
 *  Returns true for owners and members with allowAllClients = true. */
export async function checkClientAccess(
  session: Session,
  clientId: string
): Promise<boolean> {
  if (!isTeamMember(session)) return true;
  const perms = await getTeamPermissions(session);
  if (!perms) return true;
  if (perms.allowAllClients) return true;
  return perms.allowedClientIds.includes(clientId);
}

/** Returns the list of allowed client IDs for a team member,
 *  or null if the member has access to all clients (or is the owner). */
export async function getAllowedClientIds(session: Session): Promise<string[] | null> {
  if (!isTeamMember(session)) return null;
  const perms = await getTeamPermissions(session);
  if (!perms || perms.allowAllClients) return null;
  return perms.allowedClientIds;
}
