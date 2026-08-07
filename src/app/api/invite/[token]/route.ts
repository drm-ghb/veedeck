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
    include: { designer: { select: { name: true, fullName: true, email: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  // Check if invitee already has a primary account
  const primaryAccount = await prisma.user.findFirst({
    where: { email: invitation.email, primaryAccountId: null },
    select: { id: true, name: true, fullName: true, avatarUrl: true },
  });

  const designerName = invitation.designer.fullName || invitation.designer.name || invitation.designer.email;
  const workspaceName = invitation.designer.name || invitation.designer.fullName || invitation.designer.email;

  return NextResponse.json({
    email: invitation.email,
    designerName,
    workspaceName,
    type: invitation.type,
    hasExistingAccount: !!primaryAccount,
    existingName: primaryAccount?.fullName || primaryAccount?.name || null,
    existingAvatarUrl: primaryAccount?.avatarUrl || null,
  });
}

// POST — akceptacja zaproszenia
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { password, name } = body;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { designer: { select: { name: true, fullName: true, email: true } } },
  });

  if (!invitation || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  const designerName = invitation.designer.fullName || invitation.designer.name || invitation.designer.email || "Projektant";
  const workspaceName = invitation.designer.fullName || invitation.designer.name || invitation.designer.email || "Workspace";

  let newUserId: string;

  if (invitation.type === "team_join") {
    // Existing account flow — no password needed, create a linked workspace User
    const primaryAccount = await prisma.user.findFirst({
      where: { email: invitation.email, primaryAccountId: null },
      select: { id: true, name: true, fullName: true, avatarUrl: true, password: true },
    });

    if (!primaryAccount) {
      return NextResponse.json({ error: "Nie znaleziono konta powiązanego z tym adresem" }, { status: 404 });
    }

    const displayName = name?.trim() || primaryAccount.fullName || primaryAccount.name || null;

    // Create workspace member record linked to primary account
    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        password: primaryAccount.password, // copy password so they can log in if needed
        name: displayName,
        fullName: displayName,
        avatarUrl: primaryAccount.avatarUrl,
        ownerId: invitation.designerId,
        primaryAccountId: primaryAccount.id,
        systemRole: "member",
      },
    });

    newUserId = newUser.id;
  } else {
    // New account flow — password required
    if (!password || !validatePassword(password)) {
      return NextResponse.json(
        { error: "Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę" },
        { status: 400 }
      );
    }

    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash(password, 10);
    const displayName = name?.trim() || null;

    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        password: hashed,
        name: displayName,
        ownerId: invitation.designerId,
        systemRole: "member",
      },
    });

    newUserId = newUser.id;
  }

  await prisma.$transaction([
    prisma.invitation.update({ where: { token }, data: { status: "ACCEPTED" } }),
    prisma.notification.create({
      data: {
        userId: newUserId,
        message: `Witaj w workspace ${workspaceName}! Twoje konto jest gotowe.`,
        link: "/panel-glowny",
        type: "info",
      },
    }),
    ...(invitation.groupId
      ? [prisma.groupMember.create({ data: { groupId: invitation.groupId, userId: newUserId } })]
      : []),
  ]);

  const displayName = invitation.type === "team_join"
    ? (body.name?.trim() || null)
    : (body.name?.trim() || invitation.email);

  // Powiadomienie dla projektanta
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
