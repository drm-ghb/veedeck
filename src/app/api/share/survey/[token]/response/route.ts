import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueEmailNotif } from "@/lib/email-queue";
import { pusherServer } from "@/lib/pusher";

async function getVerifiedResponse(token: string, responseId: string) {
  const response = await prisma.surveyResponse.findFirst({
    where: { id: responseId },
    include: { survey: { select: { shareToken: true, status: true } } },
  });
  if (!response) return null;
  if (response.survey.shareToken !== token) return null;
  return response;
}

async function upsertAnswers(
  responseId: string,
  answers: { questionId: string; value: unknown }[]
) {
  await prisma.$transaction(
    answers.map(({ questionId, value }) =>
      prisma.surveyAnswer.upsert({
        where: {
          // Use a compound unique workaround — we don't have @@unique so we findFirst+update or create
          // Actually Prisma upsert needs a unique field. We'll use createMany with skipDuplicates workaround.
          // Since we have no @@unique on (responseId, questionId), we delete+create.
          id: "placeholder-will-not-match",
        },
        update: { value: value as any },
        create: {
          questionId,
          responseId,
          value: value as any,
        },
      })
    )
  );
}

// Simpler upsert: delete existing answers for these questions, then recreate
async function saveAnswers(
  responseId: string,
  answers: { questionId: string; value: unknown }[]
) {
  if (!answers.length) return;
  const questionIds = answers.map((a) => a.questionId);

  await prisma.$transaction([
    prisma.surveyAnswer.deleteMany({
      where: { responseId, questionId: { in: questionIds } },
    }),
    prisma.surveyAnswer.createMany({
      data: answers.map(({ questionId, value }) => ({
        questionId,
        responseId,
        value: value as any,
      })),
    }),
  ]);
}

// PUT — partial save (no completedAt)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { responseId, answers } = await req.json();

  if (!responseId) {
    return NextResponse.json({ error: "Brak responseId" }, { status: 400 });
  }

  const response = await getVerifiedResponse(token, responseId);
  if (!response) {
    return NextResponse.json({ error: "Nie znaleziono odpowiedzi" }, { status: 404 });
  }

  if (response.completedAt) {
    return NextResponse.json({ error: "Ankieta już została wysłana" }, { status: 409 });
  }

  if (Array.isArray(answers) && answers.length > 0) {
    await saveAnswers(responseId, answers);
  }

  return NextResponse.json({ success: true });
}

// POST — submit (sets completedAt)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { responseId, answers } = await req.json();

  if (!responseId) {
    return NextResponse.json({ error: "Brak responseId" }, { status: 400 });
  }

  const response = await getVerifiedResponse(token, responseId);
  if (!response) {
    return NextResponse.json({ error: "Nie znaleziono odpowiedzi" }, { status: 404 });
  }

  if (response.completedAt) {
    return NextResponse.json({ error: "Ankieta już została wysłana" }, { status: 409 });
  }

  if (Array.isArray(answers) && answers.length > 0) {
    await saveAnswers(responseId, answers);
  }

  const updated = await prisma.surveyResponse.update({
    where: { id: responseId },
    data: { completedAt: new Date() },
    include: {
      survey: {
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  // Queue email notification to designer
  const designer = await prisma.user.findUnique({
    where: { id: updated.survey.userId },
    select: { emailNotifEnabled: true, emailNotifModules: true },
  });
  if (designer?.emailNotifEnabled && designer.emailNotifModules.includes("ankiety")) {
    queueEmailNotif(updated.survey.userId, "ankiety", "survey_submitted", {
      designerEmail: updated.survey.user.email ?? "",
      surveyName: updated.survey.name,
      surveyId: updated.survey.id,
      respondentEmail: updated.respondentEmail,
      respondentName: updated.respondentName,
    }).catch(() => {});
  }

  // In-app notification for designer
  prisma.notification.create({
    data: {
      userId: updated.survey.userId,
      message: `Klient wypełnił ankietę: „${updated.survey.name}"`,
      link: `/ankiety/${updated.survey.id}/odpowiedzi`,
      type: "info",
    },
  }).then((notif) => {
    pusherServer.trigger(`user-${updated.survey.userId}`, "new-notification", {
      ...notif,
      createdAt: notif.createdAt.toISOString(),
    }).catch(() => {});
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
