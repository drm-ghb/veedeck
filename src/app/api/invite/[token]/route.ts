import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { validatePassword } from "@/lib/validation";

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

  // Validate the token first — user should see "invite expired" before "bad password"
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

  if (!password || !validatePassword(password)) {
    return NextResponse.json(
      { error: "Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę" },
      { status: 400 }
    );
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 10);

  const displayName = name?.trim() || null;
  const designerName = invitation.designer.name || invitation.designer.email || "Projektant";

  const newUser = await prisma.user.create({
    data: {
      email: invitation.email,
      password: hashed,
      name: displayName,
      ownerId: invitation.designerId,
    },
  });

  await prisma.$transaction([
    prisma.invitation.update({
      where: { token },
      data: { status: "ACCEPTED" },
    }),
    prisma.notification.create({
      data: {
        userId: newUser.id,
        message: `Witaj w zespole ${designerName}! Twoje konto jest gotowe.`,
        link: "/dashboard",
        type: "info",
      },
    }),
  ]);

  // Powiadomienie dla projektanta — osobno, żeby mieć obiekt do Pushera
  const designerNotif = await prisma.notification.create({
    data: {
      userId: invitation.designerId,
      message: `${displayName || invitation.email} dołączył/a do Twojego zespołu.`,
      link: "/ustawienia/uzytkownicy",
      type: "info",
    },
  });

  await pusherServer.trigger(`user-${invitation.designerId}`, "new-notification", {
    ...designerNotif,
    createdAt: designerNotif.createdAt.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
