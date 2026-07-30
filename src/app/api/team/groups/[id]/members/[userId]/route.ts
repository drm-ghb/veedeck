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

// DELETE — remove a member from a group (not from workspace)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownerId = getWorkspaceUserId(session);
  const { id: groupId, userId } = await params;

  const group = await prisma.permissionGroup.findFirst({ where: { id: groupId, workspaceId: ownerId } });
  if (!group) return NextResponse.json({ error: "Nie znaleziono grupy" }, { status: 404 });

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });

  // Return whether user still has any groups (for guard UI)
  const remainingGroups = await prisma.groupMember.count({
    where: { userId, group: { workspaceId: ownerId } },
  });

  return NextResponse.json({ ok: true, hasGroups: remainingGroups > 0 });
}
