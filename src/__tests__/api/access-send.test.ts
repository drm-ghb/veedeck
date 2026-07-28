import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    projectClient: { findFirst: vi.fn() },
    contractor: { findFirst: vi.fn() },
    accessToken: { updateMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/access-token", () => ({
  createAccessToken: vi.fn().mockResolvedValue("raw-token-xyz"),
  buildAccessLink: vi.fn().mockReturnValue("http://localhost:3000/p/raw-token-xyz"),
}));
vi.mock("@/lib/email", () => ({
  sendAccessLinkEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/access/send/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccessToken, buildAccessLink } from "@/lib/access-token";
import { sendAccessLinkEmail } from "@/lib/email";
import { makeRequest, SESSION } from "../helpers";

const DESIGNER_SESSION = { user: { id: "designer-1", email: "d@test.com" } };

beforeEach(() => {
  vi.resetAllMocks();
  // Re-apply factory defaults after reset
  vi.mocked(createAccessToken).mockResolvedValue("raw-token-xyz");
  vi.mocked(buildAccessLink).mockReturnValue("http://localhost:3000/p/raw-token-xyz");
  vi.mocked(sendAccessLinkEmail).mockResolvedValue(undefined as any);
});

describe("POST /api/access/send", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(makeRequest("POST", { userId: "u-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when userId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when target user does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { userId: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when target user has designer role", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u-2", email: "d2@test.com", name: "Designer2", role: "designer",
    } as any);
    const res = await POST(makeRequest("POST", { userId: "u-2" }));
    expect(res.status).toBe(404);
  });

  it("returns 422 when client user has no email", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u-3", email: null, name: "Client", role: "client",
    } as any);
    const res = await POST(makeRequest("POST", { userId: "u-3" }));
    expect(res.status).toBe(422);
  });

  it("returns 403 when client does not belong to this designer", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "u-4", email: "client@other.com", name: "Client", role: "client",
    } as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { userId: "u-4" }));
    expect(res.status).toBe(403);
  });

  it("sends access link for a client that belongs to this designer", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "c-1", email: "jan@test.com", name: "Jan", role: "client" } as any)
      .mockResolvedValueOnce({ name: "Designer One" } as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-1" } as any);

    const res = await POST(makeRequest("POST", { userId: "c-1" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).toHaveBeenCalledWith("c-1");
    expect(sendAccessLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jan@test.com", personName: "Jan" })
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.link).toContain("/p/");
  });

  it("sends access link for a contractor that belongs to this designer", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "w-1", email: "firma@test.com", name: "Firma Bud", role: "contractor" } as any)
      .mockResolvedValueOnce({ name: "Designer One" } as any);
    vi.mocked(prisma.contractor.findFirst).mockResolvedValue({ id: "contr-1" } as any);

    const res = await POST(makeRequest("POST", { userId: "w-1" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).toHaveBeenCalledWith("w-1");
    expect(sendAccessLinkEmail).toHaveBeenCalled();
  });

  it("returns 403 for contractor not belonging to this designer", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "w-2", email: "other@test.com", name: "Other", role: "contractor" } as any)
      .mockResolvedValueOnce({ name: "Designer One" } as any);
    vi.mocked(prisma.contractor.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest("POST", { userId: "w-2" }));
    expect(res.status).toBe(403);
  });

  it("sends link in 'en' locale when specified", async () => {
    vi.mocked(auth).mockResolvedValue(DESIGNER_SESSION as any);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: "c-2", email: "en@test.com", name: "John", role: "client" } as any)
      .mockResolvedValueOnce({ name: "Designer EN" } as any);
    vi.mocked(prisma.projectClient.findFirst).mockResolvedValue({ id: "pc-2" } as any);

    const res = await POST(makeRequest("POST", { userId: "c-2", locale: "en" }));
    expect(res.status).toBe(200);
    expect(sendAccessLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en" })
    );
  });
});
