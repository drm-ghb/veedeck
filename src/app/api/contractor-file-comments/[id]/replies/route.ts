import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, author, authorRole } = await req.json();

  if (!content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.contractorFileComment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });

  const reply = await prisma.contractorFileReply.create({
    data: {
      commentId: id,
      content: content.trim(),
      author,
      authorRole: authorRole ?? "designer",
    },
  });

  await pusherServer.trigger(`contractor-file-${comment.fileId}`, "comment-reply", {
    commentId: id,
    reply: { ...reply, createdAt: reply.createdAt.toISOString() },
  });

  return NextResponse.json(reply, { status: 201 });
}
