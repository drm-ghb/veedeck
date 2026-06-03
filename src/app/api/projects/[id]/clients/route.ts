import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  // Fetch contacts at Client entity level if linked; otherwise fall back to project-level
  const where = project.clientId
    ? { clientId: project.clientId }
    : { projectId: id };

  const clients = await prisma.projectClient.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, login: true, email: true, role: true } } },
  });

  return NextResponse.json(clients);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { name, email, phone, isMainContact, startDate, endDate, password, login: customLogin } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Imię jest wymagane" }, { status: 400 });

  // Determine the Client entity to link to
  let clientEntityId = project.clientId;
  if (!clientEntityId) {
    // Auto-create Client entity if project has a clientName
    const clientName = project.clientName?.trim() || name.trim();
    let client = await prisma.client.findFirst({ where: { designerId: userId, name: clientName } });
    if (!client) {
      client = await prisma.client.create({ data: { designerId: userId, name: clientName } });
    }
    clientEntityId = client.id;
    await prisma.project.update({ where: { id }, data: { clientId: clientEntityId } });
  }

  // If this is the main contact, unset all others first
  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: project.clientId ? { clientId: project.clientId } : { projectId: id },
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
        const clientUser = await prisma.user.create({
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
        clientUserId = clientUser.id;
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
      const clientUser = await prisma.user.create({
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
      clientUserId = clientUser.id;
    }
  }

  const client = await prisma.projectClient.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      isMainContact: !!isMainContact,
      clientId: clientEntityId,
      projectId: id, // keep for backward compat during transition
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      userId: clientUserId,
    },
    include: { user: { select: { id: true, login: true, email: true } } },
  });

  if (isMainContact) {
    await prisma.project.update({
      where: { id },
      data: { clientName: client.name, clientEmail: client.email ?? null, clientPhone: client.phone ?? null },
    });
  }

  return NextResponse.json(client);
}
