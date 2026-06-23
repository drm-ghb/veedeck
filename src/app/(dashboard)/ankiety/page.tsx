import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getAllowedClientIds } from "@/lib/permissions";
import SurveysClient from "@/components/ankiety/SurveysClient";

export const metadata = { title: "Ankiety" };

export default async function AnkietyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = getWorkspaceUserId(session as any);
  const allowedIds = await getAllowedClientIds(session as any);

  const [surveys, clients, customTemplates] = await Promise.all([
    prisma.survey.findMany({
      where: {
        userId,
        isTemplate: false,
        ...(allowedIds ? { assignedClientId: { in: allowedIds } } : {}),
      },
      include: {
        assignedClient: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
        responses: { select: { viewCount: true, completedAt: true } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.client.findMany({
      where: { designerId: userId, archived: false, ...(allowedIds ? { id: { in: allowedIds } } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.survey.findMany({
      where: { userId, isTemplate: true },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const surveysWithViewCount = surveys.map((s) => ({
    ...s,
    viewCount: s.responses.reduce((sum, r) => sum + r.viewCount, 0),
    hasCompletedResponse: s.responses.some((r) => r.completedAt !== null),
  }));

  return <SurveysClient surveys={surveysWithViewCount as any} clients={clients} customTemplates={customTemplates as any} />;
}
