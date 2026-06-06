import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contractor = await prisma.contractor.findFirst({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json([]);

  const assignments = await prisma.contractorAssignment.findMany({
    where: { contractorId: contractor.id, archived: false },
    include: {
      project: { select: { title: true } },
      discussion: {
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 100 },
          readReceipts: {
            where: { readerId: session.user.id, readerType: "contractor" },
            select: { readAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    assignments.map((a) => ({
      assignmentId: a.id,
      projectTitle: a.project.title,
      discussionId: a.discussion?.id ?? null,
      messages: a.discussion?.messages ?? [],
      readAt: a.discussion?.readReceipts?.[0]?.readAt?.toISOString() ?? null,
    }))
  );
}
