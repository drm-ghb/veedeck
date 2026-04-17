import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { id: true, archived: true, shareExpiresAt: true, discussion: { include: { _count: { select: { messages: true } } } } },
  });

  if (!project || project.archived) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (project.shareExpiresAt && new Date() > new Date(project.shareExpiresAt)) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  return NextResponse.json(project.discussion ?? null);
}
