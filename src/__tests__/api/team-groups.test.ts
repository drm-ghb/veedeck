import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    permissionGroup: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
    },
    groupMember: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/lib/permissions", () => ({
  ensureWorkspaceSeed: vi.fn().mockResolvedValue(undefined),
  TEMPLATE_GROUPS: [
    {
      templateKey: "wizualizatorzy",
      name: "Wizualizatorzy",
      projectScope: "assigned",
      permissions: {
        klienci: 0, projectflow: 2, listy: 1, moodboardy: 2, zadania: 2,
        ankiety: 0, produkty: 1, wykonawcy: 0, kalendarz: 1, notatnik: 2,
        dyskusje: 2, ustawienia: 0,
      },
    },
  ],
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET as groupsGET, POST as groupsPOST } from "@/app/api/team/groups/route";
import { GET as groupGET, PATCH as groupPATCH, DELETE as groupDELETE } from "@/app/api/team/groups/[id]/route";
import { GET as membersGET, POST as membersPOST } from "@/app/api/team/groups/[id]/members/route";
import { DELETE as memberDELETE } from "@/app/api/team/groups/[id]/members/[userId]/route";

beforeEach(() => vi.clearAllMocks());

// ─── Session fixtures ─────────────────────────────────────────────────────────

const OWNER_SESSION = { user: { id: "owner-1", email: "owner@test.com" } };
const MEMBER_SESSION = {
  user: { id: "member-1", email: "member@test.com", ownerId: "owner-1", systemRole: "member" },
};
const ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@test.com", ownerId: "owner-1", systemRole: "admin" },
};

const MOCK_GROUP = {
  id: "group-1",
  workspaceId: "owner-1",
  name: "Wizualizatorzy",
  isTemplate: true,
  templateKey: "wizualizatorzy",
  projectScope: "assigned",
  permissions: { klienci: 0, projectflow: 2 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── GET /api/team/groups ─────────────────────────────────────────────────────

describe("GET /api/team/groups", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await groupsGET();
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla zwykłego członka (non-admin)", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    const res = await groupsGET();
    expect(res.status).toBe(403);
  });

  it("zwraca listę grup dla właściciela", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findMany).mockResolvedValue([MOCK_GROUP] as any);
    const res = await groupsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Wizualizatorzy");
  });

  it("zwraca listę grup dla admina", async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any);
    vi.mocked(prisma.permissionGroup.findMany).mockResolvedValue([MOCK_GROUP] as any);
    const res = await groupsGET();
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/team/groups ────────────────────────────────────────────────────

describe("POST /api/team/groups", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await groupsPOST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla zwykłego członka", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    const res = await groupsPOST(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak nazwy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    const res = await groupsPOST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("tworzy nową grupę i zwraca 201", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.create).mockResolvedValue({
      ...MOCK_GROUP,
      name: "Nowa Grupa",
      isTemplate: false,
      templateKey: null,
    } as any);
    const res = await groupsPOST(makeRequest("POST", { name: "Nowa Grupa", projectScope: "assigned" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Nowa Grupa");
  });

  it("klonuje istniejącą grupę gdy podano cloneFromId", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.permissionGroup.create).mockResolvedValue({
      ...MOCK_GROUP,
      id: "group-2",
      name: "Wizualizatorzy (kopia)",
      isTemplate: false,
    } as any);

    const res = await groupsPOST(makeRequest("POST", { cloneFromId: "group-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Wizualizatorzy (kopia)");
  });

  it("zwraca 404 przy klonowaniu gdy źródłowa grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await groupsPOST(makeRequest("POST", { cloneFromId: "nonexistent" }));
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/team/groups/[id] ────────────────────────────────────────────────

describe("GET /api/team/groups/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await groupGET(makeRequest("GET"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await groupGET(makeRequest("GET"), makeParams({ id: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("zwraca grupę z członkami", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue({
      ...MOCK_GROUP,
      members: [],
    } as any);
    const res = await groupGET(makeRequest("GET"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("group-1");
  });
});

// ─── PATCH /api/team/groups/[id] ─────────────────────────────────────────────

describe("PATCH /api/team/groups/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await groupPATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await groupPATCH(makeRequest("PATCH", { name: "Nowa" }), makeParams({ id: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje nazwę i scope grupy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.permissionGroup.update).mockResolvedValue({
      ...MOCK_GROUP,
      name: "Zmieniona Nazwa",
      projectScope: "all",
    } as any);

    const res = await groupPATCH(
      makeRequest("PATCH", { name: "Zmieniona Nazwa", projectScope: "all" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Zmieniona Nazwa");
  });

  it("przywraca domyślne ustawienia szablonowej grupy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.permissionGroup.update).mockResolvedValue(MOCK_GROUP as any);

    const res = await groupPATCH(
      makeRequest("PATCH", { restoreDefaults: true }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.permissionGroup.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "group-1" },
        data: expect.objectContaining({ name: "Wizualizatorzy" }),
      })
    );
  });

  it("zwraca 400 przy restoreDefaults na nieszablonowej grupie", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue({
      ...MOCK_GROUP,
      isTemplate: false,
      templateKey: null,
    } as any);

    const res = await groupPATCH(
      makeRequest("PATCH", { restoreDefaults: true }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/team/groups/[id] ────────────────────────────────────────────

describe("DELETE /api/team/groups/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await groupDELETE(makeRequest("DELETE"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla zwykłego członka", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    const res = await groupDELETE(makeRequest("DELETE"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await groupDELETE(makeRequest("DELETE"), makeParams({ id: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("usuwa grupę i zwraca ok", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.permissionGroup.delete).mockResolvedValue(MOCK_GROUP as any);

    const res = await groupDELETE(makeRequest("DELETE"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ─── GET /api/team/groups/[id]/members ───────────────────────────────────────

describe("GET /api/team/groups/[id]/members", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await membersGET(makeRequest("GET"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await membersGET(makeRequest("GET"), makeParams({ id: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("zwraca listę członków grupy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.groupMember.findMany).mockResolvedValue([
      { id: "gm-1", groupId: "group-1", userId: "member-1", user: { id: "member-1", name: "Jan" } },
    ] as any);

    const res = await membersGET(makeRequest("GET"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });
});

// ─── POST /api/team/groups/[id]/members ──────────────────────────────────────

describe("POST /api/team/groups/[id]/members", () => {
  it("zwraca 400 gdy brak userId", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    const res = await membersPOST(makeRequest("POST", {}), makeParams({ id: "group-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 403 gdy użytkownik nie należy do workspace'u", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await membersPOST(
      makeRequest("POST", { userId: "foreign-user" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(403);
  });

  it("dodaje użytkownika do grupy i zwraca 201", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "member-1", ownerId: "owner-1" } as any);
    vi.mocked(prisma.groupMember.upsert).mockResolvedValue({
      id: "gm-1",
      groupId: "group-1",
      userId: "member-1",
    } as any);

    const res = await membersPOST(
      makeRequest("POST", { userId: "member-1" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.userId).toBe("member-1");
  });
});

// ─── DELETE /api/team/groups/[id]/members/[userId] ───────────────────────────

describe("DELETE /api/team/groups/[id]/members/[userId]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "group-1", userId: "member-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla zwykłego członka", async () => {
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION as any);
    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "group-1", userId: "member-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy grupa nie istnieje", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(null);
    const res = await memberDELETE(makeRequest("DELETE"), makeParams({ id: "nonexistent", userId: "member-1" }));
    expect(res.status).toBe(404);
  });

  it("usuwa członka i zwraca hasGroups=false gdy ostatnia grupa", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.groupMember.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.groupMember.count).mockResolvedValue(0); // no remaining groups

    const res = await memberDELETE(
      makeRequest("DELETE"),
      makeParams({ id: "group-1", userId: "member-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.hasGroups).toBe(false);
  });

  it("usuwa członka i zwraca hasGroups=true gdy ma jeszcze inne grupy", async () => {
    vi.mocked(auth).mockResolvedValue(OWNER_SESSION as any);
    vi.mocked(prisma.permissionGroup.findFirst).mockResolvedValue(MOCK_GROUP as any);
    vi.mocked(prisma.groupMember.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.groupMember.count).mockResolvedValue(2); // still in 2 groups

    const res = await memberDELETE(
      makeRequest("DELETE"),
      makeParams({ id: "group-1", userId: "member-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasGroups).toBe(true);
  });
});
