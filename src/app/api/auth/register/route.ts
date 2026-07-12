import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendActivationEmail, notifyAdminNewUser } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
  // 5 registration attempts per IP per minute
  if (!rateLimit(`register:${getClientIp(req)}`, 5)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj ponownie za chwilę." }, { status: 429 });
  }

  const { fullName, name, email, password, locale } = await req.json();

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Hasło nie spełnia wymagań bezpieczeństwa" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email już zarejestrowany" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const activationToken = crypto.randomBytes(32).toString("hex");
  const activationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      name: name?.trim() || null,
      email,
      password: hashed,
      navMode: "sidebar",
      trialEndsAt,
      activationToken,
      activationTokenExpiry,
    },
  });

  const safeLocale: "pl" | "en" = locale === "en" ? "en" : "pl";
  // Fire emails in background — do not block the response
  sendActivationEmail({ to: email, token: activationToken, locale: safeLocale })
    .catch((err) => console.error("[register] sendActivationEmail error:", err));
  notifyAdminNewUser({ fullName: fullName.trim(), email, createdAt: user.createdAt })
    .catch((err) => console.error("[register] notifyAdminNewUser error:", err));

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("[register] unhandled error:", err);
    return NextResponse.json({ error: "Błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
