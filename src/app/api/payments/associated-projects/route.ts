import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

// GET /api/payments/associated-projects?clientId=xxx
// Returns all ProjectFlow projects associated with this client (by userId or email)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [
        { client: { designerId: userId } },
        { project: { userId } },
      ],
    },
    select: { id: true, userId: true, email: true, name: true, projectId: true },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find projects where this client appears as ProjectClient (by userId or email)
  const orConditions: object[] = [];
  if (client.userId) orConditions.push({ clients: { some: { userId: client.userId } } });
  if (client.email) orConditions.push({ clients: { some: { email: client.email } } });

  if (orConditions.length === 0) {
    return NextResponse.json([]);
  }

  const projects = await prisma.project.findMany({
    where: {
      userId,
      OR: orConditions,
    },
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}
