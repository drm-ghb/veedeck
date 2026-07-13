import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { queueEmailNotif } from "@/lib/email-queue";

export async function GET(req: NextRequest) {
  const renderId = req.nextUrl.searchParams.get("renderId");
  if (!renderId) return NextResponse.json({ error: "Brak renderId" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { renderId, archivedVersionId: null },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const { renderId, title, content, posX, posY, posPage, author, isInternal, fromDesigner, voiceUrl, imageUrl, replyToId, replyToContent, replyToAuthor } = await req.json();

  const isPin = posX !== null && posX !== undefined && posY !== null && posY !== undefined;

  const finalContent = content?.trim() || (voiceUrl ? "[wiadomość głosowa]" : imageUrl ? "[zdjęcie]" : "");
  if (!renderId || !finalContent || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { include: { user: { select: { id: true, email: true, requirePinTitle: true, maxPinsPerRender: true, emailNotifEnabled: true, emailNotifModules: true } } } } },
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

  let comment;
  try {
    comment = await prisma.comment.create({
      data: {
        render: { connect: { id: renderId } },
        title: title || null,
        content: finalContent,
        ...(isPin ? { posX, posY, posPage: posPage ?? null } : {}),
        author,
        isInternal: isInternal ?? false,
        fromDesigner: fromDesigner ?? false,
        voiceUrl: voiceUrl ?? null,
        imageUrl: imageUrl ?? null,
        replyToId: replyToId ?? null,
        replyToContent: replyToContent ?? null,
        replyToAuthor: replyToAuthor ?? null,
      },
    });
  } catch (err) {
    console.error("[comments POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await pusherServer.trigger(`render-${renderId}`, "new-comment", comment);

  const isDesigner = !!(session?.user?.id && getWorkspaceUserId(session) === render.project.userId);

  if (render.project.userId && !isDesigner) {
    const notifMessage = isPin
      ? `${author} dodał pin w projekcie "${render.project.title}"`
      : `${author} wysłał wiadomość w projekcie "${render.project.title}"`;
    const notif = await prisma.notification.create({
      data: {
        userId: render.project.userId,
        message: notifMessage,
        link: `/projekty/${render.project.id}/renders/${renderId}${isPin ? `?pinId=${comment.id}` : `?chatId=${comment.id}`}`,
        projectId: render.project.id,
        projectTitle: render.project.title,
      },
    });
    await pusherServer.trigger(`user-${render.project.userId}`, "new-notification", notif);

    // Queue email notification to designer
    if (user.emailNotifEnabled && user.emailNotifModules.includes("renderflow")) {
      queueEmailNotif(render.project.userId, "renderflow", isPin ? "pin" : "comment", {
        designerEmail: user.email,
        projectTitle: render.project.title,
        renderName: render.name,
        author,
        content: finalContent,
        projectId: render.project.id,
        renderId,
        commentId: comment.id,
      }).catch(() => {});
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
