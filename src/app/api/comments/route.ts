import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const renderId = req.nextUrl.searchParams.get("renderId");
  if (!renderId) return NextResponse.json({ error: "Brak renderId" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { renderId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const { renderId, title, content, posX, posY, author, isInternal } = await req.json();

  const isPin = posX !== null && posX !== undefined && posY !== null && posY !== undefined;

  if (!renderId || !content || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { include: { user: true } } },
  });

  if (!render) {
    return NextResponse.json({ error: "Render nie znaleziony" }, { status: 404 });
  }

  const user = render.project.user;

  if (isPin) {
    // Require pin title (only for pins)
    if (user.requirePinTitle && !title?.trim()) {
      return NextResponse.json({ error: "Tytuł pinu jest wymagany" }, { status: 400 });
    }

    // Max pins per render (only for pins)
    if (user.maxPinsPerRender !== null) {
      const count = await prisma.comment.count({ where: { renderId, posX: { not: null as unknown as number } } });
      if (count >= user.maxPinsPerRender) {
        return NextResponse.json({ error: `Osiągnięto limit ${user.maxPinsPerRender} pinów na render` }, { status: 400 });
      }
    }
  }

  const comment = await prisma.comment.create({
    data: {
      render: { connect: { id: renderId } },
      title: title || null,
      content,
      ...(isPin ? { posX, posY } : {}),
      author,
      isInternal: isInternal ?? false,
    },
  });

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment);

  // Aggregate non-internal root comments into project discussion (non-blocking)
  if (!isInternal) {
    try {
      let discussion = await prisma.discussion.findUnique({
        where: { projectId: render.projectId },
      });
      // Auto-create project discussion if it doesn't exist yet
      if (!discussion) {
        discussion = await prisma.discussion.create({
          data: {
            title: render.project.title,
            type: "project",
            ownerId: render.project.userId,
            projectId: render.projectId,
          },
        });
      }
      const sourceType = isPin ? "render_pin" : "render_comment";
      const sourceUrl = `/projects/${render.projectId}/renders/${renderId}${isPin ? `?pinId=${comment.id}` : `?chatId=${comment.id}`}`;
      const isDesigner = session?.user?.id && getWorkspaceUserId(session) === render.project.userId;
      const msg = await prisma.discussionMessage.create({
        data: {
          discussionId: discussion.id,
          content,
          authorName: author,
          sourceType,
          sourceId: comment.id,
          sourceUrl,
          sourceName: render.name,
          sourceImageUrl: render.fileUrl,
          userId: isDesigner ? session!.user!.id : null,
        },
      });
      await pusherServer.trigger(`discussion-${discussion.id}`, "new-message", msg);
    } catch (e) {
      console.error("[comments] Discussion aggregation failed:", e);
    }
  }

  if (render.project.userId) {
    const notifMessage = isPin
      ? `${author} dodał pin w projekcie "${render.project.title}"`
      : `${author} wysłał wiadomość w projekcie "${render.project.title}"`;
    const notif = await prisma.notification.create({
      data: {
        userId: render.project.userId,
        message: notifMessage,
        link: `/projects/${render.project.id}/renders/${renderId}${isPin ? `?pinId=${comment.id}` : `?chatId=${comment.id}`}`,
        projectId: render.project.id,
        projectTitle: render.project.title,
      },
    });
    await pusherServer.trigger(`user-${render.project.userId}`, "new-notification", notif);
  }

  return NextResponse.json(comment, { status: 201 });
}
