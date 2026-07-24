import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getWorkspaceUserId(session);
  const { id: clientId } = await params;

  const lists = await prisma.shoppingList.findMany({
    where: {
      userId,
      project: { clientId },
    },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          products: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, imageUrl: true, price: true },
          },
        },
      },
    },
  });

  return NextResponse.json(lists);
}
