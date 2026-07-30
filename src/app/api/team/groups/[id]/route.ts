import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { TEMPLATE_GROUPS } from "@/lib/permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  if (!session?.user) return false;
  const user = session.user;
  return !user.ownerId || user.systemRole === "admin";
}

// GET — fetch a single group with members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const group = await prisma.permissionGroup.findFirst({
    where: { id, workspaceId: ownerId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true, fullName: true, avatarUrl: true, systemRole: true,
              permissionGroups: { include: { group: { select: { id: true, name: true } } } },
              _count: { select: { projectAssignments: true } },
            },
          },
        },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });
  return NextResponse.json(group);
}

// PATCH — update group name, scope, permissions, or restore template defaults
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const group = await prisma.permissionGroup.findFirst({ where: { id, workspaceId: ownerId } });
  if (!group) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });

  const body = await req.json();

  // Restore template defaults
  if (body.restoreDefaults) {
    if (!group.isTemplate || !group.templateKey) {
      return NextResponse.json({ error: "Tylko grupy szablonowe można przywrócić" }, { status: 400 });
    }
    const template = TEMPLATE_GROUPS.find((t) => t.templateKey === group.templateKey);
    if (!template) return NextResponse.json({ error: "Brak szablonu" }, { status: 404 });

    const updated = await prisma.permissionGroup.update({
      where: { id },
      data: {
        name: template.name,
        projectScope: template.projectScope,
        permissions: template.permissions,
      },
    });
    return NextResponse.json(updated);
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.projectScope === "all" || body.projectScope === "assigned") data.projectScope = body.projectScope;
  if (body.permissions && typeof body.permissions === "object") data.permissions = body.permissions;

  const updated = await prisma.permissionGroup.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE — delete a group (members lose it, lose access if no other group)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const group = await prisma.permissionGroup.findFirst({ where: { id, workspaceId: ownerId } });
  if (!group) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });

  await prisma.permissionGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
