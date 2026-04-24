/**
 * Testy audytu systemu powiadomień
 *
 * Pokrycie:
 * 1. Guard !isDesigner w POST /api/comments
 * 2. Guard !isDesigner w POST /api/list-comments
 * 3. Pełny payload Pushera w PATCH /api/calendar/[id] (nie pusty {})
 * 4. Cleanup starych powiadomień w GET /api/notifications
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

// ── Globalne mocki — muszą być przed importami route handlers ─────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/slug", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("test-slug"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    render: { findUnique: vi.fn() },
    comment: { create: vi.fn(), count: vi.fn() },
    discussion: { findUnique: vi.fn(), create: vi.fn() },
    discussionMessage: { create: vi.fn() },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    listProductComment: { create: vi.fn() },
    listProduct: { findUnique: vi.fn() },
    calendarEvent: { findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// ── Importy route handlers ────────────────────────────────────────────────────

import { POST as PostComment } from "@/app/api/comments/route";
import { POST as PostListComment } from "@/app/api/list-comments/route";
import { PATCH as PatchCalendarEvent } from "@/app/api/calendar/[id]/route";
import { GET as GetNotifications } from "@/app/api/notifications/route";

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

// ── Dane testowe ──────────────────────────────────────────────────────────────

const DESIGNER_ID = SESSION.user.id; // "user-1" = render.project.userId

const mockRender = {
  id: "r1",
  name: "Salon render",
  fileUrl: "http://cdn/render.jpg",
  projectId: "proj-1",
  project: {
    id: "proj-1",
    title: "Projekt Test",
    userId: DESIGNER_ID,
    user: {
      requirePinTitle: false,
      maxPinsPerRender: null,
    },
  },
};

const mockProduct = {
  id: "prod-1",
  name: "Sofa narożna",
  imageUrl: null,
  section: {
    list: {
      id: "list-1",
      slug: "lista-salonu",
      name: "Lista salonu",
      userId: DESIGNER_ID,
      projectId: "proj-1",
      project: { title: "Projekt Test" },
    },
  },
};

const mockCalendarEvent = {
  id: "ev-1",
  title: "Spotkanie projektowe",
  type: "WYDARZENIE",
  startAt: new Date(),
  endAt: null,
  userId: DESIGNER_ID,
  guests: [{ id: "g1", userId: "guest-user-1" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Domyślnie: brak sesji (= klient)
  vi.mocked(auth).mockResolvedValue(null);
  vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);
  // discussion.findUnique rzuca — try-catch w route łapie
  vi.mocked(prisma.discussion.findUnique).mockRejectedValue(new Error("not mocked"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Guard !isDesigner — POST /api/comments
// ═══════════════════════════════════════════════════════════════════════════════

describe("Guard !isDesigner — POST /api/comments", () => {
  const mockComment = {
    id: "c1",
    renderId: "r1",
    content: "Treść",
    author: "Klient",
    posX: null,
    posY: null,
    isInternal: false,
  };

  beforeEach(() => {
    vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);
  });

  it("tworzy powiadomienie gdy komentarz od klienta (brak sesji)", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: DESIGNER_ID,
          message: expect.stringContaining("Klient"),
        }),
      })
    );
  });

  it("tworzy powiadomienie gdy inny zalogowany (nie projektant) komentuje", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    // getWorkspaceUserId zwraca "other-user" — "other-user" !== DESIGNER_ID → nie projektant
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Inny",
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it("NIE tworzy powiadomienia gdy komentarz od projektanta", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Uwaga projektanta", author: "Projektant",
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("NIE tworzy powiadomienia gdy projektant dodaje pin", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, posX: 50, posY: 30,
    } as any);

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Pin projektanta", author: "Projektant", posX: 50, posY: 30,
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("tworzy powiadomienie gdy klient dodaje pin", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, posX: 20, posY: 40,
    } as any);

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Pin klienta", author: "Klient", posX: 20, posY: 40,
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining("pin"),
        }),
      })
    );
  });

  it("triggeruje Pusher z nowym powiadomieniem gdy klient komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const notif = { id: "notif-1", message: "Klient wysłał...", link: "/projects/proj-1/renders/r1", read: false, createdAt: new Date() };
    vi.mocked(prisma.notification.create).mockResolvedValue(notif as any);

    await PostComment(makeRequest("POST", { renderId: "r1", content: "Treść", author: "Klient" }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `user-${DESIGNER_ID}`,
      "new-notification",
      expect.objectContaining({ id: "notif-1" })
    );
  });

  it("NIE triggeruje Pushera z powiadomieniem gdy projektant komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);

    await PostComment(makeRequest("POST", { renderId: "r1", content: "Treść", author: "Projektant" }));

    const notifTriggers = vi.mocked(pusherServer.trigger).mock.calls.filter(
      (call) => call[1] === "new-notification"
    );
    expect(notifTriggers).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Guard !isDesigner — POST /api/list-comments
// ═══════════════════════════════════════════════════════════════════════════════

describe("Guard !isDesigner — POST /api/list-comments", () => {
  const mockComment = {
    id: "lc-1", productId: "prod-1", content: "Treść", author: "Klient", replies: [],
  };

  beforeEach(() => {
    vi.mocked(prisma.listProductComment.create).mockResolvedValue(mockComment as any);
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-2" } as any);
  });

  it("tworzy powiadomienie gdy komentarz od klienta (brak sesji)", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: DESIGNER_ID,
          type: "list_comment",
        }),
      })
    );
  });

  it("NIE tworzy powiadomienia gdy komentarz od projektanta", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);

    const res = await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Uwaga projektanta", author: "Projektant",
    }));

    expect(res.status).toBe(201);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("triggeruje Pusher z nowym powiadomieniem gdy klient komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const notif = { id: "notif-2", message: "Klient dodał...", link: "/listy/lista-salonu?product=prod-1", read: false };
    vi.mocked(prisma.notification.create).mockResolvedValue(notif as any);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `user-${DESIGNER_ID}`,
      "new-notification",
      expect.objectContaining({ id: "notif-2" })
    );
  });

  it("NIE triggeruje Pushera z powiadomieniem gdy projektant komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Projektant",
    }));

    const notifTriggers = vi.mocked(pusherServer.trigger).mock.calls.filter(
      (call) => call[1] === "new-notification"
    );
    expect(notifTriggers).toHaveLength(0);
  });

  it("zwraca 400 gdy brak wymaganych pól", async () => {
    const res = await PostListComment(makeRequest("POST", { content: "Treść" }));
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Pełny payload Pushera — PATCH /api/calendar/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe("Payload Pushera — PATCH /api/calendar/[id] (nowi goście)", () => {
  const mockNotif = {
    id: "notif-cal-1",
    userId: "guest-user-2",
    message: `Projektant zaprosił/a Cię do wydarzenia: „Spotkanie projektowe"`,
    link: "/kalendarz",
    type: "info",
    read: false,
    createdAt: new Date("2025-01-15T10:00:00Z"),
  };

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.calendarEvent.findFirst).mockResolvedValue(mockCalendarEvent as any);
    vi.mocked(prisma.calendarEvent.update).mockResolvedValue({
      ...mockCalendarEvent,
      guests: [
        { id: "g1", userId: "guest-user-1" },
        { id: "g2", userId: "guest-user-2" },
      ],
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Projektant", email: "p@test.com" } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue(mockNotif as any);
  });

  it("wysyła pełny obiekt notyfikacji przez Pusher — nie pusty {}", async () => {
    const res = await PatchCalendarEvent(
      makeRequest("PATCH", {
        title: "Spotkanie projektowe",
        guests: [
          { name: "Gość 1", email: "g1@test.com", userId: "guest-user-1" },
          { name: "Gość 2", email: "g2@test.com", userId: "guest-user-2" },
        ],
      }),
      makeParams({ id: "ev-1" })
    );

    expect(res.status).toBe(200);

    const notifTriggers = vi.mocked(pusherServer.trigger).mock.calls.filter(
      (call) => call[1] === "new-notification"
    );
    expect(notifTriggers).toHaveLength(1);

    const payload = notifTriggers[0][2] as any;
    expect(payload).not.toEqual({});
    expect(payload.id).toBe("notif-cal-1");
    expect(payload.message).toContain("Spotkanie projektowe");
    expect(payload.link).toBe("/kalendarz");
    // createdAt musi być stringiem ISO
    expect(typeof payload.createdAt).toBe("string");
    expect(payload.createdAt).toBe("2025-01-15T10:00:00.000Z");
  });

  it("nie wysyła powiadomień gdy żaden nowy gość (wszyscy już byli)", async () => {
    // guest-user-1 był już w previousGuestUserIds — brak nowych
    vi.mocked(prisma.calendarEvent.update).mockResolvedValue({
      ...mockCalendarEvent,
      guests: [{ id: "g1", userId: "guest-user-1" }],
    } as any);

    await PatchCalendarEvent(
      makeRequest("PATCH", {
        title: "Spotkanie projektowe",
        guests: [{ name: "Gość 1", email: "g1@test.com", userId: "guest-user-1" }],
      }),
      makeParams({ id: "ev-1" })
    );

    expect(prisma.notification.create).not.toHaveBeenCalled();
    const notifTriggers = vi.mocked(pusherServer.trigger).mock.calls.filter(
      (call) => call[1] === "new-notification"
    );
    expect(notifTriggers).toHaveLength(0);
  });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PatchCalendarEvent(makeRequest("PATCH", {}), makeParams({ id: "ev-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy wydarzenie nie istnieje", async () => {
    vi.mocked(prisma.calendarEvent.findFirst).mockResolvedValue(null);
    const res = await PatchCalendarEvent(makeRequest("PATCH", {}), makeParams({ id: "ev-1" }));
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Cleanup starych powiadomień — GET /api/notifications
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cleanup starych powiadomień — GET /api/notifications", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      { id: "n1", message: "Nowy", read: false, createdAt: new Date() },
      { id: "n2", message: "Stary", read: true, createdAt: new Date("2020-01-01") },
    ] as any);
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 1 } as any);
  });

  it("wywołuje deleteMany dla starych przeczytanych powiadomień", async () => {
    const res = await GetNotifications();
    expect(res.status).toBe(200);

    // Non-blocking — czekamy na microtask queue
    await new Promise((r) => setTimeout(r, 10));

    expect(prisma.notification.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: SESSION.user.id,
          read: true,
          createdAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      })
    );
  });

  it("deleteMany używa cutoff ~30 dni wstecz", async () => {
    await GetNotifications();
    await new Promise((r) => setTimeout(r, 10));

    const call = vi.mocked(prisma.notification.deleteMany).mock.calls[0][0];
    const cutoff = (call as any).where.createdAt.lt as Date;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Tolerancja 1 sekundy
    expect(Math.abs(cutoff.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(1000);
  });

  it("GET zwraca powiadomienia nawet gdy deleteMany rzuca błąd", async () => {
    vi.mocked(prisma.notification.deleteMany).mockRejectedValue(new Error("DB error"));

    const res = await GetNotifications();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GetNotifications();
    expect(res.status).toBe(401);
  });

  it("zwraca tylko 50 ostatnich powiadomień", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `n${i}`, message: `Powiadomienie ${i}`, read: false, createdAt: new Date(),
      })) as any
    );

    const res = await GetNotifications();
    const body = await res.json();

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
    expect(body).toHaveLength(50);
  });
});
