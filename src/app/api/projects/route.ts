import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";
import bcrypt from "bcryptjs";
import { generateClientLogin } from "@/lib/client-login";
import { checkTeamPermission, checkProjectAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { _count: { select: { renders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!await checkTeamPermission(session, "projCanCreate")) {
    return NextResponse.json({ error: "Brak uprawnień do tworzenia projektów" }, { status: 403 });
  }
  const userId = getWorkspaceUserId(session);

  const { title, clientName, clientEmail, clientPhone, clientPassword, description, module: moduleName, clientId } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  }

  try {
    const slug = await uniqueSlug(title, (s) =>
      prisma.project.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const project = await prisma.project.create({
      data: {
        title,
        slug,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        description: description || null,
        userId,
        clientId: clientId || null,
        modules: moduleName ? [moduleName] : [],
        discussion: {
          create: {
            title,
            type: "project",
            ownerId: userId,
          },
        },
      },
    });

    if (clientName) {
      let clientUserId: string | null = null;

      if (clientPassword?.trim() && clientPassword.trim().length >= 4) {
        if (clientEmail?.trim()) {
          // New mechanism: email as login
          const emailLogin = clientEmail.trim().toLowerCase();
          const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email: emailLogin }, { login: emailLogin }] },
          });
          if (existingUser) {
            clientUserId = existingUser.id;
          } else {
            const hashedPassword = await bcrypt.hash(clientPassword.trim(), 10);
            const clientUser = await prisma.user.create({
              data: {
                name: clientName.trim(),
                email: emailLogin,
                login: emailLogin,
                password: hashedPassword,
                role: "client",
                phone: clientPhone?.trim() || null,
                contactEmail: emailLogin,
              },
            });
            clientUserId = clientUser.id;
          }
        } else {
          // Old mechanism (backward compat): generated login + @client.internal
          const baseLogin = generateClientLogin(clientName.trim());
          if (baseLogin) {
            const internalEmail = `${baseLogin}@client.internal`;
            const [existingLogin, existingEmail] = await Promise.all([
              prisma.user.findUnique({ where: { login: baseLogin } }),
              prisma.user.findUnique({ where: { email: internalEmail } }),
            ]);
            if (!existingLogin && !existingEmail) {
              const hashedPassword = await bcrypt.hash(clientPassword.trim(), 10);
              const clientUser = await prisma.user.create({
                data: {
                  name: clientName.trim(),
                  email: internalEmail,
                  login: baseLogin,
                  password: hashedPassword,
                  role: "client",
                  phone: clientPhone?.trim() || null,
                  contactEmail: null,
                },
              });
              clientUserId = clientUser.id;
            }
          }
        }
      }

      await prisma.projectClient.create({
        data: {
          name: clientName.trim(),
          email: clientEmail?.trim() || null,
          phone: clientPhone?.trim() || null,
          isMainContact: true,
          projectId: project.id,
          userId: clientUserId,
        },
      });

      // Auto-create/link Client record if not already provided
      if (!clientId) {
        let client = await prisma.client.findFirst({
          where: { designerId: userId, name: clientName.trim() },
        });
        if (!client) {
          client = await prisma.client.create({
            data: { designerId: userId, name: clientName.trim() },
          });
        }
        await prisma.project.update({
          where: { id: project.id },
          data: { clientId: client.id },
        });
      }
    }

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects] error:", err);
    return NextResponse.json({ error: "Błąd tworzenia projektu", detail: String(err) }, { status: 500 });
  }
}
