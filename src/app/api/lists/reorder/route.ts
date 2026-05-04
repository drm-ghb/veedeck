import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { ids } = await req.json();
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "Brak danych" }, { status: 400 });
  }

  // Verify ownership of first list to validate user
  if (ids.length > 0) {
    const first = await prisma.shoppingList.findUnique({
      where: { id: ids[0] },
      select: { userId: true },
    });
    if (!first || first.userId !== userId) {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
    }
  }

  await Promise.all(
    (ids as string[]).map((id, index) =>
      prisma.shoppingList.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}
