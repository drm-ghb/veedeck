import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  const userLinks = await prisma.projectClient.findMany({
    where: { userId: session.user.id, clientId: { not: null } },
    select: { clientId: true },
  });
  const clientIds = [...new Set([
    ...(project.clientId ? [project.clientId] : []),
    ...userLinks.map((l) => l.clientId as string),
  ])];

  if (clientIds.length === 0) return NextResponse.json({ count: 0 });

  const count = await prisma.survey.count({
    where: {
      status: "ACTIVE",
      archived: false,
      assignedClientId: { in: clientIds },
      ...(sinceDate ? { createdAt: { gt: sinceDate } } : {}),
    },
  });

  return NextResponse.json({ count });
}
