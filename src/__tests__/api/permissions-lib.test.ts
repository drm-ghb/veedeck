/**
 * Unit tests for src/lib/permissions.ts — compat shim behavior + isTeamMember.
 *
 * Detailed tests for getEffectivePermissions, hasPermission, getMemberHiddenModules,
 * getAllowedProjectIds are in src/__tests__/lib/permissions.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findMany: vi.fn(),
    },
    projectAssignment: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    permissionGroup: {
      count: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  isTeamMember,
  getAllowedClientIds,
  checkTeamPermission,
  checkClientAccess,
} from "@/lib/permissions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_SESSION = { user: { id: "owner-1", email: "designer@test.com" } };
const MEMBER_SESSION = { user: { id: "member-1", email: "member@test.com", ownerId: "owner-1" } };

// Helper: mock groupMember.findMany with groups that have given permissions
function mockGroupMember(permissions: Record<string, number>, projectScope = "assigned") {
  vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
    { group: { projectScope, permissions } },
  ] as any);
}

beforeEach(() => vi.clearAllMocks());

// ─── isTeamMember ─────────────────────────────────────────────────────────────

describe("isTeamMember", () => {
  it("zwraca false dla właściciela workspace (brak ownerId)", () => {
    expect(isTeamMember(OWNER_SESSION as any)).toBe(false);
  });

  it("zwraca true dla członka zespołu (ma ownerId)", () => {
    expect(isTeamMember(MEMBER_SESSION as any)).toBe(true);
  });

  it("zwraca false gdy ownerId jest undefined", () => {
    expect(isTeamMember({ user: { id: "user-1", ownerId: undefined } } as any)).toBe(false);
  });

  it("zwraca false gdy ownerId jest null", () => {
    expect(isTeamMember({ user: { id: "user-1", ownerId: null } } as any)).toBe(false);
  });
});

// ─── getAllowedClientIds ───────────────────────────────────────────────────────

describe("getAllowedClientIds", () => {
  it("zwraca null dla właściciela — brak filtrowania klientów", async () => {
    const result = await getAllowedClientIds(OWNER_SESSION as any);
    expect(result).toBeNull();
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("zwraca null dla członka z grupą scope=all", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "all");
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toBeNull();
  });

  it("zwraca tablicę clientId dla członka z scope=assigned i przypisanymi projektami", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "assigned");
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([
      { projectId: "proj-1" },
    ] as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { clientId: "client-1" },
    ] as any);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toEqual(["client-1"]);
  });

  it("zwraca pustą tablicę dla członka bez przypisanych projektów", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "assigned");
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([]);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toEqual([]);
  });
});

// ─── checkTeamPermission (compat shim) ───────────────────────────────────────

describe("checkTeamPermission", () => {
  it("zawsze zwraca true dla właściciela (bez wywołania bazy)", async () => {
    const result = await checkTeamPermission(OWNER_SESSION as any, "pfCanDelete");
    expect(result).toBe(true);
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("zwraca false dla członka bez grup (brak dostępu domyślnie)", async () => {
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanUpload")).toBe(false);
  });

  it("zwraca true gdy grupa daje wystarczający poziom (pfCanUpload = projectflow >= 2)", async () => {
    mockGroupMember({ klienci: 0, projectflow: 2, listy: 0, moodboardy: 0, zadania: 0,
      ankiety: 0, produkty: 0, wykonawcy: 0, kalendarz: 0, notatnik: 0, dyskusje: 0, ustawienia: 0 });
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanUpload")).toBe(true);
  });

  it("zwraca false gdy poziom grupy niewystarczający (pfCanDelete = projectflow >= 3, ale ma 2)", async () => {
    mockGroupMember({ klienci: 0, projectflow: 2, listy: 0, moodboardy: 0, zadania: 0,
      ankiety: 0, produkty: 0, wykonawcy: 0, kalendarz: 0, notatnik: 0, dyskusje: 0, ustawienia: 0 });
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanDelete")).toBe(false);
  });

  it("zwraca true dla nieznanego pola (permissive fallback)", async () => {
    expect(await checkTeamPermission(MEMBER_SESSION as any, "nieistniejacePole")).toBe(true);
  });

  it("sprawdza różne pola niezależnie", async () => {
    mockGroupMember({ klienci: 0, projectflow: 2, listy: 3, moodboardy: 0, zadania: 0,
      ankiety: 0, produkty: 0, wykonawcy: 0, kalendarz: 0, notatnik: 0, dyskusje: 0, ustawienia: 0 });
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanUpload")).toBe(true);   // projectflow >= 2
    expect(await checkTeamPermission(MEMBER_SESSION as any, "listCanDelete")).toBe(true); // listy >= 3
  });
});

// ─── checkClientAccess (compat shim) ─────────────────────────────────────────

describe("checkClientAccess", () => {
  it("zawsze zwraca true dla właściciela", async () => {
    expect(await checkClientAccess(OWNER_SESSION as any, "dowolny-client-id")).toBe(true);
    expect(vi.mocked(prisma.groupMember.findMany)).not.toHaveBeenCalled();
  });

  it("zwraca true dla członka z scope=all", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "all");
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(true);
  });

  it("zwraca true gdy clientId jest na liście dozwolonych projektów", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "assigned");
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([{ projectId: "proj-1" }] as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ clientId: "client-1" }] as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(true);
  });

  it("zwraca false gdy clientId NIE jest na liście dozwolonych", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "assigned");
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([{ projectId: "proj-1" }] as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ clientId: "client-1" }] as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-99")).toBe(false);
  });

  it("zwraca false dla członka bez przypisanych projektów", async () => {
    mockGroupMember({ klienci: 1, projectflow: 1, listy: 1, moodboardy: 1, zadania: 1,
      ankiety: 1, produkty: 1, wykonawcy: 1, kalendarz: 1, notatnik: 1, dyskusje: 1, ustawienia: 1 }, "assigned");
    vi.mocked(prisma.projectAssignment.findMany).mockResolvedValue([]);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(false);
  });
});
