import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, designerId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const contacts = await prisma.projectClient.findMany({
    where: { clientId: id },
    orderBy: [{ isMainContact: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  return NextResponse.json(contacts);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, designerId } });
  if (!client) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { name, email, phone, isMainContact, password, login: customLogin } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Imię jest wymagane" }, { status: 400 });

  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: { clientId: id },
      data: { isMainContact: false },
    });
  }

  let clientUserId: string | null = null;

  if (password?.trim()) {
    if (password.trim().length < 4) {
      return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 });
    }

    if (email?.trim()) {
      const emailLogin = email.trim().toLowerCase();
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
      });
      if (existingUser) {
        clientUserId = existingUser.id;
      } else {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        const newUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: emailLogin,
            login: emailLogin,
            password: hashedPassword,
            role: "client",
            phone: phone?.trim() || null,
            contactEmail: emailLogin,
          },
        });
        clientUserId = newUser.id;
      }
    } else {
      const baseLogin = customLogin?.trim() || generateClientLogin(name.trim());
      if (!baseLogin) return NextResponse.json({ error: "Nie można wygenerować loginu z podanego imienia" }, { status: 400 });

      const internalEmail = `${baseLogin}@client.internal`;
      const [existingLogin, existingEmail] = await Promise.all([
        prisma.user.findUnique({ where: { login: baseLogin } }),
        prisma.user.findUnique({ where: { email: internalEmail } }),
      ]);
      if (existingLogin || existingEmail) {
        return NextResponse.json({ error: `Login "${baseLogin}" jest już zajęty` }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: internalEmail,
          login: baseLogin,
          password: hashedPassword,
          role: "client",
          phone: phone?.trim() || null,
          contactEmail: null,
        },
      });
      clientUserId = newUser.id;
    }
  }

  const contact = await prisma.projectClient.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      isMainContact: !!isMainContact,
      clientId: id,
      userId: clientUserId,
    },
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  return NextResponse.json(contact, { status: 201 });
}
