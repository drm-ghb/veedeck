import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    accessToken: { updateMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/access-token", () => ({
  createAccessToken: vi.fn().mockResolvedValue("raw-token-abc"),
  buildAccessLink: vi.fn().mockReturnValue("http://localhost:3000/p/raw-token-abc"),
}));

vi.mock("@/lib/email", () => ({
  sendAccessLinkEmail: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/access/request/route";
import { prisma } from "@/lib/prisma";
import { createAccessToken } from "@/lib/access-token";
import { sendAccessLinkEmail } from "@/lib/email";
import { makeRequest } from "../helpers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/access/request", () => {
  it("returns 200 for malformed body (silent)", async () => {
    const req = new (require("next/server").NextRequest)("http://localhost/api/access/request", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 200 for missing email (no-op)", async () => {
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(200);
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("returns 200 for invalid email format (no-op)", async () => {
    const res = await POST(makeRequest("POST", { email: "not-an-email" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("returns 200 when user does not exist (no-op, no enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { email: "ghost@test.com" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).not.toHaveBeenCalled();
    expect(sendAccessLinkEmail).not.toHaveBeenCalled();
  });

  it("returns 200 for designer role (no-op — designers use /login)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "d-1", name: "Designer", role: "designer", email: "designer@test.com",
    } as any);
    const res = await POST(makeRequest("POST", { email: "designer@test.com" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("sends magic link for a client with valid email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "c-1", name: "Jan Kowalski", role: "client", email: "jan@test.com",
    } as any);
    const res = await POST(makeRequest("POST", { email: "jan@test.com" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).toHaveBeenCalledWith("c-1");
    expect(sendAccessLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jan@test.com", personName: "Jan Kowalski" })
    );
  });

  it("sends magic link for a contractor with valid email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "w-1", name: "Firma Bud", role: "contractor", email: "firma@test.com",
    } as any);
    const res = await POST(makeRequest("POST", { email: "firma@test.com" }));
    expect(res.status).toBe(200);
    expect(createAccessToken).toHaveBeenCalledWith("w-1");
    expect(sendAccessLinkEmail).toHaveBeenCalled();
  });

  it("returns 200 even when internal error occurs (no enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest("POST", { email: "test@test.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
