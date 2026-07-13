import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { queueEmailNotif } from "@/lib/email-queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;
  const { clientName, versionId } = await req.json();

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: { id: true, userId: true, title: true, user: { select: { email: true, emailNotifEnabled: true, emailNotifModules: true } } },
  });

  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    select: { projectId: true, name: true },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const version = await prisma.renderVersion.findUnique({ where: { id: versionId } });
  if (!version || version.renderId !== renderId) {
    return NextResponse.json({ error: "Wersja nie znaleziona" }, { status: 404 });
  }

  const request = await prisma.versionRestoreRequest.create({
    data: {
      renderId,
      versionId,
      renderName: render.name,
      clientName: clientName || "Klient",
      projectId: project.id,
      shareToken: token,
      status: "PENDING",
    },
  });

  const renderUrl = `/projekty/${project.id}/renders/${renderId}`;
  const message = `${request.clientName} prosi o przywrócenie wersji ${version.versionNumber} pliku „${render.name}" w projekcie „${project.title}"`;

  const notification = await prisma.notification.create({
    data: {
      userId: project.userId,
      message,
      link: renderUrl,
      type: "version_restore_request",
      requestId: request.id,
      projectId: project.id,
      projectTitle: project.title,
    },
  });

  await pusherServer.trigger(`user-${project.userId}`, "new-notification", {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  });

  if (project.user.emailNotifEnabled && project.user.emailNotifModules.includes("renderflow")) {
    queueEmailNotif(project.userId, "renderflow", "version_request", {
      designerEmail: project.user.email,
      projectTitle: project.title,
      projectId: project.id,
      renderId,
      renderName: render.name,
      clientName: request.clientName,
      versionNumber: version.versionNumber,
    }).catch(() => {});
  }

  return NextResponse.json({ requestId: request.id });
}
