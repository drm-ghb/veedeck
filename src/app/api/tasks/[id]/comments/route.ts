import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Nie znaleziono zadania" }, { status: 404 });
  if (task.ownerId !== ownerId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    include: {
      author: { select: { id: true, name: true, email: true, fullName: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Nie znaleziono zadania" }, { status: 404 });
  if (task.ownerId !== ownerId) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { body, attachments } = await req.json();
  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: "Treść komentarza lub załącznik jest wymagany" }, { status: 400 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      body: body?.trim() || "",
      taskId: id,
      authorId: session.user.id,
      ...(attachments?.length > 0 && {
        attachments: {
          create: attachments.map((a: { fileUrl: string; fileName: string; fileSize?: number }) => ({
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            fileSize: a.fileSize ?? null,
          })),
        },
      }),
    },
    include: {
      author: { select: { id: true, name: true, email: true, fullName: true, avatarUrl: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
