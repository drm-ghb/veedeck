import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { logActivity } from "@/lib/activity-log";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = Array.isArray(val) ? val.join("; ") : String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const { id } = await params;
  const survey = await prisma.survey.findFirst({
    where: { id, userId },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!survey) return NextResponse.json({ error: "Nie znaleziono" }, { status: 403 });

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: { answers: true },
  });

  const questionIds = survey.questions.map((q) => q.id);
  const headers = [
    "Email",
    "Imię i nazwisko",
    "Data wypełnienia",
    ...survey.questions.map((q) => q.label),
  ];

  const rows = responses.map((r) => {
    const answerMap = Object.fromEntries(r.answers.map((a) => [a.questionId, a.value]));
    return [
      csvEscape(r.respondentEmail),
      csvEscape(r.respondentName),
      csvEscape(r.completedAt?.toISOString().slice(0, 10) ?? ""),
      ...questionIds.map((qid) => csvEscape(answerMap[qid] ?? null)),
    ].join(",");
  });

  const csv = [headers.map(csvEscape).join(","), ...rows].join("\n");
  const filename = `ankieta-${survey.id}-odpowiedzi.csv`;

  // 10. Log: survey CSV export
  logActivity({ level: "info", action: "export.download", message: `Export ankiety CSV: ${survey.name} (${responses.length} odpowiedzi)`, userId, meta: { surveyId: id, surveyName: survey.name, responseCount: responses.length, type: "survey_csv" } });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
