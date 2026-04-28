import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, makeParams } from "../helpers";

vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    discussionReadReceipt: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { POST } from "@/app/api/share/[token]/discussions/[id]/read/route";

const mockProject = {
  archived: false,
  shareExpiresAt: null,
  discussion: { id: "disc-1" },
};
const mockReceipt = {
  id: "receipt-1",
  discussionId: "disc-1",
  readerId: "client:Dominik",
  readerName: "Dominik",
  readerType: "client",
  lastMessageId: "msg-last",
  readAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);
  vi.mocked(prisma.discussionReadReceipt.upsert).mockResolvedValue(mockReceipt as any);
});

describe("POST /api/share/[token]/discussions/[id]/read", () => {
  it("zwraca 404 gdy projekt nie istnieje", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-1", authorName: "Dominik" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 404 gdy projekt jest zarchiwizowany", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ ...mockProject, archived: true } as any);
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-1", authorName: "Dominik" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    expect(res.status).toBe(404);
  });

  it("zwraca 410 gdy link wygasł", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      ...mockProject,
      shareExpiresAt: new Date("2000-01-01"),
    } as any);
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-1", authorName: "Dominik" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    expect(res.status).toBe(410);
  });

  it("zwraca 400 gdy brakuje lastMessageId lub authorName", async () => {
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-1" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    expect(res.status).toBe(400);
  });

  it("zapisuje receipt klienta z prefiksem 'client:' i emituje Pusher", async () => {
    const res = await POST(
      makeRequest("POST", { lastMessageId: "msg-last", authorName: "Dominik" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    expect(res.status).toBe(200);
    expect(prisma.discussionReadReceipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { discussionId_readerId: { discussionId: "disc-1", readerId: "client:Dominik" } },
        update: expect.objectContaining({ lastMessageId: "msg-last", readerName: "Dominik" }),
        create: expect.objectContaining({
          readerId: "client:Dominik",
          readerName: "Dominik",
          readerType: "client",
          lastMessageId: "msg-last",
        }),
      })
    );
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "discussion-disc-1",
      "read-receipt",
      expect.objectContaining({
        readerId: "client:Dominik",
        readerType: "client",
        lastMessageId: "msg-last",
      })
    );
  });

  it("dwie osoby (Dominik, Zuza) mają osobne klucze readerId", async () => {
    await POST(
      makeRequest("POST", { lastMessageId: "msg-1", authorName: "Dominik" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );
    await POST(
      makeRequest("POST", { lastMessageId: "msg-2", authorName: "Zuza" }),
      makeParams({ token: "tok-1", id: "disc-1" })
    );

    const calls = vi.mocked(prisma.discussionReadReceipt.upsert).mock.calls;
    expect(calls[0][0].where.discussionId_readerId.readerId).toBe("client:Dominik");
    expect(calls[1][0].where.discussionId_readerId.readerId).toBe("client:Zuza");
  });
});
