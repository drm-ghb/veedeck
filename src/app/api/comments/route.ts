import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

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
  const { renderId, title, content, posX, posY, author, isInternal } = await req.json();

  if (!renderId || !content || posX === undefined || posY === undefined || !author) {
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

  // Require pin title
  if (user.requirePinTitle && !title?.trim()) {
    return NextResponse.json({ error: "Tytuł pinu jest wymagany" }, { status: 400 });
  }

  // Max pins per render
  if (user.maxPinsPerRender !== null) {
    const count = await prisma.comment.count({ where: { renderId } });
    if (count >= user.maxPinsPerRender) {
      return NextResponse.json({ error: `Osiągnięto limit ${user.maxPinsPerRender} pinów na render` }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: { renderId, title: title || null, content, posX, posY, author, isInternal: isInternal ?? false },
  });

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment);

  if (render.project.userId) {
    const notif = await prisma.notification.create({
      data: {
        userId: render.project.userId,
        message: `${author} dodał komentarz w projekcie "${render.project.title}"`,
        link: `/projects/${render.project.id}/renders/${renderId}`,
        projectId: render.project.id,
        projectTitle: render.project.title,
      },
    });
    await pusherServer.trigger(`user-${render.project.userId}`, "new-notification", notif);
  }

  return NextResponse.json(comment, { status: 201 });
}
