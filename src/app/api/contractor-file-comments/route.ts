import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "Brak fileId" }, { status: 400 });

  const comments = await prisma.contractorFileComment.findMany({
    where: { fileId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const { fileId, content, author, authorRole } = await req.json();

  const trimmed = content?.trim();
  if (!fileId || !trimmed || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const comment = await prisma.contractorFileComment.create({
    data: {
      fileId,
      content: trimmed,
      author,
      authorRole: authorRole ?? "contractor",
    },
    include: { replies: true },
  });

  await pusherServer.trigger(`contractor-file-${fileId}`, "new-comment", comment);

  // Notify the designer if comment was made by contractor
  if (authorRole !== "designer") {
    const file = await prisma.contractorFile.findUnique({
      where: { id: fileId },
      include: {
        folder: {
          include: {
            assignment: {
              select: { id: true, designerId: true, project: { select: { title: true } } },
            },
          },
        },
      },
    });

    if (file) {
      const designerId = file.folder.assignment.designerId;
      const projectTitle = file.folder.assignment.project.title;
      const assignmentId = file.folder.assignment.id;

      const notification = await prisma.notification.create({
        data: {
          userId: designerId,
          message: `${author} dodał komentarz do pliku „${file.name}" w projekcie „${projectTitle}"`,
          link: `/wykonawcy`,
          type: "contractor_comment",
        },
      });
      await pusherServer.trigger(`user-${designerId}`, "new-notification", notification);
      await pusherServer.trigger(`user-${designerId}`, "contractor-comment-unread", { delta: 1 });
    }
  }

  void session;
  return NextResponse.json(comment, { status: 201 });
}
