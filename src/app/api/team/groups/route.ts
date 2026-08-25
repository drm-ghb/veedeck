import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { ensureWorkspaceSeed, TEMPLATE_GROUPS } from "@/lib/permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  if (!session?.user) return false;
  const user = session.user;
  return !user.ownerId || user.systemRole === "admin";
}

// GET — list all permission groups for the workspace
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);

  // Seed template groups on first access (use lang from cookie for group names)
  const lang = req.cookies.get("veedeck-lang")?.value;
  await ensureWorkspaceSeed(ownerId, lang);

  const groups = await prisma.permissionGroup.findMany({
    where: { workspaceId: ownerId },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(groups);
}

// POST — create a new permission group
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const body = await req.json();
  const { name, projectScope, permissions, cloneFromId } = body;

  // Clone an existing group
  if (cloneFromId) {
    const source = await prisma.permissionGroup.findFirst({
      where: { id: cloneFromId, workspaceId: ownerId },
    });
    if (!source) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });

    const cloned = await prisma.permissionGroup.create({
      data: {
        workspaceId: ownerId,
        name: `${source.name} (kopia)`,
        isTemplate: false,
        templateKey: null,
        projectScope: source.projectScope,
        permissions: source.permissions as object,
      },
    });
    return NextResponse.json(cloned, { status: 201 });
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Podaj nazwę grupy" }, { status: 400 });
  }

  const group = await prisma.permissionGroup.create({
    data: {
      workspaceId: ownerId,
      name: name.trim(),
      isTemplate: false,
      projectScope: projectScope === "all" ? "all" : "assigned",
      permissions: permissions ?? Object.fromEntries(
        ["klienci","projectflow","listy","moodboardy","zadania","ankiety",
         "produkty","wykonawcy","kalendarz","notatnik","dyskusje","ustawienia"]
          .map((m) => [m, 0])
      ),
    },
  });

  return NextResponse.json(group, { status: 201 });
}
