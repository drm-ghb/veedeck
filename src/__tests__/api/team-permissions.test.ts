/**
 * Testy integracyjne egzekwowania uprawnień członków zespołu
 *
 * Weryfikują, że ustawienia uprawnień projektanta są poprawnie egzekwowane
 * po stronie panelu członka zespołu we wszystkich modułach:
 *
 *  1. Zarządzanie uprawnieniami — GET/PATCH /api/team/members/[id]/permissions
 *  2. Filtrowanie klientów     — GET /api/clients
 *  3. Dostęp do klienta        — GET /api/clients/[id]
 *  4. Filtrowanie projektów    — GET /api/projects, GET /api/projects/[id]
 *  5. Filtrowanie list         — GET /api/lists
 *  6. Filtrowanie ankiet       — GET /api/surveys
 *  7. Boolean permissions      — POST na chronionych endpointach → 403
 *  8. Widoczność modułów       — hiddenModules w rekordzie uprawnień
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn() } }));
vi.mock("@/lib/slug", () => ({ uniqueSlug: vi.fn().mockResolvedValue("test-slug") }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
  hash: vi.fn().mockResolvedValue("hashed"),
}));
vi.mock("@/lib/client-login", () => ({ generateClientLogin: vi.fn().mockReturnValue("login") }));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceUserId: vi.fn().mockReturnValue("owner-1"),
}));

vi.mock("@/lib/permissions", () => ({
  getAllowedClientIds: vi.fn(),
  checkTeamPermission: vi.fn(),
  checkClientAccess: vi.fn(),
  isTeamMember: vi.fn(),
  getTeamPermissions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    teamMemberPermission: { findUnique: vi.fn(), upsert: vi.fn() },
    client: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    shoppingList: { findMany: vi.fn(), findFirst: vi.fn() },
    survey: { findMany: vi.fn(), findFirst: vi.fn() },
    discussion: { create: vi.fn() },
    projectClient: { create: vi.fn() },
  },
}));

// ─── Imports (po mockach) ──────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllowedClientIds, checkTeamPermission } from "@/lib/permissions";

import { GET as permissionsGET, PATCH as permissionsPATCH } from "@/app/api/team/members/[id]/permissions/route";
import { GET as clientsGET } from "@/app/api/clients/route";
import { GET as clientByIdGET } from "@/app/api/clients/[id]/route";
import { GET as projectsGET, POST as projectsPOST } from "@/app/api/projects/route";
import { GET as projectByIdGET } from "@/app/api/projects/[id]/route";
import { GET as listsGET, POST as listsPOST } from "@/app/api/lists/route";
import { GET as surveysGET, POST as surveysPOST } from "@/app/api/surveys/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_SESSION = { user: { id: "owner-1", email: "designer@test.com" } };
const MEMBER_SESSION = { user: { id: "member-1", email: "member@test.com", ownerId: "owner-1" } };

const SAVED_PERMS = {
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
  allowAllClients: false,
  allowedClientIds: ["client-allowed"],
  taskCanCreate: true,
  taskCanDelete: false,
  surveyCanCreate: false,
  surveyCanDelete: false,
};

const MOCK_CLIENT = { id: "client-allowed", name: "Makowska", designerId: "owner-1", archived: false };
const MOCK_PROJECT = {
  id: "proj-1", title: "Projekt A", userId: "owner-1", archived: false,
  clientId: "client-allowed", slug: "projekt-a", clientName: "Makowska",
  renders: [], _count: { renders: 0 },
};

beforeEach(() => vi.clearAllMocks());

// ─── 1. Zarządzanie uprawnieniami — GET/PATCH /api/team/members/[id]/permissions

describe("GET /api/team/members/[id]/permissions — pobieranie uprawnień", () => {
  it("zwraca 401 bez aktywnej sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await permissionsGET(makeRequest("GET"), makeParams({ id: "member-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy member nie należy do workspace projektanta", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    const res = await permissionsGET(makeRequest("GET"), makeParams({ id: "obcy-user" }));
    expect(res.status).toBe(404);
  });

  it("zwraca domyślne uprawnienia gdy brak rekordu w bazie", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(null);

    const res = await permissionsGET(makeRequest("GET"), makeParams({ id: "member-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Domyślne: allowAllClients=true, pfCanUpload=true, pfCanDelete=false itd.
    expect(body.allowAllClients).toBe(true);
    expect(body.pfCanUpload).toBe(true);
    expect(body.pfCanDelete).toBe(false);
    expect(body.projCanCreate).toBe(false);
    expect(body.listCanCreate).toBe(true);
  });

  it("zwraca zapisane uprawnienia z bazy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.findUnique).mockResolvedValue(SAVED_PERMS as any);

    const res = await permissionsGET(makeRequest("GET"), makeParams({ id: "member-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowAllClients).toBe(false);
    expect(body.allowedClientIds).toEqual(["client-allowed"]);
    expect(body.hiddenModules).toEqual([]);
  });

  it("weryfikuje przynależność membera do workspace projektanta (not innego designera)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    // findFirst sprawdza: { id, ownerId: "owner-1" }
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    await permissionsGET(makeRequest("GET"), makeParams({ id: "member-1" }));

    expect(vi.mocked(prisma.user.findFirst)).toHaveBeenCalledWith({
      where: { id: "member-1", ownerId: "owner-1" },
    });
  });
});

describe("PATCH /api/team/members/[id]/permissions — zapisywanie uprawnień", () => {
  it("zwraca 401 bez aktywnej sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await permissionsPATCH(
      makeRequest("PATCH", { allowAllClients: false }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy member nie należy do workspace", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    const res = await permissionsPATCH(
      makeRequest("PATCH", { allowAllClients: false }),
      makeParams({ id: "obcy-user" })
    );
    expect(res.status).toBe(404);
  });

  it("tworzy rekord uprawnień gdy nie istnieje (upsert)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue(SAVED_PERMS as any);

    const res = await permissionsPATCH(
      makeRequest("PATCH", { allowAllClients: false, allowedClientIds: ["client-allowed"] }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.teamMemberPermission.upsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberId: "member-1" },
        update: expect.objectContaining({
          allowAllClients: false,
          allowedClientIds: ["client-allowed"],
        }),
      })
    );
  });

  it("aktualizuje hiddenModules dla członka", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      hiddenModules: ["veezard", "ankiety"],
    } as any);

    const res = await permissionsPATCH(
      makeRequest("PATCH", { hiddenModules: ["veezard", "ankiety"] }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hiddenModules).toEqual(["veezard", "ankiety"]);

    const upsertCall = vi.mocked(prisma.teamMemberPermission.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({ hiddenModules: ["veezard", "ankiety"] });
  });

  it("ignoruje nieznane/niedozwolone pola w body", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue(SAVED_PERMS as any);

    await permissionsPATCH(
      makeRequest("PATCH", { pfCanUpload: true, nieznaneHackerPole: "zło", memberId: "podmieniony" }),
      makeParams({ id: "member-1" })
    );

    const upsertCall = vi.mocked(prisma.teamMemberPermission.upsert).mock.calls[0][0];
    expect(upsertCall.update).not.toHaveProperty("nieznaneHackerPole");
    expect(upsertCall.update).not.toHaveProperty("memberId");
    expect(upsertCall.update).toMatchObject({ pfCanUpload: true });
  });

  it("zapisuje wszystkie boolean permissions naraz", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue(SAVED_PERMS as any);

    const payload = {
      pfCanUpload: true,
      pfCanDelete: true,
      listCanCreate: true,
      listCanDelete: true,
      projCanCreate: true,
      projCanDelete: true,
      surveyCanCreate: true,
      surveyCanDelete: true,
      taskCanCreate: true,
      taskCanDelete: true,
    };

    await permissionsPATCH(makeRequest("PATCH", payload), makeParams({ id: "member-1" }));

    const upsertCall = vi.mocked(prisma.teamMemberPermission.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject(payload);
  });
});

// ─── 2. Filtrowanie klientów — GET /api/clients ───────────────────────────────

describe("GET /api/clients — filtrowanie po uprawnieniach klienta", () => {
  it("właściciel widzi wszystkich klientów (null filter)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.client.findMany).mockResolvedValue([MOCK_CLIENT] as any);

    const res = await clientsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.client.findMany).mock.calls[0][0];
    // Brak filtru id.in — właściciel widzi wszystkich
    expect(findCall?.where).not.toHaveProperty("id");
  });

  it("członek z allowedClientIds widzi tylko dozwolonych klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.client.findMany).mockResolvedValue([MOCK_CLIENT] as any);

    const res = await clientsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.client.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({ id: { in: ["client-allowed"] } });
  });

  it("członek z pustą listą klientów widzi 0 klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);
    vi.mocked(prisma.client.findMany).mockResolvedValue([]);

    const res = await clientsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.client.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({ id: { in: [] } });
    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("członek z allowAllClients (null) widzi wszystkich klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.client.findMany).mockResolvedValue([MOCK_CLIENT] as any);

    const res = await clientsGET();
    const findCall = vi.mocked(prisma.client.findMany).mock.calls[0][0];
    expect(findCall?.where).not.toHaveProperty("id");
  });

  it("zawsze filtruje po designerId właściciela (nie membera)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.client.findMany).mockResolvedValue([]);

    await clientsGET();

    const findCall = vi.mocked(prisma.client.findMany).mock.calls[0][0];
    // getWorkspaceUserId zwraca "owner-1" dla membera
    expect(findCall?.where).toMatchObject({ designerId: "owner-1" });
  });
});

// ─── 3. Dostęp do konkretnego klienta — GET /api/clients/[id] ────────────────

describe("GET /api/clients/[id] — dostęp do konkretnego klienta", () => {
  it("właściciel może pobrać dowolnego klienta (allowedIds = null)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ ...MOCK_CLIENT, projects: [] } as any);

    const res = await clientByIdGET(makeRequest("GET"), makeParams({ id: "client-allowed" }));
    expect(res.status).toBe(200);
  });

  it("członek z uprawnieniem do klienta może go pobrać", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ ...MOCK_CLIENT, projects: [] } as any);

    const res = await clientByIdGET(makeRequest("GET"), makeParams({ id: "client-allowed" }));
    expect(res.status).toBe(200);
  });

  it("członek BEZ uprawnienia do klienta otrzymuje 403", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);

    const res = await clientByIdGET(makeRequest("GET"), makeParams({ id: "client-forbidden" }));
    expect(res.status).toBe(403);
    // Prisma nie powinna być wywołana gdy brak uprawnień
    expect(vi.mocked(prisma.client.findFirst)).not.toHaveBeenCalled();
  });

  it("członek z pustą listą dozwolonych klientów nie może pobrać żadnego klienta", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);

    const res = await clientByIdGET(makeRequest("GET"), makeParams({ id: "client-1" }));
    expect(res.status).toBe(403);
  });
});

// ─── 4. Filtrowanie projektów — GET /api/projects ────────────────────────────

describe("GET /api/projects — filtrowanie projektów po uprawnieniach klienta", () => {
  it("właściciel widzi wszystkie projekty", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECT] as any);

    const res = await projectsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(findCall?.where).not.toHaveProperty("clientId");
  });

  it("członek widzi tylko projekty z dozwolonych klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECT] as any);

    const res = await projectsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({ clientId: { in: ["client-allowed"] } });
  });

  it("członek z pustą listą klientów nie widzi żadnych projektów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const res = await projectsGET();
    const findCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({ clientId: { in: [] } });
  });
});

describe("GET /api/projects/[id] — dostęp do konkretnego projektu", () => {
  it("członek może pobrać projekt z dozwolonego klienta", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(MOCK_PROJECT as any);

    const res = await projectByIdGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(200);
  });

  it("członek otrzymuje 403 dla projektu z niedozwolonego klienta", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    // Projekt należy do innego klienta
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      ...MOCK_PROJECT,
      clientId: "client-forbidden",
    } as any);

    const res = await projectByIdGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(403);
  });

  it("członek z pustą listą klientów nie może pobrać żadnego projektu", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      ...MOCK_PROJECT,
      clientId: "client-1",
    } as any);

    const res = await projectByIdGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(403);
  });

  it("projekt bez przypisanego klienta (clientId=null) jest blokowany gdy member ma ograniczenia", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      ...MOCK_PROJECT,
      clientId: null,
    } as any);

    const res = await projectByIdGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    // clientId=null → "" nie należy do allowedIds → 403
    expect(res.status).toBe(403);
  });
});

// ─── 5. Filtrowanie list zakupowych — GET /api/lists ─────────────────────────

describe("GET /api/lists — filtrowanie list po uprawnieniach klienta", () => {
  const MOCK_LIST = {
    id: "list-1", name: "Lista A", userId: "owner-1", archived: false,
    project: { id: "proj-1", title: "Projekt A" },
  };

  it("właściciel widzi wszystkie listy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([MOCK_LIST] as any);

    const res = await listsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.shoppingList.findMany).mock.calls[0][0];
    expect(findCall?.where).not.toHaveProperty("project");
  });

  it("członek widzi tylko listy z projektów dozwolonych klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([MOCK_LIST] as any);

    const res = await listsGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.shoppingList.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({
      project: { clientId: { in: ["client-allowed"] } },
    });
  });

  it("członek z pustą listą klientów nie widzi żadnych list", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([]);

    const res = await listsGET();
    const findCall = vi.mocked(prisma.shoppingList.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({
      project: { clientId: { in: [] } },
    });
  });
});

// ─── 6. Filtrowanie ankiet — GET /api/surveys ─────────────────────────────────

describe("GET /api/surveys — filtrowanie ankiet po uprawnieniach klienta", () => {
  const MOCK_SURVEY = {
    id: "survey-1", name: "Ankieta A", userId: "owner-1", isTemplate: false,
    assignedClientId: "client-allowed",
    project: null, client: { id: "client-allowed", name: "Makowska" },
    _count: { responses: 0 },
  };

  it("właściciel widzi wszystkie ankiety", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.survey.findMany).mockResolvedValue([MOCK_SURVEY] as any);

    const res = await surveysGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.survey.findMany).mock.calls[0][0];
    expect(findCall?.where).not.toHaveProperty("assignedClientId");
  });

  it("członek widzi tylko ankiety przypisane do dozwolonych klientów", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-allowed"]);
    vi.mocked(prisma.survey.findMany).mockResolvedValue([MOCK_SURVEY] as any);

    const res = await surveysGET();
    expect(res.status).toBe(200);

    const findCall = vi.mocked(prisma.survey.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({
      assignedClientId: { in: ["client-allowed"] },
    });
  });

  it("członek z pustą listą klientów nie widzi żadnych ankiet", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue([]);
    vi.mocked(prisma.survey.findMany).mockResolvedValue([]);

    const res = await surveysGET();
    const findCall = vi.mocked(prisma.survey.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({
      assignedClientId: { in: [] },
    });
  });
});

// ─── 7. Boolean permissions — POST → 403 ─────────────────────────────────────

describe("projCanCreate — tworzenie projektów przez członka", () => {
  it("członek z projCanCreate=false otrzymuje 403 przy tworzeniu projektu", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(false);

    const res = await projectsPOST(makeRequest("POST", { title: "Nowy projekt" }));
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.project.create)).not.toHaveBeenCalled();
  });

  it("członek z projCanCreate=true może tworzyć projekt", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "new-proj", title: "Nowy projekt", userId: "owner-1",
      shareToken: "tok", slug: "test-slug", discussion: { id: "disc-1" },
    } as any);

    const res = await projectsPOST(makeRequest("POST", { title: "Nowy projekt" }));
    expect(res.status).toBe(201);
  });

  it("właściciel może zawsze tworzyć projekt (checkTeamPermission zwraca true)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "new-proj", title: "Projekt Właściciela", userId: "owner-1",
      shareToken: "tok", slug: "test-slug", discussion: { id: "disc-1" },
    } as any);

    const res = await projectsPOST(makeRequest("POST", { title: "Projekt Właściciela" }));
    expect(res.status).toBe(201);
  });
});

describe("listCanCreate — tworzenie list przez członka", () => {
  it("członek z listCanCreate=false otrzymuje 403 przy tworzeniu listy", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(false);

    const res = await listsPOST(makeRequest("POST", { name: "Nowa lista" }));
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.shoppingList.findMany)).not.toHaveBeenCalled();
  });

  it("członek z listCanCreate=true może tworzyć listę", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([]);

    // POST potrzebuje też mocka create — sprawdzamy tylko że przechodzi przez perm check
    const res = await listsPOST(makeRequest("POST", { name: "Nowa lista" }));
    // Nie 403 (może być 201 lub inny status po kolejnych krokach)
    expect(res.status).not.toBe(403);
  });
});

describe("surveyCanCreate — tworzenie ankiet przez członka", () => {
  it("członek z surveyCanCreate=false otrzymuje 403 przy tworzeniu ankiety", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(false);

    const res = await surveysPOST(makeRequest("POST", { name: "Nowa ankieta" }));
    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.survey.findMany)).not.toHaveBeenCalled();
  });

  it("członek z surveyCanCreate=true może tworzyć ankietę", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(checkTeamPermission).mockResolvedValue(true);

    const res = await surveysPOST(makeRequest("POST", { name: "Nowa ankieta" }));
    expect(res.status).not.toBe(403);
  });
});

// ─── 8. Widoczność modułów — hiddenModules ────────────────────────────────────

describe("hiddenModules — zarządzanie widocznością modułów", () => {
  it("PATCH zapisuje listę ukrytych modułów", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      hiddenModules: ["veezard"],
    } as any);

    const res = await permissionsPATCH(
      makeRequest("PATCH", { hiddenModules: ["veezard"] }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hiddenModules).toContain("veezard");
  });

  it("PATCH aktualizuje listę (nadpisuje poprzednią)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      hiddenModules: ["veezard", "ankiety", "wykonawcy"],
    } as any);

    const res = await permissionsPATCH(
      makeRequest("PATCH", { hiddenModules: ["veezard", "ankiety", "wykonawcy"] }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(200);
    const upsertCall = vi.mocked(prisma.teamMemberPermission.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({
      hiddenModules: ["veezard", "ankiety", "wykonawcy"],
    });
  });

  it("PATCH może wyczyścić hiddenModules (pusta tablica)", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      hiddenModules: [],
    } as any);

    const res = await permissionsPATCH(
      makeRequest("PATCH", { hiddenModules: [] }),
      makeParams({ id: "member-1" })
    );
    expect(res.status).toBe(200);
    const upsertCall = vi.mocked(prisma.teamMemberPermission.upsert).mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({ hiddenModules: [] });
  });
});

// ─── 9. Scenariusz end-to-end: pełny cykl uprawnień ──────────────────────────

describe("Scenariusz: projektant ustawia uprawnienia → członek widzi tylko dozwolone dane", () => {
  it("projektant zapisuje ograniczenie do klienta A → GET projects zwraca filtr", async () => {
    // Krok 1: Projektant zapisuje uprawnienia
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      allowAllClients: false,
      allowedClientIds: ["client-A"],
    } as any);

    const patchRes = await permissionsPATCH(
      makeRequest("PATCH", { allowAllClients: false, allowedClientIds: ["client-A"] }),
      makeParams({ id: "member-1" })
    );
    expect(patchRes.status).toBe(200);

    // Krok 2: Członek odpytuje listę projektów — permissions mock zwraca tylko client-A
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(["client-A"]);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await projectsGET();

    const findCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(findCall?.where).toMatchObject({ clientId: { in: ["client-A"] } });
  });

  it("projektant nadaje allowAllClients=true → GET projects nie stosuje filtra", async () => {
    // Krok 1: Projektant znosi ograniczenia
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1" } as any);
    vi.mocked(prisma.teamMemberPermission.upsert).mockResolvedValue({
      ...SAVED_PERMS,
      allowAllClients: true,
      allowedClientIds: [],
    } as any);

    const patchRes = await permissionsPATCH(
      makeRequest("PATCH", { allowAllClients: true, allowedClientIds: [] }),
      makeParams({ id: "member-1" })
    );
    expect(patchRes.status).toBe(200);

    // Krok 2: Członek odpytuje projekty — brak filtra
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    vi.mocked(getAllowedClientIds).mockResolvedValue(null);
    vi.mocked(prisma.project.findMany).mockResolvedValue([MOCK_PROJECT] as any);

    await projectsGET();

    const findCall = vi.mocked(prisma.project.findMany).mock.calls[0][0];
    expect(findCall?.where).not.toHaveProperty("clientId");
  });
});
