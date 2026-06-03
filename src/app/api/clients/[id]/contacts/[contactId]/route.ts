import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  const { id, contactId } = await params;

  const client = await prisma.client.findFirst({ where: { id, designerId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const contact = await prisma.projectClient.findFirst({
    where: { id: contactId, clientId: id },
    include: { user: true },
  });
  if (!contact) return NextResponse.json({ error: "Nie znaleziono kontaktu" }, { status: 404 });

  const body = await req.json();
  const { isMainContact, email, phone, startDate, endDate, login: newLogin, password: newPassword } = body;

  if (newLogin !== undefined || newPassword !== undefined) {
    if (!contact.userId || !contact.user) {
      if (!newPassword?.trim()) {
        return NextResponse.json({ error: "Podaj hasło aby utworzyć konto" }, { status: 400 });
      }
      if (newPassword.trim().length < 4) {
        return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 });
      }

      let newUserId: string;

      if (email?.trim()) {
        const emailLogin = email.trim().toLowerCase();
        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
        });
        if (existingUser) {
          newUserId = existingUser.id;
        } else {
          try {
            const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
            const created = await prisma.user.create({
              data: {
                name: contact.name,
                email: emailLogin,
                login: emailLogin,
                password: hashedPassword,
                role: "client",
                phone: contact.phone ?? null,
                contactEmail: emailLogin,
              },
            });
            newUserId = created.id;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return NextResponse.json({ error: `Błąd bazy danych: ${msg}` }, { status: 500 });
          }
        }
      } else {
        const baseLogin = newLogin?.trim() || generateClientLogin(contact.name);
        if (!baseLogin) {
          return NextResponse.json({ error: "Nie można wygenerować loginu z imienia klienta" }, { status: 400 });
        }
        const internalEmail = `${baseLogin}@client.internal`;
        const [existingLogin, existingEmail] = await Promise.all([
          prisma.user.findUnique({ where: { login: baseLogin } }),
          prisma.user.findUnique({ where: { email: internalEmail } }),
        ]);
        if (existingLogin || existingEmail) {
          return NextResponse.json({ error: `Login "${baseLogin}" jest już zajęty` }, { status: 409 });
        }
        try {
          const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
          const created = await prisma.user.create({
            data: {
              name: contact.name,
              email: internalEmail,
              login: baseLogin,
              password: hashedPassword,
              role: "client",
              phone: contact.phone ?? null,
              contactEmail: contact.email ?? null,
            },
          });
          newUserId = created.id;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return NextResponse.json({ error: `Błąd bazy danych: ${msg}` }, { status: 500 });
        }
      }

      await prisma.projectClient.update({
        where: { id: contactId },
        data: {
          userId: newUserId,
          ...(email?.trim() ? { email: email.trim().toLowerCase() } : {}),
        },
      });

      const updated = await prisma.projectClient.findFirst({
        where: { id: contactId },
        include: { user: { select: { id: true, login: true, email: true } } },
      });
      return NextResponse.json(updated);
    }

    const userUpdateData: Record<string, unknown> = {};

    if (newLogin !== undefined) {
      const loginTrimmed = newLogin.trim();
      if (!loginTrimmed) return NextResponse.json({ error: "Login nie może być pusty" }, { status: 400 });

      const existing = await prisma.user.findFirst({
        where: { login: loginTrimmed, id: { not: contact.userId } },
      });
      if (existing) return NextResponse.json({ error: `Login "${loginTrimmed}" jest już zajęty` }, { status: 409 });

      const newEmail = `${loginTrimmed}@client.internal`;
      const existingEmail = await prisma.user.findFirst({
        where: { email: newEmail, id: { not: contact.userId } },
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
      await prisma.user.update({ where: { id: contact.userId! }, data: userUpdateData });
    }
  }

  const contactUpdateData: Record<string, unknown> = {};
  if (email !== undefined) contactUpdateData.email = email?.trim() || null;
  if (phone !== undefined) contactUpdateData.phone = phone?.trim() || null;
  if (startDate !== undefined) contactUpdateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) contactUpdateData.endDate = endDate ? new Date(endDate) : null;

  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: { clientId: id },
      data: { isMainContact: false },
    });
    contactUpdateData.isMainContact = true;
  }

  const updated = await prisma.projectClient.update({
    where: { id: contactId },
    data: Object.keys(contactUpdateData).length > 0 ? contactUpdateData : {},
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  const { id, contactId } = await params;

  const client = await prisma.client.findFirst({ where: { id, designerId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const contact = await prisma.projectClient.findFirst({
    where: { id: contactId, clientId: id },
    include: { user: true },
  });
  if (!contact) return NextResponse.json({ error: "Nie znaleziono kontaktu" }, { status: 404 });

  await prisma.projectClient.delete({ where: { id: contactId } });

  if (contact.userId) {
    const otherLinks = await prisma.projectClient.count({ where: { userId: contact.userId } });
    if (otherLinks === 0) {
      await prisma.user.delete({ where: { id: contact.userId } });
    }
  }

  return NextResponse.json({ success: true });
}
