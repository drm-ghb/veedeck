/**
 * Access token library — passwordless panel entry for clients and contractors.
 *
 * Security model:
 *  - Raw token: crypto.randomBytes(32).toString("base64url") — 256 bits of entropy
 *  - DB stores only sha256(rawToken) — token in plaintext never persists
 *  - Sliding window: every successful use extends expiresAt by +180 days
 *  - Revocation: revokeUserTokens() sets revokedAt on all purpose:"access" tokens for that user
 *  - New token generation revokes all previous tokens for the same (userId, purpose) pair
 *
 * GDPR note:
 *  Access tokens are high-entropy (256 bits), expire after 180 days of inactivity,
 *  can be revoked instantly, and optionally protected by a 4-digit PIN per project.
 *  This model meets the security bar for accessing personal project data (budgets,
 *  renders, documents) without a password.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SLIDING_WINDOW_DAYS = 180;

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Create a new access token for a user. Revokes all previous access tokens for that user. */
export async function createAccessToken(userId: string, projectId?: string): Promise<string> {
  // Revoke all previous access tokens for this user
  await prisma.accessToken.updateMany({
    where: { userId, purpose: "access", revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const now = new Date();
  const expiresAt = addDays(now, SLIDING_WINDOW_DAYS);

  await prisma.accessToken.create({
    data: { userId, projectId: projectId ?? null, tokenHash, purpose: "access", expiresAt },
  });

  return raw;
}

/** Return existing active token record (for copy-link — don't regenerate if still valid). */
export async function getActiveAccessToken(userId: string): Promise<{ tokenHash: string; expiresAt: Date } | null> {
  const rec = await prisma.accessToken.findFirst({
    where: {
      userId,
      purpose: "access",
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  return rec ? { tokenHash: rec.tokenHash, expiresAt: rec.expiresAt } : null;
}

export type VerifyResult =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "not_found" | "revoked" | "expired" | "pin_locked" };

/** Verify a raw access token. Does NOT extend expiry — call extendTokenExpiry after PIN if needed. */
export async function verifyAccessToken(raw: string): Promise<VerifyResult> {
  const tokenHash = hashToken(raw);

  const rec = await prisma.accessToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true, pinFailures: true },
  });

  if (!rec) return { ok: false, reason: "not_found" };
  if (rec.revokedAt) return { ok: false, reason: "revoked" };
  if (rec.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (rec.pinFailures >= 5) return { ok: false, reason: "pin_locked" };

  return { ok: true, userId: rec.userId, tokenId: rec.id };
}

/** Extend expiry by another 180 days from now and update lastUsedAt. */
export async function extendTokenExpiry(tokenId: string): Promise<void> {
  await prisma.accessToken.update({
    where: { id: tokenId },
    data: {
      expiresAt: addDays(new Date(), SLIDING_WINDOW_DAYS),
      lastUsedAt: new Date(),
      pinFailures: 0,
    },
  });
}

/** Record a failed PIN attempt. Returns updated failure count. */
export async function recordPinFailure(tokenId: string): Promise<number> {
  const rec = await prisma.accessToken.update({
    where: { id: tokenId },
    data: { pinFailures: { increment: 1 } },
    select: { pinFailures: true },
  });
  return rec.pinFailures;
}

/** Revoke a single token (e.g. designer clicking "Revoke access"). */
export async function revokeToken(tokenId: string): Promise<void> {
  await prisma.accessToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

/** Revoke all access tokens for a user. */
export async function revokeUserTokens(userId: string): Promise<void> {
  await prisma.accessToken.updateMany({
    where: { userId, purpose: "access", revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

/** Build the full /p/<rawToken> URL that is sent to the user. */
export function buildAccessLink(rawToken: string): string {
  return `${APP_URL}/p/${encodeURIComponent(rawToken)}`;
}
