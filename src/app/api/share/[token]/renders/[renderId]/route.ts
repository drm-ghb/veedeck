import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

const VALID_STATUSES = ["REVIEW", "ACCEPTED", "REJECTED"] as const;
type RenderStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; renderId: string }> }
) {
  const { token, renderId } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      userId: true,
      title: true,
      user: { select: { allowDirectStatusChange: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // Respect designer's setting — clients may only change status if explicitly allowed
  if (!project.user.allowDirectStatusChange) {
    return NextResponse.json({ error: "Brak uprawnień do zmiany statusu" }, { status: 403 });
  }

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    select: { projectId: true, name: true },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const body = await req.json();
  const status: unknown = body?.status;
  const clientName: string = body?.clientName || "Klient";

  if (!status || !VALID_STATUSES.includes(status as RenderStatus)) {
    return NextResponse.json(
      { error: `Nieprawidłowy status. Dozwolone: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.render.update({
    where: { id: renderId },
    data: { status: status as RenderStatus },
  });

  // Notify designer when client accepts or rejects
  if (status === "ACCEPTED" || status === "REJECTED") {
    const statusLabel = status === "ACCEPTED" ? "zaakceptował" : "odrzucił";
    const message = `${clientName} ${statusLabel} plik „${render.name}" w projekcie „${project.title}"`;
    const link = `/projekty/${project.id}/renders/${renderId}`;

    const notification = await prisma.notification.create({
      data: {
        userId: project.userId,
        message,
        link,
        type: "status_change",
        projectId: project.id,
        projectTitle: project.title,
      },
    });

    await pusherServer.trigger(`user-${project.userId}`, "new-notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return NextResponse.json(updated);
}
