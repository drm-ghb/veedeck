import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const survey = await prisma.survey.findFirst({
    where: { shareToken: token },
    include: {
      sections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!survey || survey.status !== "ACTIVE") {
    return NextResponse.json({ error: "Nie znaleziono ankiety" }, { status: 404 });
  }

  return NextResponse.json({
    id: survey.id,
    name: survey.name,
    sections: survey.sections,
    questions: survey.questions,
  });
}
