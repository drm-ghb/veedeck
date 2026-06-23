import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { generateClientLogin } from "@/lib/client-login";
import bcrypt from "bcryptjs";
import { getAllowedClientIds } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);
  const allowedIds = await getAllowedClientIds(session);

  const clients = await prisma.client.findMany({
    where: {
      designerId,
      archived: false,
      ...(allowedIds ? { id: { in: allowedIds } } : {}),
    },
    include: {
      _count: { select: { projects: true } },
      projects: {
        where: { archived: false },
        select: { id: true, title: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const designerId = getWorkspaceUserId(session);

  const { name, description, contactName, contactEmail, contactPhone, contactPassword } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nazwa klienta jest wymagana" }, { status: 400 });

  const client = await prisma.client.create({
    data: {
      designerId,
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  // Create main contact if contactName provided
  if (contactName?.trim()) {
    let clientUserId: string | null = null;

    if (contactPassword?.trim() && contactPassword.trim().length >= 4) {
      if (contactEmail?.trim()) {
        const emailLogin = contactEmail.trim().toLowerCase();
        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
        });
        if (existingUser) {
          clientUserId = existingUser.id;
        } else {
          const hashedPassword = await bcrypt.hash(contactPassword.trim(), 10);
          const newUser = await prisma.user.create({
            data: {
              name: contactName.trim(),
              email: emailLogin,
              login: emailLogin,
              password: hashedPassword,
              role: "client",
              phone: contactPhone?.trim() || null,
              contactEmail: emailLogin,
            },
          });
          clientUserId = newUser.id;
        }
      } else {
        const baseLogin = generateClientLogin(contactName.trim());
        if (baseLogin) {
          const internalEmail = `${baseLogin}@client.internal`;
          const [existingLogin, existingEmail] = await Promise.all([
            prisma.user.findUnique({ where: { login: baseLogin } }),
            prisma.user.findUnique({ where: { email: internalEmail } }),
          ]);
          if (!existingLogin && !existingEmail) {
            const hashedPassword = await bcrypt.hash(contactPassword.trim(), 10);
            const newUser = await prisma.user.create({
              data: {
                name: contactName.trim(),
                email: internalEmail,
                login: baseLogin,
                password: hashedPassword,
                role: "client",
                phone: contactPhone?.trim() || null,
                contactEmail: null,
              },
            });
            clientUserId = newUser.id;
          }
        }
      }
    }

    await prisma.projectClient.create({
      data: {
        name: contactName.trim(),
        email: contactEmail?.trim() || null,
        phone: contactPhone?.trim() || null,
        isMainContact: true,
        clientId: client.id,
        userId: clientUserId,
      },
    });
  }

  return NextResponse.json(client, { status: 201 });
}
