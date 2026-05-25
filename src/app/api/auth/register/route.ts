import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // 5 registration attempts per IP per minute
  if (!rateLimit(`register:${getClientIp(req)}`, 5)) {
    return NextResponse.json({ error: "Za dużo prób. Spróbuj ponownie za chwilę." }, { status: 429 });
  }

  const { fullName, name, email, password } = await req.json();

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
  const user = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      name: name?.trim() || null,
      email,
      password: hashed,
      navMode: "sidebar",
      trialEndsAt,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
