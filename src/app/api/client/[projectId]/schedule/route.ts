import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

// GET /api/client/[projectId]/schedule — read-only schedule for logged-in client
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!project.scheduleSharedWithClient) {
    return NextResponse.json({ error: "Not shared" }, { status: 403 });
  }

  // Fetch all ProjectClient IDs for this client (or project as fallback)
  const allClientIds = (
    await prisma.projectClient.findMany({
      where: project.clientId ? { clientId: project.clientId } : { projectId },
      select: { id: true },
    })
  ).map((c) => c.id);

  const phases = await prisma.schedulePhase.findMany({
    where: { clientId: { in: allClientIds }, hidden: false },
    include: {
      items: {
        where: { hidden: false },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      rfProject: { select: { id: true, title: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(phases);
}
