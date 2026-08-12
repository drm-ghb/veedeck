import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { MAX_LENGTHS } from "@/lib/validation";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";
import { notifyClientDesignerReply } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const { content, author, voiceUrl, replyToId, replyToContent, replyToAuthor } = await req.json();
  const finalContent = content?.trim() || (voiceUrl ? "[wiadomość głosowa]" : "");

  if (!finalContent || !author) {
    return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });
  }

  if (finalContent.length > MAX_LENGTHS.reply) {
    return NextResponse.json({ error: "Odpowiedź jest zbyt długa" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Nie znaleziono komentarza" }, { status: 404 });
  }

  const reply = await prisma.reply.create({
    data: {
      commentId: id,
      content: finalContent,
      author,
      voiceUrl: voiceUrl ?? null,
      replyToId: replyToId ?? null,
      replyToContent: replyToContent ?? null,
      replyToAuthor: replyToAuthor ?? null,
    },
  });

  await pusherServer.trigger(`render-${comment.renderId}`, "comment-reply", {
    commentId: id,
    reply: { ...reply, createdAt: reply.createdAt.toISOString() },
  });

  // Notify client via share channel if designer replied
  const render = await prisma.render.findUnique({
    where: { id: comment.renderId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          shareToken: true,
          user: { select: { id: true, name: true, fullName: true, notifyClientOnReply: true } },
          clients: { select: { user: { select: { id: true, email: true, contactEmail: true, emailNotifEnabled: true, emailNotifModules: true } } } },
        },
      },
    },
  });

  if (render?.project.user.notifyClientOnReply) {
    await pusherServer.trigger(`share-${render.project.shareToken}`, "new-reply", {
      renderId: comment.renderId,
      commentId: id,
      author,
    });
  }

  // Email notification to clients with accounts who have enabled renderflow notifications
  if (render) {
    const isDesigner = !!(session?.user?.id && getWorkspaceUserId(session) === render.project.user.id);
    if (isDesigner) {
      const designerName = render.project.user.fullName || render.project.user.name || "Projektant";
      for (const pc of render.project.clients) {
        const cu = pc.user;
        const clientEmail = cu?.contactEmail ?? cu?.email;
        if (cu && clientEmail && cu.emailNotifEnabled && cu.emailNotifModules.includes("renderflow")) {
          notifyClientDesignerReply({
            clientEmail,
            projectTitle: render.project.title,
            projectId: render.project.id,
            renderId: comment.renderId,
            renderName: render.name,
            designerName,
            content: finalContent,
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json(reply, { status: 201 });
}

