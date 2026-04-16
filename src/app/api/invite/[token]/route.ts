import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — walidacja tokenu zaproszenia (publiczny)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { designer: { select: { name: true, email: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    designerName: invitation.designer.name || invitation.designer.email,
  });
}

// POST — akceptacja zaproszenia + ustawienie hasła
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password, name } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Hasło musi mieć co najmniej 6 znaków" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invitation.email,
        password: hashed,
        name: name?.trim() || null,
        ownerId: invitation.designerId,
      },
    }),
    prisma.invitation.update({
      where: { token },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
