import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceUserId } from "@/lib/workspace";
import ContractorProfile from "@/components/dashboard/wykonawcy/ContractorProfile";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContractorDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const designerId = getWorkspaceUserId(session as any);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { id, designerId },
    include: {
      user: { select: { id: true, login: true, email: true } },
      assignments: {
        include: {
          project: { select: { id: true, title: true, clientName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contractor) notFound();

  // Compute unread comment counts per assignment
  const assignmentIds = contractor.assignments.map((a) => a.id);
  const unreadPerAssignment: Record<string, number> = {};
  if (assignmentIds.length > 0) {
    const unreadData = await prisma.contractorFileComment.findMany({
      where: {
        viewedByDesigner: false,
        authorRole: "contractor",
        file: {
          folder: { assignmentId: { in: assignmentIds } },
        },
      },
      select: {
        file: { select: { folder: { select: { assignmentId: true } } } },
      },
    });
    for (const item of unreadData) {
      const aid = item.file.folder.assignmentId;
      unreadPerAssignment[aid] = (unreadPerAssignment[aid] ?? 0) + 1;
    }
  }

  const serializedContractor = {
    ...contractor,
    user: contractor.user ?? null,
    assignments: contractor.assignments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      unreadCount: unreadPerAssignment[a.id] ?? 0,
    })),
  };

  return <ContractorProfile contractor={serializedContractor} />;
}
