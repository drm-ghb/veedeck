import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  // Find the ProjectClient link to get clientId
  const link = await prisma.projectClient.findFirst({
    where: project.clientId
      ? { clientId: project.clientId, userId: session.user.id }
      : { projectId, userId: session.user.id },
  });

  const surveys = await prisma.survey.findMany({
    where: {
      status: "ACTIVE",
      archived: false,
      OR: [
        { projectId, clientId: null },
        { clientId: link?.id ?? "__none__" },
      ],
    },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      shareToken: true,
      createdAt: true,
      responses: {
        where: { respondentEmail: session.user.email! },
        select: { completedAt: true },
        take: 1,
      },
    },
  });

  const result = surveys.map((s) => ({
    id: s.id,
    name: s.name,
    shareToken: s.shareToken,
    createdAt: s.createdAt,
    completed: s.responses.length > 0 && s.responses[0].completedAt !== null,
  }));

  return NextResponse.json(result);
}
