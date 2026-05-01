/**
 * Tests for the client account system:
 *  - POST /api/projects/[id]/clients  — tworzy konto klienta z hasłem
 *  - PATCH /api/projects/[id]/clients/[clientId] — zmienia login/hasło
 *  - DELETE /api/projects/[id]/clients/[clientId] — usuwa konto klienta
 *  - GET /api/client — lista projektów dla zalogowanego klienta
 *  - GET /api/client/[projectId] — dane projektu dla klienta
 *  - POST /api/client/[projectId]/discussions/[id]/messages — wiadomość klienta
 *  - lib/client-login — generateClientLogin
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateClientLogin } from "@/lib/client-login";
import { makeRequest, makeParams, SESSION } from "../helpers";

// ─── lib/client-login ────────────────────────────────────────────────────────

describe("generateClientLogin", () => {
  it("zwraca pierwszą literę imienia + nazwisko", () => {
    expect(generateClientLogin("Daniel Rychlik")).toBe("drychlik");
  });

  it("usuwa polskie znaki", () => {
    expect(generateClientLogin("Łukasz Żółtowski")).toBe("lzoltowski");
    expect(generateClientLogin("Zofia Ćwikła")).toBe("zcwikla");
  });

  it("zamienia na małe litery", () => {
    expect(generateClientLogin("ANNA KOWALSKA")).toBe("akowalska");
  });

  it("obsługuje wieloczłonowe nazwiska", () => {
    expect(generateClientLogin("Jan Kowalski Nowak")).toBe("jkowalskinowak");
  });

  it("zwraca pusty string dla jednego słowa", () => {
    expect(generateClientLogin("Daniel")).toBe("d");
  });

  it("obsługuje imię ze spacjami na końcu", () => {
    expect(generateClientLogin("  Piotr Malinowski  ")).toBe("pmalinowski");
  });
});

// ─── POST /api/projects/[id]/clients ─────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectClient: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    discussion: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    discussionMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    discussionReadReceipt: {
      findMany: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
    },
    shoppingList: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/pusher", () => ({ pusherServer: { trigger: vi.fn() } }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password"), compare: vi.fn() },
  hash: vi.fn().mockResolvedValue("hashed_password"),
}));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn().mockReturnValue("user-1") }));
vi.mock("@/lib/client-login", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client-login")>();
  return actual; // use real implementation
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET as clientsGET, POST as clientsPOST } from "@/app/api/projects/[id]/clients/route";
import { PATCH as clientPATCH, DELETE as clientDELETE } from "@/app/api/projects/[id]/clients/[clientId]/route";
import { GET as clientListGET } from "@/app/api/client/route";
import { GET as clientProjectGET } from "@/app/api/client/[projectId]/route";
import {
  GET as messagesGET,
  POST as messagesPOST,
} from "@/app/api/client/[projectId]/discussions/[id]/messages/route";

const CLIENT_SESSION = { user: { id: "client-1", email: "drychlik@client.internal", role: "client" } };
const DESIGNER_SESSION = { user: { id: "user-1", email: "designer@test.com", role: "designer" } };

const mockProject = {
  id: "proj-1",
  title: "Projekt Makowska",
  userId: "user-1",
  archived: false,
  hiddenModules: [],
  allowClientComments: true,
  allowDirectStatusChange: false,
  allowClientAcceptance: true,
  allowClientVersionRestore: false,
  hideCommentCount: false,
  clientCanUpload: false,
  theme: null,
  user: { name: "Projektant", showProfileName: true, clientLogoUrl: null, showClientLogo: false },
};

beforeEach(() => vi.clearAllMocks());

// ─── GET /api/projects/[id]/clients ──────────────────────────────────────────

describe("GET /api/projects/[id]/clients", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await clientsGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy projekt nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
    const res = await clientsGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca listę klientów z danymi użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findMany).mockResolvedValue([
      {
        id: "c1",
        name: "Daniel Rychlik",
        email: null,
        phone: null,
        isMainContact: false,
        createdAt: new Date(),
        userId: "client-1",
        user: { id: "client-1", login: "drychlik", email: "drychlik@client.internal", role: "client" },
      },
    ] as any);

    const res = await clientsGET(makeRequest("GET"), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].user.login).toBe("drychlik");
  });
});

// ─── POST /api/projects/[id]/clients ─────────────────────────────────────────

describe("POST /api/projects/[id]/clients — tworzenie konta klienta", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await clientsPOST(makeRequest("POST", { name: "Jan Nowak", password: "abc123" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak imienia", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    const res = await clientsPOST(makeRequest("POST", { name: "", password: "abc123" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy hasło za krótkie (< 4 znaki)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    const res = await clientsPOST(makeRequest("POST", { name: "Jan Nowak", password: "ab" }), makeParams({ id: "proj-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 409 gdy login jest zajęty", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "other-user", login: "jnowak" } as any); // login zajęty

    const res = await clientsPOST(
      makeRequest("POST", { name: "Jan Nowak", password: "haslo123" }),
      makeParams({ id: "proj-1" })
    );
    expect(res.status).toBe(409);
  });

  it("tworzy konto klienta i zwraca dane z loginem", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // login wolny
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "client-new",
      name: "Daniel Rychlik",
      login: "drychlik",
      email: "drychlik@client.internal",
      role: "client",
    } as any);
    vi.mocked(prisma.projectClient.create).mockResolvedValue({
      id: "pc-1",
      name: "Daniel Rychlik",
      email: null,
      phone: null,
      isMainContact: false,
      projectId: "proj-1",
      userId: "client-new",
      createdAt: new Date(),
      startDate: null,
      endDate: null,
      user: { id: "client-new", login: "drychlik", email: "drychlik@client.internal" },
    } as any);
    vi.mocked(prisma.projectClient.updateMany).mockResolvedValue({ count: 0 } as any);

    const res = await clientsPOST(
      makeRequest("POST", { name: "Daniel Rychlik", password: "tajnehaslo", email: null, phone: null }),
      makeParams({ id: "proj-1" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.login).toBe("drychlik");
    expect(body.userId).toBe("client-new");

    // Login musi być generowany z imienia
    expect(vi.mocked(prisma.user.create).mock.calls[0][0].data.login).toBe("drychlik");
  });

  it("generuje poprawny login z polskim imieniem", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "c2",
      login: "zkowalska",
      email: "zkowalska@client.internal",
      role: "client",
    } as any);
    vi.mocked(prisma.projectClient.create).mockResolvedValue({
      id: "pc-2", name: "Zuzanna Kowalska", userId: "c2",
      user: { id: "c2", login: "zkowalska", email: "zkowalska@client.internal" },
    } as any);
    vi.mocked(prisma.projectClient.updateMany).mockResolvedValue({ count: 0 } as any);

    await clientsPOST(
      makeRequest("POST", { name: "Zuzanna Kowalska", password: "haslo123" }),
      makeParams({ id: "proj-1" })
    );

    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.login).toBe("zkowalska");
    expect(createCall.data.email).toBe("zkowalska@client.internal");
    expect(createCall.data.role).toBe("client");
  });
});

// ─── PATCH /api/projects/[id]/clients/[clientId] ─────────────────────────────

describe("PATCH /api/projects/[id]/clients/[clientId] — zmiana loginu/hasła", () => {
  const existingClient = {
    id: "pc-1",
    name: "Daniel Rychlik",
    email: null,
    phone: null,
    isMainContact: false,
    userId: "client-1",
    projectId: "proj-1",
    user: { id: "client-1", login: "drychlik", email: "drychlik@client.internal", password: "old_hash", role: "client" },
  };

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await clientPATCH(
      makeRequest("PATCH", { login: "newlogin" }),
      makeParams({ id: "proj-1", clientId: "pc-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zmienia login i aktualizuje email wewnętrzny", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(existingClient as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null); // login wolny
    vi.mocked(prisma.user.update).mockResolvedValue({ ...existingClient.user, login: "drychl2" } as any);
    vi.mocked(prisma.projectClient.update).mockResolvedValue({
      ...existingClient,
      user: { id: "client-1", login: "drychl2", email: "drychl2@client.internal" },
    } as any);

    const res = await clientPATCH(
      makeRequest("PATCH", { login: "drychl2" }),
      makeParams({ id: "proj-1", clientId: "pc-1" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.login).toBe("drychl2");

    const userUpdateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(userUpdateCall.data.login).toBe("drychl2");
    expect(userUpdateCall.data.email).toBe("drychl2@client.internal");
  });

  it("zwraca 409 gdy nowy login jest zajęty", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(existingClient as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "other", login: "drychl2" } as any);

    const res = await clientPATCH(
      makeRequest("PATCH", { login: "drychl2" }),
      makeParams({ id: "proj-1", clientId: "pc-1" })
    );
    expect(res.status).toBe(409);
  });

  it("zmienia hasło (nowe hasło haszowane)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(existingClient as any);
    vi.mocked(prisma.user.update).mockResolvedValue(existingClient.user as any);
    vi.mocked(prisma.projectClient.update).mockResolvedValue({
      ...existingClient,
      user: { id: "client-1", login: "drychlik", email: "drychlik@client.internal" },
    } as any);

    const res = await clientPATCH(
      makeRequest("PATCH", { password: "nowehaslo" }),
      makeParams({ id: "proj-1", clientId: "pc-1" })
    );

    expect(res.status).toBe(200);
    const userUpdateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
    expect(userUpdateCall.data.password).toBe("hashed_password"); // bcrypt.hash mock
  });

  it("zwraca 400 gdy klient nie ma konta, a próba zmiany loginu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({
      ...existingClient,
      userId: null,
      user: null,
    } as any);

    const res = await clientPATCH(
      makeRequest("PATCH", { login: "newlogin" }),
      makeParams({ id: "proj-1", clientId: "pc-1" })
    );
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/projects/[id]/clients/[clientId] ────────────────────────────

describe("DELETE /api/projects/[id]/clients/[clientId] — usuwanie klienta i konta", () => {
  const clientWithAccount = {
    id: "pc-1",
    name: "Daniel Rychlik",
    isMainContact: false,
    userId: "client-1",
    projectId: "proj-1",
    user: { id: "client-1", login: "drychlik" },
  };

  it("usuwa klienta i konto gdy nie jest przypisany do innych projektów", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(clientWithAccount as any);
    vi.mocked(prisma.projectClient.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.projectClient.count).mockResolvedValue(0); // nie jest w innych projektach
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any);

    const res = await clientDELETE(makeRequest("DELETE"), makeParams({ id: "proj-1", clientId: "pc-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.delete)).toHaveBeenCalledWith({ where: { id: "client-1" } });
  });

  it("usuwa klienta ale NIE usuwa konta gdy jest w innych projektach", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(clientWithAccount as any);
    vi.mocked(prisma.projectClient.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.projectClient.count).mockResolvedValue(1); // jest w innym projekcie
    vi.mocked(prisma.project.update).mockResolvedValue({} as any);

    const res = await clientDELETE(makeRequest("DELETE"), makeParams({ id: "proj-1", clientId: "pc-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled();
  });

  it("usuwa klienta bez konta (brak userId)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({
      ...clientWithAccount,
      userId: null,
      user: null,
    } as any);
    vi.mocked(prisma.projectClient.deleteMany).mockResolvedValue({ count: 1 });

    const res = await clientDELETE(makeRequest("DELETE"), makeParams({ id: "proj-1", clientId: "pc-1" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled();
  });
});

// ─── GET /api/client — lista projektów klienta ───────────────────────────────

describe("GET /api/client — lista projektów zalogowanego klienta", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await clientListGET();
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla projektanta (nie klienta)", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    const res = await clientListGET();
    expect(res.status).toBe(403);
  });

  it("zwraca projekty klienta (bez zarchiwizowanych)", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findMany).mockResolvedValue([
      {
        project: {
          id: "proj-1",
          title: "Makowska",
          archived: false,
          user: { name: "Projektant", clientLogoUrl: null, showProfileName: true, showClientLogo: false },
        },
      },
      {
        project: {
          id: "proj-2",
          title: "Stary projekt",
          archived: true,
          user: { name: "Projektant", clientLogoUrl: null, showProfileName: true, showClientLogo: false },
        },
      },
    ] as any);

    const res = await clientListGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("proj-1");
    expect(body[0].title).toBe("Makowska");
  });
});

// ─── GET /api/client/[projectId] ─────────────────────────────────────────────

describe("GET /api/client/[projectId] — dane projektu dla klienta", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await clientProjectGET(makeRequest("GET"), makeParams({ projectId: "proj-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 dla projektanta", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    const res = await clientProjectGET(makeRequest("GET"), makeParams({ projectId: "proj-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);
    const res = await clientProjectGET(makeRequest("GET"), makeParams({ projectId: "proj-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca dane projektu dla uprawnionego klienta", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    // getClientProject: projectClient link check
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    // getClientProject: project fetch
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject,
      sharePassword: null,
      shareExpiresAt: null,
    } as any);
    // route: rooms, lists, discussion
    vi.mocked(prisma.room.findMany).mockResolvedValue([]);
    vi.mocked(prisma.shoppingList.findMany).mockResolvedValue([]);
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);

    const res = await clientProjectGET(makeRequest("GET"), makeParams({ projectId: "proj-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("proj-1");
    expect(body.title).toBe("Projekt Makowska");
  });
});

// ─── POST /api/client/[projectId]/discussions/[id]/messages ──────────────────

describe("POST /api/client/[projectId]/discussions/[id]/messages — wysyłanie wiadomości klienta", () => {
  const mockDiscussion = { id: "disc-1", projectId: "proj-1", title: "Dyskusja" };

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await messagesPOST(
      makeRequest("POST", { content: "Hej!" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);

    const res = await messagesPOST(
      makeRequest("POST", { content: "Hej!" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("wysyła wiadomość jako klient i zapisuje userId", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    // getClientProject checks
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject, sharePassword: null, shareExpiresAt: null,
    } as any);
    // discussion check
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue(mockDiscussion as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "client-1", name: "Daniel Rychlik",
    } as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue({
      id: "msg-1",
      content: "Hej!",
      authorName: "Daniel Rychlik",
      userId: "client-1",
      discussionId: "disc-1",
      createdAt: new Date(),
    } as any);
    vi.mocked(prisma.discussion.update).mockResolvedValue({} as any);

    const res = await messagesPOST(
      makeRequest("POST", { content: "Hej!" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("Hej!");
    expect(body.authorName).toBe("Daniel Rychlik");
    expect(body.userId).toBe("client-1");

    const createCall = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect(createCall.data.authorName).toBe("Daniel Rychlik");
    expect(createCall.data.userId).toBe("client-1");
  });

  it("zwraca 400 gdy brak treści i załącznika", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject, sharePassword: null, shareExpiresAt: null,
    } as any);
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue(mockDiscussion as any);

    const res = await messagesPOST(
      makeRequest("POST", { content: "" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/client/[projectId]/discussions/[id]/messages ───────────────────

describe("GET /api/client/[projectId]/discussions/[id]/messages — odczyt wiadomości", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await messagesGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca wiadomości dla uprawionego klienta", async () => {
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject, sharePassword: null, shareExpiresAt: null,
    } as any);
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue({ id: "disc-1", projectId: "proj-1" } as any);
    vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue([
      { id: "m1", content: "Dzień dobry", authorName: "Daniel Rychlik", createdAt: new Date() },
    ] as any);
    vi.mocked(prisma.discussionReadReceipt.findMany).mockResolvedValue([]);

    const res = await messagesGET(
      makeRequest("GET"),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].authorName).toBe("Daniel Rychlik");
  });
});
