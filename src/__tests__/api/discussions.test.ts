import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    discussion: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    discussionMessage: { count: vi.fn() },
    discussionParticipant: { createMany: vi.fn(), findUnique: vi.fn() },
    notification: { create: vi.fn() },
    contractorAssignment: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { GET, POST } from "@/app/api/discussions/route";

const mockDiscussionBase = {
  id: "disc-1",
  title: "Test",
  type: "internal",
  ownerId: "user-1",
  projectId: null,
  archived: false,
  updatedAt: new Date(),
  contractorAssignmentId: null,
  project: null,
  _count: { messages: 0 },
  messages: [],
  readReceipts: [],
  participants: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as any);
  vi.mocked(getWorkspaceUserId).mockReturnValue("user-1");
  vi.mocked(prisma.discussionMessage.count).mockResolvedValue(0);
  vi.mocked(prisma.notification.create).mockResolvedValue({} as any);
  vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as any);
});

// ─── GET /api/discussions ────────────────────────────────────────────────────

describe("GET /api/discussions", () => {
  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("projektant widzi własne dyskusje (where ownerId)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ownerId: null } as any);
    vi.mocked(prisma.discussion.findMany).mockResolvedValue([mockDiscussionBase] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(prisma.discussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "user-1" } })
    );
  });

  it("członek zespołu widzi tylko dyskusje gdzie jest uczestnikiem", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ownerId: "owner-1" } as any);
    vi.mocked(prisma.discussion.findMany).mockResolvedValue([]) as any;

    const res = await GET();
    expect(res.status).toBe(200);
    expect(prisma.discussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { participants: { some: { userId: "user-1" } } },
      })
    );
  });

  it("zwraca unreadCount dla każdej dyskusji", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ownerId: null } as any);
    vi.mocked(prisma.discussion.findMany).mockResolvedValue([mockDiscussionBase] as any);
    vi.mocked(prisma.discussionMessage.count).mockResolvedValue(3);

    const res = await GET();
    const body = await res.json();
    expect(body[0].unreadCount).toBe(3);
  });

  it("unreadCount = 0 gdy wszystkie przeczytane (lastReadAt nowszy)", async () => {
    const lastMsg = { id: "msg-1", createdAt: new Date("2024-01-01") };
    const discWithReceipt = {
      ...mockDiscussionBase,
      messages: [{ ...lastMsg, content: "hi", authorName: "X", userId: "x" }],
      readReceipts: [{
        lastMessageId: "msg-1",
        lastMessage: { createdAt: new Date("2024-01-01") },
      }],
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ownerId: null } as any);
    vi.mocked(prisma.discussion.findMany).mockResolvedValue([discWithReceipt] as any);
    vi.mocked(prisma.discussionMessage.count).mockResolvedValue(0);

    const res = await GET();
    const body = await res.json();
    expect(body[0].unreadCount).toBe(0);
    expect(body[0].myReadMessageId).toBe("msg-1");
  });

  it("include participants w zapytaniu", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ownerId: null } as any);
    vi.mocked(prisma.discussion.findMany).mockResolvedValue([]) as any;

    await GET();
    expect(prisma.discussion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          participants: expect.objectContaining({ include: expect.any(Object) }),
        }),
      })
    );
  });
});

// ─── POST /api/discussions ───────────────────────────────────────────────────

describe("POST /api/discussions", () => {
  const mockCreated = { id: "disc-new", title: "Nowy wątek", type: "internal", ownerId: "user-1", projectId: null, contractorAssignmentId: null };
  const mockFull = { ...mockCreated, participants: [] };

  beforeEach(() => {
    vi.mocked(prisma.discussion.create).mockResolvedValue(mockCreated as any);
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockFull as any);
    vi.mocked(prisma.discussionParticipant.createMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Jan", fullName: "Jan Kowalski" } as any);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { title: "Test" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak tytułu", async () => {
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("tworzy dyskusję wewnętrzną bez projektu", async () => {
    const res = await POST(makeRequest("POST", { title: "Wątek", type: "internal" }));
    expect(res.status).toBe(201);
    expect(prisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "Wątek", ownerId: "user-1" }) })
    );
  });

  it("tworzy dyskusję projektową z projectId", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: "proj-1" } as any);
    const res = await POST(makeRequest("POST", { title: "Projekt", type: "project", projectId: "proj-1" }));
    expect(res.status).toBe(201);
    expect(prisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ projectId: "proj-1" }) })
    );
  });

  it("zwraca 404 gdy projekt nie istnieje", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { title: "Test", type: "project", projectId: "bad-id" }));
    expect(res.status).toBe(404);
  });

  it("tworzy dyskusję z contractorAssignmentId", async () => {
    vi.mocked(prisma.contractorAssignment.findFirst).mockResolvedValue({ id: "assign-1" } as any);
    const res = await POST(makeRequest("POST", { title: "Chat", contractorAssignmentId: "assign-1" }));
    expect(res.status).toBe(201);
    expect(prisma.discussion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ contractorAssignmentId: "assign-1", type: "contractor" }) })
    );
  });

  it("zwraca 403 gdy brak dostępu do contractorAssignment", async () => {
    vi.mocked(prisma.contractorAssignment.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { title: "Chat", contractorAssignmentId: "bad" }));
    expect(res.status).toBe(403);
  });

  it("tworzy uczestników i wysyła powiadomienia", async () => {
    const res = await POST(makeRequest("POST", {
      title: "Wątek",
      participantIds: ["member-1", "member-2"],
    }));
    expect(res.status).toBe(201);
    expect(prisma.discussionParticipant.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          { discussionId: "disc-new", userId: "member-1" },
          { discussionId: "disc-new", userId: "member-2" },
        ]),
        skipDuplicates: true,
      })
    );
    expect(pusherServer.trigger).toHaveBeenCalledWith("user-member-1", "added-to-discussion", expect.any(Object));
    expect(pusherServer.trigger).toHaveBeenCalledWith("user-member-2", "added-to-discussion", expect.any(Object));
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it("nie tworzy uczestników gdy participantIds jest puste", async () => {
    const res = await POST(makeRequest("POST", { title: "Wątek", participantIds: [] }));
    expect(res.status).toBe(201);
    expect(prisma.discussionParticipant.createMany).not.toHaveBeenCalled();
    // Pusher fires new-discussion to owner but NOT added-to-discussion for any participant
    expect(pusherServer.trigger).toHaveBeenCalledWith("user-user-1", "new-discussion", expect.any(Object));
    expect(pusherServer.trigger).not.toHaveBeenCalledWith(expect.anything(), "added-to-discussion", expect.anything());
  });

  it("nie wysyła powiadomień gdy brak uczestników", async () => {
    const res = await POST(makeRequest("POST", { title: "Wątek" }));
    expect(res.status).toBe(201);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("zawsze wysyła new-discussion do właściciela (NavSidebar subscription)", async () => {
    const res = await POST(makeRequest("POST", { title: "Wątek" }));
    expect(res.status).toBe(201);
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "user-user-1",
      "new-discussion",
      expect.objectContaining({ discussionId: "disc-new", hasMessage: false })
    );
  });
});
