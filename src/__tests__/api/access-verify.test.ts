import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/access-token", () => ({
  verifyAccessToken: vi.fn(),
}));

import { GET } from "@/app/api/access/verify/route";
import { verifyAccessToken } from "@/lib/access-token";
import { makeRequest } from "../helpers";

function makeGet(token?: string) {
  const url = token
    ? `http://localhost:3000/api/access/verify?token=${encodeURIComponent(token)}`
    : "http://localhost:3000/api/access/verify";
  const { NextRequest } = require("next/server");
  return new NextRequest(url, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/access/verify", () => {
  it("returns 400 when token param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("not_found");
  });

  it("returns ok:true for a valid token", async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ ok: true, userId: "u-1", tokenId: "t-1" });
    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns ok:false with reason for an expired token", async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ ok: false, reason: "expired" });
    const res = await GET(makeGet("expired-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("expired");
  });

  it("returns ok:false with reason for a revoked token", async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ ok: false, reason: "revoked" });
    const res = await GET(makeGet("revoked-token"));
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("revoked");
  });

  it("returns ok:false with reason not_found for unknown token", async () => {
    vi.mocked(verifyAccessToken).mockResolvedValue({ ok: false, reason: "not_found" });
    const res = await GET(makeGet("unknown-token"));
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.reason).toBe("not_found");
  });
});
