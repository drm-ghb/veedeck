import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

// GET /api/client/[projectId]/payments — read-only payments view for client
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

  if (!project.paymentsSharedWithClient) {
    return NextResponse.json({ error: "Not shared" }, { status: 403 });
  }

  // Verify this user has at least one ProjectClient record linked to this project
  const contactWhere = project.clientId
    ? { clientId: project.clientId, userId: session.user.id }
    : { projectId, userId: session.user.id };
  const userRecord = await prisma.projectClient.findFirst({
    where: contactWhere,
    select: { id: true },
  });
  if (!userRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all contacts for this client (or project as fallback)
  const allClientIds = (
    await prisma.projectClient.findMany({
      where: project.clientId ? { clientId: project.clientId } : { projectId },
      select: { id: true },
    })
  ).map((c) => c.id);

  const [groups, payments] = await Promise.all([
    prisma.paymentGroup.findMany({
      where: { clientId: { in: allClientIds }, hiddenFromClient: false },
      include: {
        rfProject: { select: { id: true, title: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: { clientId: { in: allClientIds } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return NextResponse.json({ groups, payments });
}
