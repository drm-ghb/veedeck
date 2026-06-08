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
  const { fileId, content, title, author, authorRole, posX, posY } = await req.json();

  const trimmed = content?.trim();
  if (!fileId || !trimmed || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const isPin = posX !== null && posX !== undefined && posY !== null && posY !== undefined;

  let comment;
  try {
    comment = await prisma.contractorFileComment.create({
      data: {
        fileId,
        title: title?.trim() || null,
        content: trimmed,
        author,
        authorRole: authorRole ?? "contractor",
        ...(isPin ? { posX, posY } : {}),
      },
      include: { replies: true },
    });
  } catch (err) {
    console.error("[contractor-file-comments POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await pusherServer.trigger(`contractor-file-${fileId}`, "new-comment", comment);

  // Notify relevant party when a comment is made
  const file = await prisma.contractorFile.findUnique({
    where: { id: fileId },
    include: {
      folder: {
        include: {
          assignment: {
            select: { id: true, designerId: true, contractorId: true, project: { select: { title: true } } },
          },
        },
      },
    },
  });

  if (file) {
    const designerId = file.folder.assignment.designerId;
    const projectTitle = file.folder.assignment.project.title;
    const assignmentId = file.folder.assignment.id;
    const contractorId = file.folder.assignment.contractorId;
    const folderId = file.folder.id;

    const pinSuffix = isPin ? `?pinId=${comment.id}` : `?comments=1`;
    if (authorRole !== "designer") {
      // Contractor commented → notify designer
      const notifMessage = isPin
        ? `${author} dodał pin do pliku „${file.name}" w projekcie „${projectTitle}"`
        : `${author} dodał komentarz do pliku „${file.name}" w projekcie „${projectTitle}"`;
      const notification = await prisma.notification.create({
        data: {
          userId: designerId,
          message: notifMessage,
          link: `/wykonawcy/${contractorId}/projekty/${assignmentId}/foldery/${folderId}/pliki/${fileId}${pinSuffix}`,
          type: "contractor_comment",
        },
      });
      await pusherServer.trigger(`user-${designerId}`, "new-notification", notification);
      await pusherServer.trigger(`user-${designerId}`, "contractor-comment-unread", { delta: 1 });
    } else {
      // Designer commented → notify contractor
      const contractorUser = await prisma.contractor.findUnique({
        where: { id: contractorId },
        select: { userId: true },
      });
      if (contractorUser?.userId) {
        const notifMessage = isPin
          ? `${author} dodał pin do pliku „${file.name}" w projekcie „${projectTitle}"`
          : `${author} dodał komentarz do pliku „${file.name}" w projekcie „${projectTitle}"`;
        const notification = await prisma.notification.create({
          data: {
            userId: contractorUser.userId,
            message: notifMessage,
            link: `/wykonawca/projekty/${assignmentId}/foldery/${folderId}/pliki/${fileId}${pinSuffix}`,
            type: "designer_comment",
          },
        });
        await pusherServer.trigger(`user-${contractorUser.userId}`, "new-notification", notification);
      }
    }
  }

  void session;
  return NextResponse.json(comment, { status: 201 });
}
