import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAdmin(session: any) {
  if (!session?.user) return false;
  const user = session.user;
  return !user.ownerId || user.systemRole === "admin";
}

// GET — list members of a group
export async function GET(
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

  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, fullName: true, avatarUrl: true, systemRole: true,
          permissionGroups: { include: { group: { select: { id: true, name: true } } } },
          _count: { select: { projectAssignments: true } },
        },
      },
    },
  });

  return NextResponse.json(members);
}

// POST — add a workspace member to this group
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;
  const { userId } = await req.json();

  if (!userId) return NextResponse.json({ error: "Podaj userId" }, { status: 400 });

  const group = await prisma.permissionGroup.findFirst({ where: { id, workspaceId: ownerId } });
  if (!group) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });

  // Verify the user is actually a member of this workspace
  const user = await prisma.user.findFirst({ where: { id: userId, ownerId } });
  if (!user) return NextResponse.json({ error: "Użytkownik nie należy do tego workspace'u" }, { status: 403 });

  // Upsert — ignore if already a member
  const member = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: id, userId } },
    create: { groupId: id, userId },
    update: {},
  });

  return NextResponse.json(member, { status: 201 });
}
