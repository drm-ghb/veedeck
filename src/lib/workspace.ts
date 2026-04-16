import type { Session } from "next-auth";

/** Zwraca ID właściciela workspace'u.
 *  Dla członka zespołu — ID projektanta (ownerId).
 *  Dla projektanta — jego własne ID. */
export function getWorkspaceUserId(session: Session): string {
  return (session.user as any).ownerId ?? (session.user as any).id;
}
