import type { Session } from "next-auth";
import { prisma } from "./prisma";

// ─── Module list (order matches spec section 4) ──────────────────────────────

export const MODULE_SLUGS = [
  "klienci",
  "projectflow",
  "listy",
  "moodboardy",
  "zadania",
  "ankiety",
  "produkty",
  "wykonawcy",
  "kalendarz",
  "notatnik",
  "dyskusje",
  "ustawienia",
] as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[number];
export type PermissionLevel = 0 | 1 | 2 | 3;
export type ModulePermissions = Record<ModuleSlug, PermissionLevel>;

export interface EffectivePermissions extends ModulePermissions {
  projectScope: "assigned" | "all";
}

// ─── Template groups seed (spec section 5) ───────────────────────────────────

export const TEMPLATE_GROUPS: Array<{
  templateKey: string;
  name: string;
  projectScope: "assigned" | "all";
  permissions: ModulePermissions;
}> = [
  {
    templateKey: "wizualizatorzy",
    name: "Wizualizatorzy",
    // assigned — model agencyjny + ochrona danych klientów
    projectScope: "assigned",
    permissions: {
      klienci: 0, projectflow: 2,
      // Listy = ceny i marże → twórcy tylko Podgląd
      listy: 1,
      moodboardy: 2, zadania: 2, ankiety: 0, produkty: 1, wykonawcy: 0,
      kalendarz: 1, notatnik: 2, dyskusje: 2, ustawienia: 0,
    },
  },
  {
    templateKey: "graficy",
    name: "Graficy",
    projectScope: "assigned",
    permissions: {
      klienci: 0, projectflow: 2, listy: 1, moodboardy: 2, zadania: 2,
      ankiety: 1, produkty: 1, wykonawcy: 0, kalendarz: 1, notatnik: 2,
      dyskusje: 2, ustawienia: 0,
    },
  },
  {
    templateKey: "kreślarze",
    name: "Kreślarze",
    projectScope: "assigned",
    permissions: {
      klienci: 0, projectflow: 2, listy: 1, moodboardy: 1, zadania: 2,
      ankiety: 0, produkty: 1,
      // Kreślarze = jedyni twórcy z Edycją w Wykonawcach (ustalenia na budowę)
      wykonawcy: 2,
      kalendarz: 1, notatnik: 2, dyskusje: 2, ustawienia: 0,
    },
  },
  {
    templateKey: "marketing",
    name: "Marketing",
    // all — marketing widzi wszystkie projekty
    projectScope: "all",
    permissions: {
      klienci: 0, projectflow: 1,
      // Marketing Brak w Listach (ceny i marże)
      listy: 0,
      moodboardy: 1, zadania: 1, ankiety: 1, produkty: 1, wykonawcy: 0,
      kalendarz: 1, notatnik: 1,
      // Marketing Brak w Dyskusjach
      dyskusje: 0,
      ustawienia: 1,
    },
  },
  {
    templateKey: "sprzedaż",
    name: "Sprzedaż",
    // all — Sprzedaż widzi wszystkich klientów (onboarding)
    projectScope: "all",
    permissions: {
      // Sprzedaż = Zarządzanie w Klientach (onboarding klienta) i Ankietach (briefy)
      klienci: 3,
      projectflow: 1, listy: 1, moodboardy: 1, zadania: 2, ankiety: 3,
      produkty: 1, wykonawcy: 0, kalendarz: 2, notatnik: 2, dyskusje: 2,
      ustawienia: 0,
    },
  },
  {
    templateKey: "managerowie",
    name: "Managerowie",
    projectScope: "all",
    permissions: {
      klienci: 3, projectflow: 3, listy: 3, moodboardy: 3, zadania: 3,
      ankiety: 3, produkty: 3, wykonawcy: 3, kalendarz: 3, notatnik: 3,
      dyskusje: 3,
      // Managerowie ≠ Admin: ustawienia tylko 2 (integracje/eksport przy Adminie)
      ustawienia: 2,
    },
  },
];

// ─── Session helpers ──────────────────────────────────────────────────────────

export function isTeamMember(session: Session): boolean {
  return !!((session.user as any).ownerId);
}

function getOwnerId(session: Session): string {
  return (session.user as any).ownerId ?? session.user!.id!;
}

function getSystemRole(session: Session): "owner" | "admin" | "member" {
  if (!(session.user as any).ownerId) return "owner";
  return ((session.user as any).systemRole as string) === "admin" ? "admin" : "member";
}

// ─── Core: effective permissions ─────────────────────────────────────────────

/**
 * Computes effective permissions for a user by taking the max level per module
 * across all their groups. Owners/admins always get level 3 everywhere.
 */
export async function getEffectivePermissions(
  userId: string,
  ownerId: string,
  systemRole: "owner" | "admin" | "member" = "member"
): Promise<EffectivePermissions> {
  if (systemRole === "owner" || systemRole === "admin") {
    const full = Object.fromEntries(MODULE_SLUGS.map((m) => [m, 3])) as ModulePermissions;
    return { ...full, projectScope: "all" };
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { workspaceId: ownerId } },
    include: { group: true },
  });

  if (memberships.length === 0) {
    const zero = Object.fromEntries(MODULE_SLUGS.map((m) => [m, 0])) as ModulePermissions;
    return { ...zero, projectScope: "assigned" };
  }

  const levels = Object.fromEntries(MODULE_SLUGS.map((m) => [m, 0])) as Record<string, number>;
  let scopeAll = false;

  for (const { group } of memberships) {
    const perms = group.permissions as Record<string, number>;
    for (const slug of MODULE_SLUGS) {
      const v = perms[slug] ?? 0;
      if (v > levels[slug]) levels[slug] = v;
    }
    if (group.projectScope === "all") scopeAll = true;
  }

  return {
    ...(levels as ModulePermissions),
    projectScope: scopeAll ? "all" : "assigned",
  };
}

/**
 * Checks if the session user has at least `minLevel` for `module`.
 * Owners/admins always pass. Members without groups always fail (level 0).
 *
 * Queries DB directly to avoid stale-JWT bypasses (sessions created before
 * ownerId/systemRole were added would have ownerId=null and be treated as owner).
 */
export async function hasPermission(
  session: Session,
  module: ModuleSlug,
  minLevel: PermissionLevel
): Promise<boolean> {
  const userId = session.user!.id!;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { ownerId: true, systemRole: true },
  });

  // Workspace owner (no ownerId) or user not found → full access
  if (!dbUser?.ownerId) return true;

  // System admin → full access
  if (dbUser.systemRole === "admin") return true;

  const effective = await getEffectivePermissions(userId, dbUser.ownerId, "member");
  return (effective[module] as number) >= minLevel;
}

/**
 * Returns 'assigned' or 'all' project scope for the session user.
 */
export async function getProjectScope(session: Session): Promise<"assigned" | "all"> {
  const userId = session.user!.id!;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { ownerId: true, systemRole: true },
  });

  if (!dbUser?.ownerId) return "all";
  if (dbUser.systemRole === "admin") return "all";

  const effective = await getEffectivePermissions(userId, dbUser.ownerId, "member");
  return effective.projectScope;
}

/**
 * Returns the list of client IDs accessible to the session user (via ClientAssignment),
 * or null for unrestricted access.
 */
export async function getAllowedClientIds(session: Session): Promise<string[] | null> {
  const scope = await getProjectScope(session);
  if (scope === "all") return null;

  const assignments = await prisma.clientAssignment.findMany({
    where: { userId: session.user!.id! },
    select: { clientId: true },
  });
  return assignments.map((a) => a.clientId);
}

/**
 * Returns the list of project IDs the user may access (via assigned clients),
 * or null for unrestricted access.
 */
export async function getAllowedProjectIds(session: Session): Promise<string[] | null> {
  const scope = await getProjectScope(session);
  if (scope === "all") return null;

  const clientIds = await getAllowedClientIds(session);
  if (clientIds === null) return null;
  if (clientIds.length === 0) return [];

  const projects = await prisma.project.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true },
  });
  return projects.map((p) => p.id);
}

/**
 * Returns module slugs that should be hidden in NavSidebar (level 0 modules).
 */
export async function getMemberHiddenModules(
  userId: string,
  ownerId: string,
  systemRole: "owner" | "admin" | "member"
): Promise<string[]> {
  if (systemRole === "owner" || systemRole === "admin") return [];
  const effective = await getEffectivePermissions(userId, ownerId, systemRole);
  return MODULE_SLUGS.filter((m) => (effective[m] as number) === 0);
}

// ─── Seed ────────────────────────────────────────────────────────────────────

/**
 * Creates the 6 template groups for a workspace if none exist yet.
 * Safe to call multiple times (idempotent).
 */
export async function ensureWorkspaceSeed(ownerId: string): Promise<void> {
  const existing = await prisma.permissionGroup.count({ where: { workspaceId: ownerId } });
  if (existing > 0) return;

  await prisma.permissionGroup.createMany({
    data: TEMPLATE_GROUPS.map((g) => ({
      workspaceId: ownerId,
      name: g.name,
      isTemplate: true,
      templateKey: g.templateKey,
      projectScope: g.projectScope,
      permissions: g.permissions,
    })),
  });
}

// ─── Compat shims ────────────────────────────────────────────────────────────

const FIELD_MAP: Record<string, [ModuleSlug, PermissionLevel]> = {
  pfCanUpload:        ["projectflow", 2],
  pfCanDelete:        ["projectflow", 3],
  pfCanManageFolders: ["projectflow", 2],
  listCanCreate:      ["listy",       2],
  listCanDelete:      ["listy",       3],
  contrCanCreate:     ["wykonawcy",   2],
  contrCanEdit:       ["wykonawcy",   2],
  contrCanDelete:     ["wykonawcy",   3],
  projCanCreate:      ["klienci",     2],
  projCanDelete:      ["klienci",     3],
  taskCanCreate:      ["zadania",     2],
  taskCanDelete:      ["zadania",     3],
  surveyCanCreate:    ["ankiety",     2],
  surveyCanDelete:    ["ankiety",     3],
};

/** @deprecated Use hasPermission(session, module, level) directly. */
export async function checkTeamPermission(session: Session, field: string): Promise<boolean> {
  if (!isTeamMember(session)) return true;
  const mapping = FIELD_MAP[field];
  if (!mapping) return true;
  return hasPermission(session, mapping[0], mapping[1]);
}

/** @deprecated Use getMemberHiddenModules or getEffectivePermissions. */
export async function getTeamPermissions(session: Session) {
  if (!isTeamMember(session)) return null;
  const ownerId = getOwnerId(session);
  const role = getSystemRole(session);
  const effective = await getEffectivePermissions(session.user!.id!, ownerId, role);
  return {
    hiddenModules: MODULE_SLUGS.filter((m) => (effective[m] as number) === 0),
    allowAllClients: effective.projectScope === "all",
    allowedClientIds: [] as string[],
  };
}

/** @deprecated Use hasPermission or getAllowedProjectIds. */
export async function checkClientAccess(session: Session, clientId: string): Promise<boolean> {
  if (!isTeamMember(session)) return true;
  const ids = await getAllowedClientIds(session);
  if (ids === null) return true;
  return ids.includes(clientId);
}
