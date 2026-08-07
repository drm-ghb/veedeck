import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  if (contractor.userId) return NextResponse.json({ error: "Wykonawca ma już konto" }, { status: 409 });

  const { email, password: providedPassword, login: customLogin } = await req.json();
  // Generate a random password if none provided — contractor uses magic links
  const password = providedPassword?.trim() && providedPassword.trim().length >= 4
    ? providedPassword.trim()
    : Math.random().toString(36).slice(2, 10) + "Aa1!";

  let userId: string;

  if (email?.trim()) {
    const emailLogin = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Użytkownik z tym adresem e-mail już istnieje" }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const newUser = await prisma.user.create({
      data: {
        name: contractor.name,
        email: emailLogin,
        login: emailLogin,
        password: hashedPassword,
        role: "contractor",
        phone: contractor.phone ?? null,
        contactEmail: emailLogin,
      },
    });
    userId = newUser.id;
  } else {
    const baseLogin = customLogin?.trim() || generateClientLogin(contractor.name);
    if (!baseLogin) {
      return NextResponse.json({ error: "Nie można wygenerować loginu — podaj adres e-mail lub login" }, { status: 400 });
    }
    const internalEmail = `${baseLogin}@contractor.internal`;
    const [existingLogin, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { login: baseLogin } }),
      prisma.user.findFirst({ where: { email: internalEmail } }),
    ]);
    if (existingLogin || existingEmail) {
      return NextResponse.json({ error: `Login "${baseLogin}" jest już zajęty` }, { status: 409 });
    }
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const newUser = await prisma.user.create({
      data: {
        name: contractor.name,
        email: internalEmail,
        login: baseLogin,
        password: hashedPassword,
        role: "contractor",
        phone: contractor.phone ?? null,
        contactEmail: null,
      },
    });
    userId = newUser.id;
  }

  const updated = await prisma.contractor.update({
    where: { id },
    data: { userId },
    include: { user: { select: { id: true, login: true, email: true, firstLoginAt: true } } },
  });

  const user = updated.user
    ? { ...updated.user, firstLoginAt: updated.user.firstLoginAt?.toISOString() ?? null }
    : null;
  return NextResponse.json({ user }, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });

  await prisma.contractor.update({
    where: { id },
    data: { userId: null },
  });

  return NextResponse.json({ ok: true });
}
