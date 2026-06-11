import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const template = await prisma.survey.findFirst({
    where: { id, userId, isTemplate: true },
    include: {
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!template) return NextResponse.json({ error: "Nie znaleziono szablonu" }, { status: 404 });

  const { name, assignedClientId } = await req.json();
  const surveyName = name?.trim() || template.name;

  const slug = await uniqueSlug(surveyName, (s) =>
    prisma.survey.findUnique({ where: { slug: s } }).then(Boolean)
  );

  // Create new survey (not a template)
  const newSurvey = await prisma.survey.create({
    data: {
      name: surveyName,
      slug,
      userId,
      assignedClientId: assignedClientId ?? null,
      status: "DRAFT",
      isTemplate: false,
    },
  });

  // Map old sectionId → new sectionId
  const sectionIdMap: Record<string, string> = {};

  if (template.sections.length > 0) {
    await prisma.$transaction(
      template.sections.map((s) =>
        prisma.surveySection.create({
          data: { name: s.name, order: s.order, surveyId: newSurvey.id },
        })
      )
    ).then((created) => {
      template.sections.forEach((orig, i) => {
        sectionIdMap[orig.id] = created[i].id;
      });
    });
  }

  if (template.questions.length > 0) {
    await prisma.surveyQuestion.createMany({
      data: template.questions.map((q) => ({
        label: q.label,
        description: q.description,
        type: q.type,
        required: q.required,
        order: q.order,
        options: q.options ?? undefined,
        config: q.config ?? undefined,
        surveyId: newSurvey.id,
        sectionId: q.sectionId ? (sectionIdMap[q.sectionId] ?? null) : null,
      })),
    });
  }

  return NextResponse.json(newSurvey, { status: 201 });
}
