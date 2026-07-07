import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({
    where: { helpRequestId: id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!discussion) return NextResponse.json({ messages: [] });

  return NextResponse.json({ messages: discussion.messages });
}
