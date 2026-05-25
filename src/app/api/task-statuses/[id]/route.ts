import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await prisma.taskStatusConfig.findFirst({ where: { id, ownerId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { label, color } = await req.json();
  const updated = await prisma.taskStatusConfig.update({
    where: { id },
    data: {
      ...(label !== undefined && { label: label.trim() }),
      ...(color !== undefined && { color }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const existing = await prisma.taskStatusConfig.findFirst({ where: { id, ownerId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const taskCount = await prisma.task.count({ where: { ownerId, status: existing.value } });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `Nie można usunąć — ${taskCount} zadań używa tego statusu.` },
      { status: 409 }
    );
  }

  await prisma.taskStatusConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
