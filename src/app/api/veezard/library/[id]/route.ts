import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const model = await prisma.model3D.findUnique({ where: { id } });
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (model.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.model3D.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
