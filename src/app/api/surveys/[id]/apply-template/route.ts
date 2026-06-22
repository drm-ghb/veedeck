import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { surveyTemplates } from "@/lib/surveyTemplates";

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
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const { templateId } = await req.json();
  const template = surveyTemplates.find((t) => t.id === templateId);
  if (!template) {
    return NextResponse.json({ error: "Nieznany szablon" }, { status: 400 });
  }

  // Block if survey already has questions
  const existingCount = await prisma.surveyQuestion.count({ where: { surveyId: id } });
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Ankieta ma już pytania. Szablon można zastosować tylko do pustej ankiety." },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    let globalOrder = 0;

    // Create sections with their questions
    for (let si = 0; si < template.sections.length; si++) {
      const sectionDef = template.sections[si];
      const section = await tx.surveySection.create({
        data: { name: sectionDef.name, order: si, surveyId: id },
      });

      for (const q of sectionDef.questions) {
        await tx.surveyQuestion.create({
          data: {
            label: q.label,
            type: q.type,
            required: q.required,
            description: q.description ?? null,
            options: q.options ?? undefined,
            config: q.config ? (q.config as object) : undefined,
            sectionId: section.id,
            surveyId: id,
            order: globalOrder++,
          },
        });
      }
    }

    // Create top-level questions (no section)
    for (const q of template.questions) {
      await tx.surveyQuestion.create({
        data: {
          label: q.label,
          type: q.type,
          required: q.required,
          description: q.description ?? null,
          options: q.options ?? undefined,
          config: q.config ?? undefined,
          sectionId: null,
          surveyId: id,
          order: globalOrder++,
        },
      });
    }
  });

  const sections = await prisma.surveySection.findMany({ where: { surveyId: id }, orderBy: { order: "asc" } });
  const questions = await prisma.surveyQuestion.findMany({ where: { surveyId: id }, orderBy: { order: "asc" } });

  return NextResponse.json({ sections, questions });
}
