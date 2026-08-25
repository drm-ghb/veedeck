import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { surveyId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(questions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const survey = await prisma.survey.findFirst({ where: { id, userId } });
  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { label, type, required, description, options, config, sectionId, order } = body;

  if (!label?.trim()) {
    return NextResponse.json({ error: "Etykieta pytania jest wymagana" }, { status: 400 });
  }
  if (!type) {
    return NextResponse.json({ error: "Typ pytania jest wymagany" }, { status: 400 });
  }

  try {
    // Compute next order if not provided
    let questionOrder = order;
    if (questionOrder === undefined) {
      const last = await prisma.surveyQuestion.findFirst({
        where: { surveyId: id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      questionOrder = last ? last.order + 1 : 0;
    }

    const question = await prisma.surveyQuestion.create({
      data: {
        label: label.trim(),
        type,
        required: required ?? false,
        description: description ?? null,
        options: options ?? null,
        config: config ?? null,
        sectionId: sectionId || null,
        surveyId: id,
        order: questionOrder,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    console.error("[POST /api/surveys/questions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
