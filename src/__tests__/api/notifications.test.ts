import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/notifications/route";
import { PATCH as PatchById } from "@/app/api/notifications/[id]/route";
import { makeRequest, makeParams, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockNotifications = [
  { id: "n1", message: "Nowy komentarz", read: false, createdAt: new Date() },
  { id: "n2", message: "Render zaakceptowany", read: true, createdAt: new Date() },
];

beforeEach(() => vi.clearAllMocks());

describe("GET /api/notifications", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("zwraca listę powiadomień", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("n1");
  });
});

describe("PATCH /api/notifications (bulk)", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { read: true }));
    expect(res.status).toBe(401);
  });

  it("oznacza wszystkie powiadomienia jako przeczytane gdy brak ids", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 } as any);

    const res = await PATCH(makeRequest("PATCH", {}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: SESSION.user.id }),
        data: { read: true },
      })
    );
  });

  it("oznacza wybrane powiadomienia gdy podano ids", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeRequest("PATCH", { ids: ["n1"], read: true }));
    expect(res.status).toBe(200);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["n1"] } }),
      })
    );
  });
});

describe("PATCH /api/notifications/[id]", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await PatchById(makeRequest("PATCH", { read: true }), makeParams({ id: "n1" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 404 gdy powiadomienie nie istnieje lub nie należy do użytkownika", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

    const res = await PatchById(makeRequest("PATCH", { read: true }), makeParams({ id: "n1" }));
    expect(res.status).toBe(404);
  });

  it("aktualizuje status powiadomienia", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotifications[0] as any);
    vi.mocked(prisma.notification.update).mockResolvedValue({ ...mockNotifications[0], read: true } as any);

    const res = await PatchById(makeRequest("PATCH", { read: true }), makeParams({ id: "n1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
