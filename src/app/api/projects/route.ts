import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { renders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, clientName, clientEmail, description, module: moduleName } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        title,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        description: description || null,
        userId: session.user.id,
        modules: moduleName ? [moduleName] : [],
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects] error:", err);
    return NextResponse.json({ error: "Błąd tworzenia projektu", detail: String(err) }, { status: 500 });
  }
}
