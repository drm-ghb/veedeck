import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  generateRawToken,
  hashToken,
  createAccessToken,
  verifyAccessToken,
  extendTokenExpiry,
  buildAccessLink,
  revokeUserTokens,
  recordPinFailure,
} from "@/lib/access-token";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── generateRawToken ─────────────────────────────────────────────────────────

describe("generateRawToken", () => {
  it("returns a non-empty string", () => {
    const token = generateRawToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("returns unique values each call", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

// ── hashToken ─────────────────────────────────────────────────────────────────

describe("hashToken", () => {
  it("returns a 64-char hex string (sha256)", () => {
    const hash = hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });
});

// ── createAccessToken ─────────────────────────────────────────────────────────

describe("createAccessToken", () => {
  it("revokes previous tokens and creates a new one", async () => {
    vi.mocked(prisma.accessToken.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.accessToken.create).mockResolvedValue({} as any);

    const raw = await createAccessToken("user-1");

    expect(prisma.accessToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", purpose: "access", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.accessToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        purpose: "access",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(20);
  });

  it("stores a hash, not the raw token", async () => {
    vi.mocked(prisma.accessToken.updateMany).mockResolvedValue({ count: 0 });
    let storedHash = "";
    vi.mocked(prisma.accessToken.create).mockImplementation(async ({ data }) => {
      storedHash = (data as any).tokenHash;
      return {} as any;
    });

    const raw = await createAccessToken("user-2");
    expect(storedHash).toBe(hashToken(raw));
    expect(storedHash).not.toBe(raw);
  });
});

// ── verifyAccessToken ─────────────────────────────────────────────────────────

describe("verifyAccessToken", () => {
  it("returns ok:false reason:not_found when token does not exist", async () => {
    vi.mocked(prisma.accessToken.findUnique).mockResolvedValue(null);
    const result = await verifyAccessToken("nonexistent");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns ok:false reason:revoked when revokedAt is set", async () => {
    vi.mocked(prisma.accessToken.findUnique).mockResolvedValue({
      id: "tok-1", userId: "u-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      pinFailures: 0,
    } as any);
    const result = await verifyAccessToken("some-token");
    expect(result).toEqual({ ok: false, reason: "revoked" });
  });

  it("returns ok:false reason:expired when token is past expiry", async () => {
    vi.mocked(prisma.accessToken.findUnique).mockResolvedValue({
      id: "tok-2", userId: "u-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      pinFailures: 0,
    } as any);
    const result = await verifyAccessToken("some-token");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns ok:false reason:pin_locked when pinFailures >= 5", async () => {
    vi.mocked(prisma.accessToken.findUnique).mockResolvedValue({
      id: "tok-3", userId: "u-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      pinFailures: 5,
    } as any);
    const result = await verifyAccessToken("some-token");
    expect(result).toEqual({ ok: false, reason: "pin_locked" });
  });

  it("returns ok:true with userId and tokenId for a valid token", async () => {
    vi.mocked(prisma.accessToken.findUnique).mockResolvedValue({
      id: "tok-4", userId: "u-42",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      pinFailures: 0,
    } as any);
    const result = await verifyAccessToken("valid-token");
    expect(result).toEqual({ ok: true, userId: "u-42", tokenId: "tok-4" });
  });
});

// ── extendTokenExpiry ─────────────────────────────────────────────────────────

describe("extendTokenExpiry", () => {
  it("updates expiresAt, lastUsedAt and resets pinFailures", async () => {
    vi.mocked(prisma.accessToken.update).mockResolvedValue({} as any);
    await extendTokenExpiry("tok-99");
    expect(prisma.accessToken.update).toHaveBeenCalledWith({
      where: { id: "tok-99" },
      data: {
        expiresAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
        pinFailures: 0,
      },
    });
    // Expiry should be ~180 days from now
    const call = vi.mocked(prisma.accessToken.update).mock.calls[0][0];
    const expiresAt = (call.data as any).expiresAt as Date;
    const diffDays = (expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(179);
    expect(diffDays).toBeLessThan(181);
  });
});

// ── buildAccessLink ───────────────────────────────────────────────────────────

describe("buildAccessLink", () => {
  it("builds a /p/<token> URL", () => {
    const link = buildAccessLink("my-token");
    expect(link).toContain("/p/");
    expect(link).toContain("my-token");
  });
});

// ── revokeUserTokens ──────────────────────────────────────────────────────────

describe("revokeUserTokens", () => {
  it("revokes all active tokens for the user", async () => {
    vi.mocked(prisma.accessToken.updateMany).mockResolvedValue({ count: 2 });
    await revokeUserTokens("user-5");
    expect(prisma.accessToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-5", purpose: "access", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

// ── recordPinFailure ──────────────────────────────────────────────────────────

describe("recordPinFailure", () => {
  it("increments pinFailures and returns the new count", async () => {
    vi.mocked(prisma.accessToken.update).mockResolvedValue({ pinFailures: 3 } as any);
    const count = await recordPinFailure("tok-abc");
    expect(count).toBe(3);
    expect(prisma.accessToken.update).toHaveBeenCalledWith({
      where: { id: "tok-abc" },
      data: { pinFailures: { increment: 1 } },
      select: { pinFailures: true },
    });
  });
});
