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

  const comment = await prisma.contractorFileComment.findUnique({
    where: { id },
    include: {
      file: {
        include: {
          folder: {
            include: {
              assignment: {
                select: { id: true, designerId: true, contractorId: true, project: { select: { title: true } } },
              },
            },
          },
        },
      },
    },
  });
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

  const { designerId, contractorId, project } = comment.file.folder.assignment;
  const fileId = comment.fileId;
  const folderId = comment.file.folder.id;
  const fileName = comment.file.name;
  const projectTitle = project.title;

  if (authorRole === "designer") {
    // Designer replied → notify contractor
    const contractorUser = await prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { userId: true },
    });
    if (contractorUser?.userId) {
      const notification = await prisma.notification.create({
        data: {
          userId: contractorUser.userId,
          message: `${author} odpowiedział na pin w pliku „${fileName}" w projekcie „${projectTitle}"`,
          link: `/wykonawca/projekty/${comment.file.folder.assignmentId}/foldery/${folderId}/pliki/${fileId}?pinId=${id}`,
          type: "designer_comment",
        },
      });
      await pusherServer.trigger(`user-${contractorUser.userId}`, "new-notification", notification);
    }
  } else {
    // Contractor replied → notify designer
    const notification = await prisma.notification.create({
      data: {
        userId: designerId,
        message: `${author} odpowiedział na pin w pliku „${fileName}" w projekcie „${projectTitle}"`,
        link: `/wykonawcy/${contractorId}/projekty/${comment.file.folder.assignmentId}/foldery/${folderId}/pliki/${fileId}?pinId=${id}`,
        type: "contractor_comment",
      },
    });
    await pusherServer.trigger(`user-${designerId}`, "new-notification", notification);
    await pusherServer.trigger(`user-${designerId}`, "contractor-comment-unread", { delta: 1 });
  }

  return NextResponse.json(reply, { status: 201 });
}
