import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    select: { projectId: true },
  });

  if (!render || render.projectId !== project.id) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const body = await req.json();
  const status: unknown = body?.status;

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

  return NextResponse.json(updated);
}
