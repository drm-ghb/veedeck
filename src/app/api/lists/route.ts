import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";
import { checkTeamPermission, getAllowedClientIds, getAllowedProjectIds, hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await hasPermission(session, "listy", 1)) return NextResponse.json({ error: "Brak dostępu do Listy zakupowe" }, { status: 403 });
  const userId = getWorkspaceUserId(session);
  const allowedClientIds = await getAllowedClientIds(session);
  const allowedProjectIds = await getAllowedProjectIds(session);

  const lists = await prisma.shoppingList.findMany({
    where: {
      userId,
      ...(allowedClientIds !== null ? {
        OR: [
          { clientId: { in: allowedClientIds } },
          ...(allowedProjectIds && allowedProjectIds.length > 0
            ? [{ projectId: { in: allowedProjectIds } }]
            : []),
        ],
      } : {}),
    },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!await checkTeamPermission(session, "listCanCreate")) {
    return NextResponse.json({ error: "Brak uprawnień do tworzenia list" }, { status: 403 });
  }
  const userId = getWorkspaceUserId(session);

  const { name, projectId, clientId } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 403 });
    }
  }

  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, designerId: userId },
    });
    if (!client) {
      return NextResponse.json({ error: "Klient nie istnieje" }, { status: 403 });
    }
  }

  try {
    const slug = await uniqueSlug(name.trim(), (s) =>
      prisma.shoppingList.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const list = await prisma.shoppingList.create({
      data: {
        name: name.trim(),
        slug,
        userId,
        projectId: projectId ?? null,
        clientId: clientId ?? null,
        shareToken: crypto.randomUUID(),
        isSharedWithClient: false,
      },
    });
    // 6. Log: list creation
    logActivity({ level: "info", action: "list.create", message: `Utworzono listę zakupową: ${name.trim()}`, userId, meta: { listId: list.id, name: name.trim() } });

    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error("[POST /api/lists] error:", err);
    return NextResponse.json({ error: "Błąd tworzenia listy" }, { status: 500 });
  }
}
