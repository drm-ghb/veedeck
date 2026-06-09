import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

async function getAuthorizedRender(renderId: string, userId: string) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { project: { select: { userId: true } } },
  });
  if (!render || render.project.userId !== userId) return null;
  return render;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const render = await getAuthorizedRender(id, getWorkspaceUserId(session));
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const items = await prisma.renderComparisonItem.findMany({
    where: { renderId: id },
    include: {
      sourceRender: {
        select: {
          id: true, name: true, fileUrl: true, fileType: true, createdAt: true,
          folder: { select: { name: true } },
          room: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const render = await getAuthorizedRender(id, getWorkspaceUserId(session));
  if (!render) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { sourceRenderId, displayName } = await req.json();
  if (!sourceRenderId) return NextResponse.json({ error: "Brak sourceRenderId" }, { status: 400 });
  if (sourceRenderId === id) return NextResponse.json({ error: "Nie można porównać pliku z samym sobą" }, { status: 400 });

  let item;
  try {
    item = await prisma.renderComparisonItem.create({
      data: { renderId: id, sourceRenderId, displayName: displayName || null },
      include: {
        sourceRender: {
          select: {
            id: true, name: true, fileUrl: true, fileType: true, createdAt: true,
            folder: { select: { name: true } },
            room: { select: { name: true } },
          },
        },
      },
    });
  } catch (e) {
    console.error("[comparisons POST] Prisma error:", e);
    return NextResponse.json({ error: "Błąd bazy danych", detail: String(e) }, { status: 500 });
  }

  return NextResponse.json(item);
}
