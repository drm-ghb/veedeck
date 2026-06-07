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

  const results = await Promise.all(
    assignments.map(async (a) => {
      const readAt = a.discussion?.readReceipts?.[0]?.readAt ?? null;

      const unreadCount = a.discussion
        ? await prisma.discussionMessage.count({
            where: {
              discussionId: a.discussion.id,
              userId: { not: session.user!.id },
              ...(readAt ? { createdAt: { gt: readAt } } : {}),
            },
          })
        : 0;

      return {
        assignmentId: a.id,
        projectTitle: a.project.title,
        discussionId: a.discussion?.id ?? null,
        messages: a.discussion?.messages ?? [],
        readAt: readAt?.toISOString() ?? null,
        unreadCount,
      };
    })
  );

  return NextResponse.json(results);
}
