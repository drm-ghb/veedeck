import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  await prisma.listProductComment.updateMany({
    where: {
      viewedByDesigner: false,
      product: { section: { listId: id } },
    },
    data: { viewedByDesigner: true },
  });

  await prisma.listProductReply.updateMany({
    where: {
      viewedByDesigner: false,
      comment: { product: { section: { listId: id } } },
    },
    data: { viewedByDesigner: true },
  });

  return NextResponse.json({ ok: true });
}
