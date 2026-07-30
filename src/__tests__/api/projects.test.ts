import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/projects/route";
import { makeRequest, SESSION } from "../helpers";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null), // dla uniqueSlug
      update: vi.fn(),
    },
    projectClient: {
      create: vi.fn(),
    },
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "client-1" }),
    },
    groupMember: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    projectAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/projects", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("zwraca listę projektów", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: "p1", title: "Projekt A" },
      { id: "p2", title: "Projekt B" },
    ] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe("Projekt A");
  });
});

describe("POST /api/projects", () => {
  it("zwraca 401 bez sesji", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { title: "Test" }));
    expect(res.status).toBe(401);
  });

  it("zwraca 400 gdy brak tytułu", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    const res = await POST(makeRequest("POST", { title: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Tytuł jest wymagany");
  });

  it("tworzy projekt i zwraca 201", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "p1",
      title: "Nowy projekt",
      userId: SESSION.user.id,
    } as any);

    const res = await POST(makeRequest("POST", {
      title: "Nowy projekt",
      clientName: "Jan Kowalski",
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Nowy projekt");
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Nowy projekt",
          userId: SESSION.user.id,
        }),
      })
    );
  });
});
