import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const render = await prisma.render.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          user: {
            select: {
              autoClosePinsOnAccept: true,
              autoArchiveOnAccept: true,
              notifyClientOnStatusChange: true,
            },
          },
        },
      },
    },
  });

  if (!render || render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};
  if (body.archived !== undefined) updateData.archived = body.archived;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.pinned !== undefined) updateData.pinned = body.pinned;

  const updated = await prisma.render.update({ where: { id }, data: updateData });

  // Side effects when accepting a render
  if (body.status === "ACCEPTED" && render.status !== "ACCEPTED") {
    const user = render.project.user;

    if (user.autoClosePinsOnAccept) {
      await prisma.comment.updateMany({
        where: { renderId: id, status: { not: "DONE" } },
        data: { status: "DONE" },
      });
    }

    if (user.autoArchiveOnAccept) {
      await prisma.render.update({ where: { id }, data: { archived: true } });
    }

    if (user.notifyClientOnStatusChange) {
      await pusherServer.trigger(`render-${id}`, "render-status-changed", {
        renderId: id,
        status: "ACCEPTED",
      });
      await pusherServer.trigger(`share-${render.project.shareToken}`, "render-status-changed", {
        renderId: id,
        status: "ACCEPTED",
      });
    }
  }

  // Notify client when status changes back to REVIEW
  if (body.status === "REVIEW" && render.status !== "REVIEW") {
    const user = render.project.user;
    if (user.notifyClientOnStatusChange) {
      await pusherServer.trigger(`render-${id}`, "render-status-changed", {
        renderId: id,
        status: "REVIEW",
      });
      await pusherServer.trigger(`share-${render.project.shareToken}`, "render-status-changed", {
        renderId: id,
        status: "REVIEW",
      });
    }
  }

  return NextResponse.json(updated);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const render = await prisma.render.findUnique({
    where: { id },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!render) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(render);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const render = await prisma.render.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!render || render.project.userId !== userId) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  await prisma.render.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
