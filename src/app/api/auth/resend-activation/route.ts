import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendActivationEmail } from "@/lib/email";

// Neutral response — never reveal whether email exists in system
const NEUTRAL = NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  if (!rateLimit(`resend-activation:${getClientIp(req)}`, 3)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj ponownie za chwilę." }, { status: 429 });
  }

  const { email, locale } = await req.json();
  if (!email || typeof email !== "string") return NEUTRAL;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, activationToken: true, email: true },
  });

  // Always return neutral response — don't leak whether email exists
  if (!user || !user.activationToken) return NEUTRAL;

  const activationToken = crypto.randomBytes(32).toString("hex");
  const activationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { activationToken, activationTokenExpiry },
  });

  const safeLocale: "pl" | "en" = locale === "en" ? "en" : "pl";
  try {
    await sendActivationEmail({ to: user.email!, token: activationToken, locale: safeLocale });
  } catch (err) {
    console.error("[resend-activation] sendActivationEmail error:", err);
  }

  return NEUTRAL;
}
