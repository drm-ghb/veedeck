import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const lists = await prisma.shoppingList.findMany({
    where: { userId },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { name, projectId } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 403 });
    }
  }

  try {
    const slug = await uniqueSlug(name.trim(), (s) =>
      prisma.shoppingList.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const list = await prisma.shoppingList.create({
      data: {
        name: name.trim(),
        slug,
        userId,
        projectId: projectId ?? null,
        shareToken: crypto.randomUUID(),
      },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error("[POST /api/lists] error:", err);
    return NextResponse.json({ error: "Błąd tworzenia listy" }, { status: 500 });
  }
}
