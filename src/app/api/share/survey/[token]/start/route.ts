import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const survey = await prisma.survey.findFirst({
    where: { shareToken: token },
    include: {
      questions: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  if (survey.status !== "ACTIVE") {
    return NextResponse.json({ error: "Ankieta jest niedostępna" }, { status: 404 });
  }

  const { email, name } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Adres email jest wymagany" }, { status: 400 });
  }

  // Deduplication — find existing response for this email
  const existing = await prisma.surveyResponse.findFirst({
    where: { surveyId: survey.id, respondentEmail: email.trim().toLowerCase() },
    orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
    include: { answers: true },
  });

  if (existing) {
    await prisma.surveyResponse.update({
      where: { id: existing.id },
      data: { viewCount: { increment: 1 } },
    });
    if (existing.completedAt) {
      return NextResponse.json({
        responseId: existing.id,
        completed: true,
        existingAnswers: existing.answers,
      });
    }
    // Partial save — resume
    return NextResponse.json({
      responseId: existing.id,
      completed: false,
      existingAnswers: existing.answers,
    });
  }

  // New response
  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      respondentEmail: email.trim().toLowerCase(),
      respondentName: name?.trim() ?? null,
      viewCount: 1,
    },
  });

  return NextResponse.json({
    responseId: response.id,
    completed: false,
    existingAnswers: [],
  });
}
