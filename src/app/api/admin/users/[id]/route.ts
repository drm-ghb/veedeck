import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true } });
  await prisma.user.delete({ where: { id } });
  await logActivity({
    level: "info",
    action: "USER_DELETED",
    message: `Admin usunął użytkownika: ${target?.email ?? id}`,
    userId: session.user.id,
    meta: { deletedUserId: id, deletedEmail: target?.email },
  });
  return NextResponse.json({ success: true });
}
