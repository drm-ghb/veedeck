import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getClientProject } from "@/lib/client-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; renderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, renderId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  if (!project.user.allowClientAcceptance && !project.user.allowDirectStatusChange) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const render = await prisma.render.findFirst({ where: { id: renderId, projectId } });
  if (!render) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { status } = await req.json();
  const updated = await prisma.render.update({ where: { id: renderId }, data: { status } });

  // Notify designer when client accepts or rejects a render
  if (status === "ACCEPTED" || status === "REJECTED") {
    const clientName = session.user.name || "Klient";
    const statusLabel = status === "ACCEPTED" ? "zaakceptował" : "odrzucił";
    const message = `${clientName} ${statusLabel} plik „${render.name}" w projekcie „${project.title}"`;
    const link = `/projekty/${projectId}/renders/${renderId}`;

    const notification = await prisma.notification.create({
      data: {
        userId: project.userId,
        message,
        link,
        type: "status_change",
        projectId,
        projectTitle: project.title,
      },
    });

    await pusherServer.trigger(`user-${project.userId}`, "new-notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    });

    await prisma.clientEvent.create({
      data: {
        projectId,
        type: status === "ACCEPTED" ? "render_accepted" : "render_rejected",
        clientName,
        meta: { renderId, renderName: render.name },
      },
    });
  }

  return NextResponse.json(updated);
}
