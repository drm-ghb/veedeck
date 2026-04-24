/**
 * Testy agregacji Dyskusji
 *
 * Pokrycie:
 * 1. POST /api/comments  → DiscussionMessage dla komentarzy i pinów z renderów
 * 2. POST /api/list-comments → DiscussionMessage dla komentarzy z list zakupowych
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
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

// ── Dane testowe ──────────────────────────────────────────────────────────────

const DESIGNER_ID = SESSION.user.id;
const DISCUSSION_ID = "disc-1";

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

const mockDiscussion = {
  id: DISCUSSION_ID,
  title: "Projekt Test",
  type: "project",
  projectId: "proj-1",
};

const mockDiscussionMessage = {
  id: "msg-1",
  discussionId: DISCUSSION_ID,
  content: "Treść",
  authorName: "Klient",
  sourceType: "render_comment",
  sourceId: "c1",
  userId: null,
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
  vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
  vi.mocked(prisma.discussionMessage.create).mockResolvedValue(mockDiscussionMessage as any);
  vi.mocked(prisma.listProductComment.create).mockResolvedValue(mockListComment as any);
  vi.mocked(prisma.listProduct.findUnique).mockResolvedValue(mockProduct as any);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Dyskusje z komentarzy w renderach — POST /api/comments
// ═══════════════════════════════════════════════════════════════════════════════

describe("Dyskusje — POST /api/comments", () => {
  it("tworzy DiscussionMessage gdy klient komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussionMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussionId: DISCUSSION_ID,
          content: "Treść",
          authorName: "Klient",
          sourceType: "render_comment",
          userId: null,
        }),
      })
    );
  });

  it("tworzy DiscussionMessage gdy projektant komentuje", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Uwaga projektanta", author: "Projektant",
    }));

    expect(prisma.discussionMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: DESIGNER_ID,
        }),
      })
    );
  });

  it("ustawia userId=null gdy komentuje klient (bez sesji)", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.userId).toBeNull();
  });

  it("ustawia userId=session.user.id gdy komentuje projektant", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Uwaga", author: "Projektant",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.userId).toBe(DESIGNER_ID);
  });

  it("sourceType = 'render_pin' gdy komentarz jest pinem", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, posX: 30, posY: 50,
    } as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Pin klienta", author: "Klient", posX: 30, posY: 50,
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.sourceType).toBe("render_pin");
  });

  it("sourceType = 'render_comment' gdy zwykły komentarz", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Zwykły komentarz", author: "Klient",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.sourceType).toBe("render_comment");
  });

  it("NIE tworzy DiscussionMessage gdy komentarz wewnętrzny (isInternal=true)", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, isInternal: true,
    } as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Notatka wewnętrzna", author: "Projektant", isInternal: true,
    }));

    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("triggeruje Pusher 'new-message' na kanale discussion po dodaniu komentarza", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `discussion-${DISCUSSION_ID}`,
      "new-message",
      expect.objectContaining({ id: "msg-1" })
    );
  });

  it("auto-tworzy Discussion gdy nie istnieje, potem dodaje DiscussionMessage", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const newDiscussion = { ...mockDiscussion, id: "disc-new" };
    vi.mocked(prisma.discussion.create).mockResolvedValue(newDiscussion as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue({
      ...mockDiscussionMessage, discussionId: "disc-new",
    } as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          type: "project",
          ownerId: DESIGNER_ID,
        }),
      })
    );
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ discussionId: "disc-new" }),
      })
    );
  });

  it("używa istniejącej Discussion gdy już istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussion.create).not.toHaveBeenCalled();
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ discussionId: DISCUSSION_ID }),
      })
    );
  });

  it("błąd agregacji dyskusji nie przerywa odpowiedzi 201", async () => {
    vi.mocked(prisma.discussion.findUnique).mockRejectedValue(new Error("DB error"));

    const res = await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });

  it("sourceUrl zawiera pinId gdy pin, chatId gdy komentarz", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.comment.count).mockResolvedValue(0);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      ...mockComment, id: "pin-1", posX: 10, posY: 20,
    } as any);

    await PostComment(makeRequest("POST", {
      renderId: "r1", content: "Pin", author: "Klient", posX: 10, posY: 20,
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.sourceUrl).toContain("pinId=pin-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Dyskusje z komentarzy na listach — POST /api/list-comments
// ═══════════════════════════════════════════════════════════════════════════════

describe("Dyskusje — POST /api/list-comments", () => {
  it("tworzy DiscussionMessage gdy lista jest powiązana z projektem", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussionMessage.create).toHaveBeenCalledTimes(1);
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          discussionId: DISCUSSION_ID,
          content: "Treść",
          authorName: "Klient",
          sourceType: "product_comment",
          userId: null,
        }),
      })
    );
  });

  it("sourceName = '{listName} › {productName}'", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.sourceName).toBe("Lista salonu › Sofa narożna");
  });

  it("ustawia userId=null gdy komentuje klient", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.userId).toBeNull();
  });

  it("ustawia userId=session.user.id gdy komentuje projektant", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Uwaga", author: "Projektant",
    }));

    const call = vi.mocked(prisma.discussionMessage.create).mock.calls[0][0];
    expect((call as any).data.userId).toBe(DESIGNER_ID);
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

  it("triggeruje Pusher 'new-message' na kanale discussion", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue({
      ...mockDiscussionMessage, id: "msg-list-1",
    } as any);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `discussion-${DISCUSSION_ID}`,
      "new-message",
      expect.objectContaining({ id: "msg-list-1" })
    );
  });

  it("auto-tworzy Discussion gdy nie istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const newDiscussion = { ...mockDiscussion, id: "disc-new" };
    vi.mocked(prisma.discussion.create).mockResolvedValue(newDiscussion as any);
    vi.mocked(prisma.discussionMessage.create).mockResolvedValue({
      ...mockDiscussionMessage, discussionId: "disc-new",
    } as any);

    await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(prisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          type: "project",
          ownerId: DESIGNER_ID,
        }),
      })
    );
    expect(prisma.discussionMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ discussionId: "disc-new" }),
      })
    );
  });

  it("błąd agregacji dyskusji nie przerywa odpowiedzi 201", async () => {
    vi.mocked(prisma.discussion.findUnique).mockRejectedValue(new Error("DB error"));

    const res = await PostListComment(makeRequest("POST", {
      productId: "prod-1", content: "Treść", author: "Klient",
    }));

    expect(res.status).toBe(201);
    expect(prisma.discussionMessage.create).not.toHaveBeenCalled();
  });
});
