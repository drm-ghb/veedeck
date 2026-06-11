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

  const surveys = await prisma.survey.findMany({
    where: { userId, isTemplate: false },
    include: {
      project: { select: { id: true, title: true } },
      client: { select: { id: true, name: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);

  const { name, assignedClientId, isTemplate } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
  }

  if (assignedClientId) {
    const client = await prisma.client.findFirst({ where: { id: assignedClientId, designerId: userId } });
    if (!client) {
      return NextResponse.json({ error: "Klient nie istnieje" }, { status: 403 });
    }
  }

  try {
    const slug = await uniqueSlug(name.trim(), (s) =>
      prisma.survey.findUnique({ where: { slug: s } }).then(Boolean)
    );
    const survey = await prisma.survey.create({
      data: {
        name: name.trim(),
        slug,
        userId,
        assignedClientId: assignedClientId ?? null,
        status: "DRAFT",
        isTemplate: isTemplate === true,
      },
    });
    return NextResponse.json(survey, { status: 201 });
  } catch (err) {
    console.error("[POST /api/surveys] error:", err);
    return NextResponse.json({ error: "Błąd tworzenia ankiety" }, { status: 500 });
  }
}
