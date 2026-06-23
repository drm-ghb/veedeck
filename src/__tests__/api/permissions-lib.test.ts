/**
 * Unit tests for src/lib/permissions.ts
 *
 * Testuje logikę funkcji uprawnień bez żadnych zewnętrznych zależności:
 *  - isTeamMember     — czy użytkownik jest członkiem zespołu
 *  - getAllowedClientIds — lista dozwolonych klientów (null = brak filtra)
 *  - checkTeamPermission — sprawdzenie boolean-owego uprawnienia
 *  - checkClientAccess   — sprawdzenie dostępu do konkretnego klienta
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    teamMemberPermission: {
      findUnique: vi.fn(),
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

const BASE_PERMS = {
  memberId: "member-1",
  ownerId: "owner-1",
  hiddenModules: [],
  pfCanUpload: true,
  pfCanDelete: false,
  pfCanManageFolders: false,
  listCanCreate: true,
  listCanDelete: false,
  contrCanCreate: false,
  contrCanEdit: false,
  contrCanDelete: false,
  projCanCreate: false,
  projCanDelete: false,
  allowAllClients: true,
  allowedClientIds: [] as string[],
  taskCanCreate: true,
  taskCanDelete: false,
  surveyCanCreate: false,
  surveyCanDelete: false,
};

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
    // właściciel nie pobiera uprawnień z bazy
    expect(vi.mocked(prisma.teamMemberPermission.findUnique)).not.toHaveBeenCalled();
  });

  it("zwraca null dla członka z allowAllClients=true", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: true,
      allowedClientIds: [],
    } as any);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toBeNull();
  });

  it("zwraca tablicę allowedClientIds dla członka z ograniczonym dostępem", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: ["client-1", "client-2"],
    } as any);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toEqual(["client-1", "client-2"]);
  });

  it("zwraca pustą tablicę dla członka z allowAllClients=false i pustą listą klientów", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: [],
    } as any);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toEqual([]);
  });

  it("zwraca null gdy brak rekordu uprawnień (permissive default)", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(null);
    const result = await getAllowedClientIds(MEMBER_SESSION as any);
    expect(result).toBeNull();
  });

  it("pobiera uprawnienia używając memberId z sesji", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(null);
    await getAllowedClientIds(MEMBER_SESSION as any);
    expect(vi.mocked(prisma.teamMemberPermission.findUnique)).toHaveBeenCalledWith({
      where: { memberId: "member-1" },
    });
  });
});

// ─── checkTeamPermission ──────────────────────────────────────────────────────

describe("checkTeamPermission", () => {
  it("zawsze zwraca true dla właściciela (bez wywołania bazy)", async () => {
    const result = await checkTeamPermission(OWNER_SESSION as any, "pfCanDelete");
    expect(result).toBe(true);
    expect(vi.mocked(prisma.teamMemberPermission.findUnique)).not.toHaveBeenCalled();
  });

  it("zwraca true gdy brak rekordu uprawnień (permissive default)", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(null);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanDelete")).toBe(true);
  });

  it("zwraca true gdy pole jest jawnie ustawione na true", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      pfCanUpload: true,
    } as any);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanUpload")).toBe(true);
  });

  it("zwraca false gdy pole jest jawnie ustawione na false", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      pfCanDelete: false,
    } as any);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "pfCanDelete")).toBe(false);
  });

  it("zwraca false dla projCanCreate=false (domyślne w BASE_PERMS)", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
    } as any);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "projCanCreate")).toBe(false);
  });

  it("zwraca true gdy pole nie istnieje w rekordzie", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({} as any);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "nieistniejacePole")).toBe(true);
  });

  it("sprawdza różne pola niezależnie", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      listCanCreate: true,
      listCanDelete: false,
    } as any);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "listCanCreate")).toBe(true);
    expect(await checkTeamPermission(MEMBER_SESSION as any, "listCanDelete")).toBe(false);
  });
});

// ─── checkClientAccess ────────────────────────────────────────────────────────

describe("checkClientAccess", () => {
  it("zawsze zwraca true dla właściciela", async () => {
    expect(await checkClientAccess(OWNER_SESSION as any, "dowolny-client-id")).toBe(true);
    expect(vi.mocked(prisma.teamMemberPermission.findUnique)).not.toHaveBeenCalled();
  });

  it("zwraca true dla członka z allowAllClients=true", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: true,
      allowedClientIds: [],
    } as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(true);
  });

  it("zwraca true gdy clientId jest na liście dozwolonych", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: ["client-1", "client-2"],
    } as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(true);
  });

  it("zwraca false gdy clientId NIE jest na liście dozwolonych", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: ["client-1"],
    } as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-99")).toBe(false);
  });

  it("zwraca false dla członka z pustą listą dozwolonych klientów", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: [],
    } as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-1")).toBe(false);
  });

  it("zwraca true gdy brak rekordu uprawnień (permissive default)", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(null);
    expect(await checkClientAccess(MEMBER_SESSION as any, "jakikolwiek-client")).toBe(true);
  });

  it("dostęp do drugiego klienta z listy działa poprawnie", async () => {
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue({
      ...BASE_PERMS,
      allowAllClients: false,
      allowedClientIds: ["client-A", "client-B"],
    } as any);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-A")).toBe(true);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-B")).toBe(true);
    expect(await checkClientAccess(MEMBER_SESSION as any, "client-C")).toBe(false);
  });
});
