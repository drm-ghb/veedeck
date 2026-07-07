import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`reset-hasla:${getClientIp(req)}`, 10)) {
    return NextResponse.json({ error: "Za dużo prób." }, { status: 429 });
  }

  let token: string;
  let password: string;
  try {
    const body = await req.json();
    token = body.token ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (!token || !password) {
    return NextResponse.json({ error: "Brakujące dane." }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Hasło nie spełnia wymagań bezpieczeństwa." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    // Save new password
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    // Mark token as used
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate remaining reset tokens
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, id: { not: record.id }, usedAt: null },
      data: { usedAt: new Date() },
    }),
    // Invalidate all active sessions
    prisma.session.deleteMany({
      where: { userId: record.userId },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
