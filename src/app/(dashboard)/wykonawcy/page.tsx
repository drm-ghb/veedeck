import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getWorkspaceUserId } from "@/lib/workspace";
import WykonawcyView from "@/components/dashboard/wykonawcy/WykonawcyView";

export default async function WykonawcyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const designerId = getWorkspaceUserId(session as any);

  const contractors = await prisma.contractor.findMany({
    where: { designerId },
    include: {
      _count: { select: { assignments: { where: { archived: false } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute unread comment counts per contractor
  const unreadPerContractor: Record<string, number> = {};
  if (contractors.length > 0) {
    const contractorIds = contractors.map((c) => c.id);
    const unreadData = await prisma.contractorFileComment.findMany({
      where: {
        viewedByDesigner: false,
        file: {
          folder: {
            assignment: { contractorId: { in: contractorIds } },
          },
        },
      },
      select: {
        file: {
          select: {
            folder: {
              select: {
                assignment: { select: { contractorId: true } },
              },
            },
          },
        },
      },
    });
    for (const item of unreadData) {
      const cid = item.file.folder.assignment.contractorId;
      unreadPerContractor[cid] = (unreadPerContractor[cid] ?? 0) + 1;
    }
  }

  return <WykonawcyView contractors={contractors} unreadPerContractor={unreadPerContractor} />;
}
