import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const workspaceUserId = getWorkspaceUserId(session);

  const [teamMembers, clients] = await Promise.all([
    // Team members of this workspace (invited collaborators)
    prisma.user.findMany({
      where: {
        ownerId: workspaceUserId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 5,
    }),
    // Project clients
    prisma.projectClient.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
        AND: [
          {
            OR: [
              { client: { designerId: workspaceUserId } },
              { project: { userId: workspaceUserId } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 8,
    }),
  ]);

  // Team members get userId so events appear in their calendar
  const teamResults = teamMembers.map((m) => ({
    id: m.id,
    name: m.name ?? m.email ?? "",
    email: m.email,
    userId: m.id,
  }));

  // Project clients without userId — skip if same email as a team member
  const teamEmails = new Set(teamMembers.map((m) => m.email).filter(Boolean));
  const clientResults = clients
    .filter((c) => !c.email || !teamEmails.has(c.email))
    .map((c) => ({ id: c.id, name: c.name, email: c.email, userId: null }));

  return NextResponse.json([...teamResults, ...clientResults].slice(0, 8));
}
