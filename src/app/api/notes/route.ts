import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id, archived },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content } = body;

  if (!content?.trim()) return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });

  const note = await prisma.note.create({
    data: {
      title: title?.trim() || null,
      content: content.trim(),
      userId: session.user.id,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
