import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

// Always return neutral response — never reveal whether email exists
const NEUTRAL = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!rateLimit(`forgot-ip:${ip}`, 5)) return NEUTRAL;

  let email: string;
  let locale: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").toLowerCase().trim();
    locale = body.locale ?? "pl";
  } catch {
    return NEUTRAL;
  }

  if (!email || !email.includes("@")) return NEUTRAL;

  // Per-email rate limit (prevents spam to a single address)
  if (!rateLimit(`forgot-email:${email}`, 2)) return NEUTRAL;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      // Invalidate all existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Generate token (plaintext sent in URL, only hash stored in DB)
      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 min

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const resetUrl = `${APP_URL}/reset-hasla?token=${encodeURIComponent(token)}`;
      const safeLocale: "pl" | "en" = locale === "en" ? "en" : "pl";

      await sendPasswordResetEmail({ to: user.email!, resetUrl, locale: safeLocale });
    }
  } catch (err) {
    console.error("[forgot-password]", err);
  }

  return NEUTRAL;
}
