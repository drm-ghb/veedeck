import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id, clientId } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const client = await prisma.projectClient.findFirst({
    where: { id: clientId, projectId: id },
    include: { user: true },
  });
  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  const body = await req.json();
  const { isMainContact, email, phone, startDate, endDate, login: newLogin, password: newPassword } = body;

  // Handle login/password change for client account
  if (newLogin !== undefined || newPassword !== undefined) {
    if (!client.userId || !client.user) {
      return NextResponse.json({ error: "Ten klient nie ma konta użytkownika" }, { status: 400 });
    }

    const userUpdateData: Record<string, unknown> = {};

    if (newLogin !== undefined) {
      const loginTrimmed = newLogin.trim();
      if (!loginTrimmed) return NextResponse.json({ error: "Login nie może być pusty" }, { status: 400 });

      const existing = await prisma.user.findFirst({
        where: { login: loginTrimmed, id: { not: client.userId } },
      });
      if (existing) return NextResponse.json({ error: `Login "${loginTrimmed}" jest już zajęty` }, { status: 409 });

      const newEmail = `${loginTrimmed}@client.internal`;
      const existingEmail = await prisma.user.findFirst({
        where: { email: newEmail, id: { not: client.userId } },
      });
      if (existingEmail) return NextResponse.json({ error: `Login "${loginTrimmed}" jest już zajęty` }, { status: 409 });

      userUpdateData.login = loginTrimmed;
      userUpdateData.email = newEmail;
    }

    if (newPassword !== undefined && newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 });
      }
      userUpdateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({ where: { id: client.userId }, data: userUpdateData });
    }
  }

  // Always update contact fields and dates if provided
  const clientUpdateData: Record<string, unknown> = {};
  if (email !== undefined) clientUpdateData.email = email?.trim() || null;
  if (phone !== undefined) clientUpdateData.phone = phone?.trim() || null;
  if (startDate !== undefined) clientUpdateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) clientUpdateData.endDate = endDate ? new Date(endDate) : null;

  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: { projectId: id },
      data: { isMainContact: false },
    });
    clientUpdateData.isMainContact = true;
  }

  const updated = await prisma.projectClient.update({
    where: { id: clientId },
    data: Object.keys(clientUpdateData).length > 0 ? clientUpdateData : {},
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  if (isMainContact || (updated.isMainContact && (email !== undefined || phone !== undefined))) {
    await prisma.project.update({
      where: { id },
      data: {
        ...(isMainContact ? { clientName: updated.name } : {}),
        clientEmail: updated.email ?? null,
        clientPhone: updated.phone ?? null,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id, clientId } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const client = await prisma.projectClient.findFirst({
    where: { id: clientId, projectId: id },
    include: { user: true },
  });
  if (!client) return NextResponse.json({ error: "Nie znaleziono klienta" }, { status: 404 });

  await prisma.projectClient.deleteMany({ where: { id: clientId, projectId: id } });

  // Also delete the client User account if it's not linked to any other projects
  if (client.userId) {
    const otherLinks = await prisma.projectClient.count({ where: { userId: client.userId } });
    if (otherLinks === 0) {
      await prisma.user.delete({ where: { id: client.userId } });
    }
  }

  if (client.isMainContact) {
    await prisma.project.update({
      where: { id },
      data: { clientName: null, clientEmail: null, clientPhone: null },
    });
  }

  return NextResponse.json({ success: true });
}
