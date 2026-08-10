import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getWorkspaceUserId(session);

  const lists = await prisma.shoppingList.findMany({
    where: { userId, archived: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json(lists);
}
