/**
 * Testy braku agregacji do Dyskusji
 *
 * Dyskusje są osobną przestrzenią do rozmów projektant–klient.
 * Komentarze do renderów ani komentarze do produktów na listach
 * NIE są już automatycznie agregowane do wątków dyskusji.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, SESSION } from "../helpers";

// ── Mocki ─────────────────────────────────────────────────────────────────────

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
    notification: { create: vi.fn() },
    listProductComment: { create: vi.fn() },
    listProduct: { findUnique: vi.fn() },
  },
}));

import { POST as PostComment } from "@/app/api/comments/route";
import { POST as PostListComment } from "@/app/api/list-comments/route";

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

// ── Dane testowe ──────────────────────────────────────────────────────────────

const DESIGNER_ID = SESSION.user.id;

const mockRender = {
  id: "r1",
  name: "Salon render",
  fileUrl: "http://cdn/render.jpg",
  projectId: "proj-1",
  project: {
    id: "proj-1",
    title: "Projekt Test",
    userId: DESIGNER_ID,
    user: { requirePinTitle: false, maxPinsPerRender: null },
  },
};

const mockComment = {
  id: "c1",
  renderId: "r1",
  content: "Treść",
  author: "Klient",
  posX: null,
  posY: null,
  isInternal: false,
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

const mockListComment = {
  id: "lc-1",
  productId: "prod-1",
  content: "Treść",
  author: "Klient",
  replies: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null);
  vi.mocked(getWorkspaceUserId).mockReturnValue(DESIGNER_ID);
  vi.mocked(prisma.render.findUnique).mockResolvedValue(mockRender as any);
  vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
  vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);
  vi.mocked(prisma.listProductComment.create).mockResolvedValue(mockListComment as any);
  vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(mockProduct as any);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. POST /api/comments — brak agregacji do dyskusji
// ═══════════════════════════════════════════════════════════════════════════════

describe("Dyskusje — POST /api/comments (brak agregacji)", () => {
  it("NIE tworzy DiscussionMessage gdy klient komentuje", async () => {
    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
    expect(prisma.discussion.findUnique).not.toHaveBeenCalled();
    expect(prisma.discussion.create).not.toHaveBeenCalled();
  });

  it("NIE tworzy DiscussionMessage gdy projektant komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Uwaga projektanta", author: "Projektant",
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("NIE tworzy DiscussionMessage gdy komentarz jest pinem", async () => {
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, posX: 30, posY: 50,
    } as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Pin klienta", author: "Klient", posX: 30, posY: 50,
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("NIE tworzy DiscussionMessage gdy komentarz wewnętrzny", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Notatka wewnętrzna", author: "Projektant", isInternal: true,
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("zwraca 201 po dodaniu komentarza", async () => {
    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. POST /api/list-comments — brak agregacji do dyskusji
// ═══════════════════════════════════════════════════════════════════════════════

describe("Dyskusje — POST /api/list-comments (brak agregacji)", () => {
  it("NIE tworzy DiscussionMessage gdy lista jest powiązana z projektem", async () => {
    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
    expect(prisma.discussion.findUnique).not.toHaveBeenCalled();
    expect(prisma.discussion.create).not.toHaveBeenCalled();
  });

  it("NIE tworzy DiscussionMessage gdy lista nie ma projectId", async () => {
    vi.mocked(prisma.listProduct.findUnique).mockResolvedValue({
      ...mockProduct,
      section: {
        list: { ...mockProduct.section.list, projectId: null, project: null },
      },
    } as any);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("zwraca 201 po dodaniu komentarza do produktu", async () => {
    const res = await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
  });
});
