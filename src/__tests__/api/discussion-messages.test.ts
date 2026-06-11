/**
 * Kompleksowe testy wysyłania wiadomości w module Dyskusje
 *
 * Pokrywa trzy ścieżki:
 * 1. Projektant / członek zespołu  → POST /api/discussions/[id]/messages
 * 2. Klient (zalogowany)           → POST /api/client/[projectId]/discussions/[id]/messages
 * 3. Publiczny share (bez loginu)  → POST /api/share/[token]/discussions/[id]/messages
 *
 * Dla każdej ścieżki weryfikujemy:
 * - autoryzację
 * - walidację danych wejściowych
 * - zapis wiadomości w bazie
 * - wyzwolenie eventu Pusher `discussion-{id}` → new-message (klucz dla badge w NavSidebar)
 * - wyzwolenie dodatkowych kanałów Pusher (contractor-assignment, project) gdzie wymagane
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

// ── Mocki wspólne ──────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn() }));
vi.mock("@/lib/client-access", () => ({ getClientProject: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    discussion: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    discussionMessage: { findMany: vi.fn(), create: vi.fn() },
    discussionReadReceipt: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    projectClient: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getClientProject } from "@/lib/client-access";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

import {
  GET as DesignerGET,
  POST as DesignerPOST,
} from "@/app/api/discussions/[id]/messages/route";

import {
  GET as ClientGET,
  POST as ClientPOST,
} from "@/app/api/client/[projectId]/discussions/[id]/messages/route";

import {
  GET as ShareGET,
  POST as SharePOST,
} from "@/app/api/share/[token]/discussions/[id]/messages/route";

// ── Dane testowe ───────────────────────────────────────────────────────────────

const DESIGNER_SESSION = SESSION; // { user: { id: "user-1", email: "test@test.com" } }

const CLIENT_SESSION = {
  user: { id: "client-user-1", email: "klient@test.com", role: "client" },
};

const mockMessage = {
  id: "msg-1",
  discussionId: "disc-1",
  content: "Cześć",
  authorName: "Jan",
  userId: "user-1",
  sourceType: "chat",
  attachmentUrl: null,
  attachmentName: null,
  attachmentType: null,
  replyToId: null,
  replyToContent: null,
  replyToAuthor: null,
  createdAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. POST /api/discussions/[id]/messages  (projektant / członek zespołu)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/discussions/[id]/messages — projektant", () => {
  const internalDisc = {
    id: "disc-1",
    ownerId: "user-1",
    projectId: null,
    contractorAssignmentId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue("user-1");
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(internalDisc as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Jan", email: "jan@test.com" } as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue(mockMessage as any);
    vi.mocked(prisma.discussion.update).mockResolvedValue({} as any);
    vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as any);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy dyskusja nie istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const res = await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem dyskusji", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak treści i załącznika", async () => {
    const res = await DesignerPOST(makeRequest("POST", {}), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy treść jest pustym stringiem i brak załącznika", async () => {
    const res = await DesignerPOST(makeRequest("POST", { content: "   " }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(400);
  });

  it("tworzy wiadomość z treścią i zwraca 201", async () => {
    const res = await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussionId: "disc-1",
          content: "Cześć",
          userId: "user-1",
          sourceType: "chat",
        }),
      })
    );
  });

  it("tworzy wiadomość z samym załącznikiem (bez treści)", async () => {
    const res = await DesignerPOST(
      makeRequest("POST", { attachmentUrl: "https://cdn/file.pdf", attachmentName: "doc.pdf", attachmentType: "pdf" }),
      makeParams({ id: "disc-1" })
    );
    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attachmentUrl: "https://cdn/file.pdf",
          attachmentName: "doc.pdf",
        }),
      })
    );
  });

  it("aktualizuje updatedAt dyskusji po wysłaniu wiadomości", async () => {
    await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(prisma.discussion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "disc-1" } })
    );
  });

  it("emituje event discussion-{id} new-message przez Pusher (NavSidebar badge)", async () => {
    await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "discussion-disc-1",
      "new-message",
      expect.objectContaining({ id: "msg-1" })
    );
  });

  it("NIE emituje contractor-assignment ani project gdy dyskusja wewnętrzna", async () => {
    await DesignerPOST(makeRequest("POST", { content: "Cześć" }), makeParams({ id: "disc-1" }));
    expect(pusherServer.trigger).not.toHaveBeenCalledWith(
      expect.stringContaining("contractor-assignment"),
      expect.anything(),
      expect.anything()
    );
    expect(pusherServer.trigger).not.toHaveBeenCalledWith(
      expect.stringContaining("project-"),
      expect.anything(),
      expect.anything()
    );
  });

  it("emituje contractor-assignment-{id} gdy dyskusja wykonawcy", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue({
      ...internalDisc,
      contractorAssignmentId: "assign-99",
    } as any);

    await DesignerPOST(makeRequest("POST", { content: "Wiadomość dla wykonawcy" }), makeParams({ id: "disc-1" }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "contractor-assignment-assign-99",
      "new-message",
      expect.any(Object)
    );
  });

  it("emituje project-{id} gdy dyskusja projektowa", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue({
      ...internalDisc,
      projectId: "proj-42",
    } as any);

    await DesignerPOST(makeRequest("POST", { content: "Wiadomość projektowa" }), makeParams({ id: "disc-1" }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "project-proj-42",
      "new-message",
      expect.objectContaining({ discussionId: "disc-1" })
    );
  });

  it("członek zespołu (ownerId → workspace owner) może wysłać wiadomość jako właściciel", async () => {
    // getWorkspaceUserId zwraca ownerId zamiast własnego id dla członka zespołu
    vi.mocked(getWorkspaceUserId).mockReturnValue("user-1"); // team member maps to owner
    const res = await DesignerPOST(makeRequest("POST", { content: "Od członka zespołu" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(201);
    expect(pusherServer.trigger).toHaveBeenCalledWith("discussion-disc-1", "new-message", expect.any(Object));
  });
});

// ── GET /api/discussions/[id]/messages ────────────────────────────────────────

describe("GET /api/discussions/[id]/messages — projektant", () => {
  const mockDisc = { id: "disc-1", ownerId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue("user-1");
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockDisc as any);
    vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue([mockMessage] as any);
    vi.mocked(prisma.discussionReadReceipt.findMany).mockResolvedValue([]);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DesignerGET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await DesignerGET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca messages i receipts dla właściciela dyskusji", async () => {
    const res = await DesignerGET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.receipts).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/client/[projectId]/discussions/[id]/messages  (klient zalogowany)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/client/[projectId]/discussions/[id]/messages — klient", () => {
  const mockClientDisc = { id: "disc-1", projectId: "proj-1", ownerId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(getClientProject).mockResolvedValue({ id: "proj-1" } as any);
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue(mockClientDisc as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Klient ABC", email: "klient@test.com" } as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue({ ...mockMessage, userId: "client-user-1", authorName: "Klient ABC" } as any);
    vi.mocked(prisma.discussion.update).mockResolvedValue({} as any);
    vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as any);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await ClientPOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy klient nie ma dostępu do projektu (getClientProject null)", async () => {
    vi.mocked(getClientProject).mockResolvedValue(null);
    const res = await ClientPOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy dyskusja nie należy do projektu", async () => {
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue(null);
    const res = await ClientPOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 400 gdy brak treści i załącznika", async () => {
    const res = await ClientPOST(
      makeRequest("POST", {}),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(400);
  });

  it("tworzy wiadomość i zwraca 201", async () => {
    const res = await ClientPOST(
      makeRequest("POST", { content: "Pytanie klienta" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussionId: "disc-1",
          content: "Pytanie klienta",
          userId: "client-user-1",
          sourceType: "chat",
        }),
      })
    );
  });

  it("emituje discussion-{id} new-message przez Pusher (NavSidebar badge projektanta)", async () => {
    await ClientPOST(
      makeRequest("POST", { content: "Pytanie klienta" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "discussion-disc-1",
      "new-message",
      expect.objectContaining({ discussionId: "disc-1" })
    );
  });

  it("używa nazwy klienta z bazy jako authorName", async () => {
    await ClientPOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorName: "Klient ABC" }),
      })
    );
  });

  it("fallback authorName to 'Klient' gdy brak nazwy użytkownika", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: null, email: "klient@test.com" } as any);
    await ClientPOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ projectId: "proj-1", id: "disc-1" })
    );
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorName: "Klient" }),
      })
    );
  });
});

// ── GET /api/client/[projectId]/discussions/[id]/messages ─────────────────────

describe("GET /api/client/[projectId]/discussions/[id]/messages — klient", () => {
  const mockClientDisc = { id: "disc-1", projectId: "proj-1", ownerId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(CLIENT_SESSION as any);
    vi.mocked(getClientProject).mockResolvedValue({ id: "proj-1" } as any);
    vi.mocked(prisma.discussion.findFirst).mockResolvedValue(mockClientDisc as any);
    vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue([mockMessage] as any);
    vi.mocked(prisma.discussionReadReceipt.findMany).mockResolvedValue([]);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await ClientGET(makeRequest("GET"), makeParams({ projectId: "proj-1", id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy brak dostępu", async () => {
    vi.mocked(getClientProject).mockResolvedValue(null);
    const res = await ClientGET(makeRequest("GET"), makeParams({ projectId: "proj-1", id: "disc-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca messages i receipts dla uprawnionego klienta", async () => {
    const res = await ClientGET(makeRequest("GET"), makeParams({ projectId: "proj-1", id: "disc-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.receipts).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. POST /api/share/[token]/discussions/[id]/messages  (publiczny share)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/share/[token]/discussions/[id]/messages — publiczny share", () => {
  const activeProject = {
    archived: false,
    shareExpiresAt: null,
    discussion: { id: "disc-1" },
  };

  const shareMessage = {
    ...mockMessage,
    userId: null,
    authorName: "Jan Klient",
    clientEmail: "jan@email.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.project.findUnique).mockResolvedValue(activeProject as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue(shareMessage as any);
    vi.mocked(prisma.discussion.update).mockResolvedValue({} as any);
    vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as any);
  });

  it("zwraca 404 gdy projekt nie istnieje", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć", authorName: "Jan" }),
      makeParams({ token: "bad-token", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy projekt jest zarchiwizowany", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ ...activeProject, archived: true } as any);
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć", authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 410 gdy link wygasł", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...activeProject,
      shareExpiresAt: new Date("2020-01-01"),
    } as any);
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć", authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(410);
  });

  it("zwraca 404 gdy id dyskusji nie pasuje do projektu", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...activeProject,
      discussion: { id: "other-disc" },
    } as any);
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć", authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy projekt nie ma dyskusji", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...activeProject,
      discussion: null,
    } as any);
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć", authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 400 gdy brak treści i brak załącznika", async () => {
    const res = await SharePOST(
      makeRequest("POST", { authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zwraca 400 gdy brak authorName", async () => {
    const res = await SharePOST(
      makeRequest("POST", { content: "Cześć" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(400);
  });

  it("tworzy wiadomość bez userId (anonimowy nadawca) i zwraca 201", async () => {
    const res = await SharePOST(
      makeRequest("POST", { content: "Pytanie od klienta", authorName: "Jan Klient", clientEmail: "jan@email.com" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussionId: "disc-1",
          content: "Pytanie od klienta",
          authorName: "Jan Klient",
          clientEmail: "jan@email.com",
          sourceType: "chat",
        }),
      })
    );
    // userId NIE jest ustawiane w share route
    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call.data as any).userId).toBeUndefined();
  });

  it("emituje discussion-{id} new-message przez Pusher (NavSidebar badge projektanta)", async () => {
    await SharePOST(
      makeRequest("POST", { content: "Pytanie", authorName: "Jan" }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "discussion-disc-1",
      "new-message",
      expect.any(Object)
    );
  });

  it("wysyłka z samym załącznikiem (bez treści) przechodzi walidację", async () => {
    const res = await SharePOST(
      makeRequest("POST", {
        authorName: "Jan",
        attachmentUrl: "https://cdn/file.pdf",
        attachmentName: "umowa.pdf",
      }),
      makeParams({ token: "token-1", id: "disc-1" })
    );
    expect(res.status).toBe(201);
  });
});

// ── GET /api/share/[token]/discussions/[id]/messages ──────────────────────────

describe("GET /api/share/[token]/discussions/[id]/messages — publiczny share", () => {
  const activeProject = {
    archived: false,
    shareExpiresAt: null,
    discussion: { id: "disc-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.project.findUnique).mockResolvedValue(activeProject as any);
    vi.mocked(prisma.discussionMessage.findMany).mockResolvedValue([mockMessage] as any);
    vi.mocked(prisma.discussionReadReceipt.findMany).mockResolvedValue([]);
  });

  it("zwraca 404 gdy projekt nie istnieje", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    const res = await ShareGET(makeRequest("GET"), makeParams({ token: "bad", id: "disc-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 410 gdy link wygasł", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...activeProject,
      shareExpiresAt: new Date("2020-01-01"),
    } as any);
    const res = await ShareGET(makeRequest("GET"), makeParams({ token: "token-1", id: "disc-1" }));
    expect(res.status).toBe(410);
  });

  it("zwraca messages i receipts dla aktywnego linku", async () => {
    const res = await ShareGET(makeRequest("GET"), makeParams({ token: "token-1", id: "disc-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.receipts).toEqual([]);
  });
});
