import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvitationEmail } from "@/lib/email";
import { getWorkspaceUserId } from "@/lib/workspace";

// GET — lista zaproszeń (PENDING) + członkowie zespołu
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);

  const [invitations, members] = await Promise.all([
    prisma.invitation.findMany({
      where: { designerId: ownerId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { ownerId },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ invitations, members });
}

// POST — wyślij zaproszenie
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Podaj adres e-mail" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  // Sprawdź czy użytkownik już istnieje w systemie
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "Użytkownik z tym adresem już istnieje w systemie" }, { status: 409 });
  }

  // Sprawdź czy zaproszenie już istnieje
  const existingInvite = await prisma.invitation.findFirst({
    where: { email: normalized, designerId: ownerId, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "Zaproszenie dla tego adresu zostało już wysłane" }, { status: 409 });
  }

  const designer = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dni

  const invitation = await prisma.invitation.create({
    data: { email: normalized, designerId: ownerId, expiresAt },
  });

  await sendInvitationEmail({
    to: normalized,
    designerName: designer?.name || designer?.email || "Projektant",
    token: invitation.token,
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
