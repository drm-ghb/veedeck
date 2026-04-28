import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceUserId: vi.fn() }));
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    discussion: { findUnique: vi.fn() },
    discussionReadReceipt: { upsert: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { POST } from "@/app/api/discussions/[id]/read/route";

const mockDiscussion = { id: "disc-1", ownerId: "user-1" };
const mockReceipt = {
  id: "receipt-1",
  discussionId: "disc-1",
  readerId: "user-1",
  readerName: "Jan Kowalski",
  readerType: "designer",
  lastMessageId: "msg-last",
  readAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as any);
  vi.mocked(getWorkspaceUserId).mockReturnValue("user-1");
  vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Jan Kowalski", email: "jan@test.com" } as any);
  vi.mocked(prisma.discussionReadReceipt.upsert).mockResolvedValue(mockReceipt as any);
});

describe("POST /api/discussions/[id]/read", () => {
  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { lastMessageId: "msg-1" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy dyskusja nie istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { lastMessageId: "msg-1" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem dyskusji", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await POST(makeRequest("POST", { lastMessageId: "msg-1" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak lastMessageId", async () => {
    const res = await POST(makeRequest("POST", {}), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(400);
  });

  it("zapisuje receipt i emituje event Pusher", async () => {
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-last" }),
      makeParams({ id: "disc-1" })
    );
    expect(res.status).toBe(200);
    expect(prisma.discussionReadReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { discussionId_readerId: { discussionId: "disc-1", readerId: "user-1" } },
        update: expect.objectContaining({ lastMessageId: "msg-last", readerName: "Jan Kowalski" }),
        create: expect.objectContaining({
          discussionId: "disc-1",
          readerId: "user-1",
          readerType: "designer",
          lastMessageId: "msg-last",
        }),
      })
    );
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "discussion-disc-1",
      "read-receipt",
      expect.objectContaining({
        readerId: "user-1",
        readerType: "designer",
        lastMessageId: "msg-last",
      })
    );
  });

  it("zwraca receipt w odpowiedzi", async () => {
    const res = await POST(makeRequest("POST", { lastMessageId: "msg-last" }), makeParams({ id: "disc-1" }));
    const body = await res.json();
    expect(body.readerId).toBe("user-1");
    expect(body.readerType).toBe("designer");
    expect(body.lastMessageId).toBe("msg-last");
  });
});
