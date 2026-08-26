import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!announcement.title.trim()) {
    return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  }

  if (!announcement.content.trim()) {
    return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      status: "sent",
      publishAt: announcement.publishAt ?? new Date(),
    },
  });

  return NextResponse.json(updated);
}
