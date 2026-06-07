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
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    discussionParticipant: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { GET, POST } from "@/app/api/discussions/[id]/participants/route";
import { DELETE } from "@/app/api/discussions/[id]/participants/[userId]/route";

const mockDiscussion = {
  id: "disc-1",
  title: "Test",
  ownerId: "user-1",
  projectId: null,
  participants: [
    { userId: "member-1", user: { id: "member-1", name: "Jan", fullName: "Jan Nowak", avatarUrl: null, role: "designer" } },
  ],
};

const mockTeamMembers = [
  { id: "member-2", name: "Maria", fullName: "Maria Kowalska", avatarUrl: null, role: "designer" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as any);
  vi.mocked(getWorkspaceUserId).mockReturnValue("user-1");
  vi.mocked(prisma.discussion.findUnique).mockResolvedValue(mockDiscussion as any);
  vi.mocked(prisma.user.findMany).mockResolvedValue(mockTeamMembers as any);
  vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Jan", fullName: "Jan Kowalski" } as any);
  vi.mocked(prisma.notification.create).mockResolvedValue({} as any);
  vi.mocked(pusherServer.trigger).mockResolvedValue(undefined as any);
});

// ─── GET /api/discussions/[id]/participants ─────────────────────────────────

describe("GET /api/discussions/[id]/participants", () => {
  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy dyskusja nie istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem dyskusji", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca participants i eligibleTeamMembers", async () => {
    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.participants).toHaveLength(1);
    expect(body.participants[0].userId).toBe("member-1");
    // member-2 is not yet a participant → eligible
    expect(body.eligibleTeamMembers).toHaveLength(1);
    expect(body.eligibleTeamMembers[0].id).toBe("member-2");
  });

  it("nie zwraca w eligibleTeamMembers userId który jest już uczestnikiem", async () => {
    // member-1 is already a participant AND appears in team members
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "member-1", name: "Jan", fullName: "Jan Nowak", avatarUrl: null, role: "designer" },
      { id: "member-2", name: "Maria", fullName: "Maria Kowalska", avatarUrl: null, role: "designer" },
    ] as any);

    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    const body = await res.json();
    expect(body.eligibleTeamMembers.map((u: { id: string }) => u.id)).not.toContain("member-1");
    expect(body.eligibleTeamMembers.map((u: { id: string }) => u.id)).toContain("member-2");
  });

  it("zwraca eligibleClients z kontaktów projektu gdy dyskusja ma projectId", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue({
      ...mockDiscussion,
      projectId: "proj-1",
    } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      clientId: "client-1",
      client: {
        contacts: [
          {
            userId: "client-user-1",
            name: "Klient A",
            user: { id: "client-user-1", name: "klientA", fullName: "Klient A", avatarUrl: null, role: "client" },
          },
        ],
      },
    } as any);

    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    const body = await res.json();
    expect(body.eligibleClients).toHaveLength(1);
    expect(body.eligibleClients[0].id).toBe("client-user-1");
  });

  it("nie zwraca klienta jako eligible jeśli jest już uczestnikiem", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue({
      ...mockDiscussion,
      projectId: "proj-1",
      participants: [
        ...mockDiscussion.participants,
        { userId: "client-user-1", user: { id: "client-user-1", name: "klientA", fullName: "Klient A", avatarUrl: null, role: "client" } },
      ],
    } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      clientId: "client-1",
      client: {
        contacts: [
          {
            userId: "client-user-1",
            user: { id: "client-user-1", name: "klientA", fullName: "Klient A", avatarUrl: null, role: "client" },
          },
        ],
      },
    } as any);

    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    const body = await res.json();
    expect(body.eligibleClients).toHaveLength(0);
  });

  it("eligibleClients jest puste gdy brak projektu", async () => {
    const res = await GET(makeRequest("GET"), makeParams({ id: "disc-1" }));
    const body = await res.json();
    expect(body.eligibleClients).toHaveLength(0);
  });
});

// ─── POST /api/discussions/[id]/participants ────────────────────────────────

describe("POST /api/discussions/[id]/participants", () => {
  const mockNewParticipant = {
    userId: "member-2",
    discussionId: "disc-1",
    user: { id: "member-2", name: "Maria", fullName: "Maria Kowalska", avatarUrl: null, role: "designer" },
  };

  beforeEach(() => {
    vi.mocked(prisma.discussionParticipant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.discussionParticipant.create).mockResolvedValue(mockNewParticipant as any);
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { userId: "member-2" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem dyskusji", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await POST(makeRequest("POST", { userId: "member-2" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(403);
  });

  it("zwraca 400 gdy brak userId w body", async () => {
    const res = await POST(makeRequest("POST", {}), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(400);
  });

  it("zwraca 409 gdy uczestnik już istnieje", async () => {
    vi.mocked(prisma.discussionParticipant.findUnique).mockResolvedValue({ userId: "member-1" } as any);
    const res = await POST(makeRequest("POST", { userId: "member-1" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(409);
  });

  it("dodaje nowego uczestnika i zwraca 201", async () => {
    const res = await POST(makeRequest("POST", { userId: "member-2" }), makeParams({ id: "disc-1" }));
    expect(res.status).toBe(201);
    expect(prisma.discussionParticipant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { discussionId: "disc-1", userId: "member-2" },
      })
    );
  });

  it("wysyła powiadomienie Pusher do dodanego użytkownika", async () => {
    await POST(makeRequest("POST", { userId: "member-2" }), makeParams({ id: "disc-1" }));
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      "user-member-2",
      "added-to-discussion",
      expect.objectContaining({ discussionId: "disc-1", title: "Test" })
    );
  });

  it("tworzy powiadomienie w bazie dla dodanego użytkownika", async () => {
    await POST(makeRequest("POST", { userId: "member-2" }), makeParams({ id: "disc-1" }));
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "member-2",
          type: "discussion_added",
          link: "/dyskusje",
        }),
      })
    );
  });
});

// ─── DELETE /api/discussions/[id]/participants/[userId] ─────────────────────

describe("DELETE /api/discussions/[id]/participants/[userId]", () => {
  beforeEach(() => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue({ id: "disc-1", ownerId: "user-1" } as any);
    vi.mocked(prisma.discussionParticipant.deleteMany).mockResolvedValue({ count: 1 });
  });

  it("zwraca 401 gdy brak sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "disc-1", userId: "member-1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy dyskusja nie istnieje", async () => {
    vi.mocked(prisma.discussion.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "disc-1", userId: "member-1" }));
    expect(res.status).toBe(404);
  });

  it("zwraca 403 gdy użytkownik nie jest właścicielem dyskusji", async () => {
    vi.mocked(getWorkspaceUserId).mockReturnValue("other-user");
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "disc-1", userId: "member-1" }));
    expect(res.status).toBe(403);
  });

  it("usuwa uczestnika i zwraca ok: true", async () => {
    const res = await DELETE(makeRequest("DELETE"), makeParams({ id: "disc-1", userId: "member-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.discussionParticipant.deleteMany).toHaveBeenCalledWith({
      where: { discussionId: "disc-1", userId: "member-1" },
    });
  });
});
