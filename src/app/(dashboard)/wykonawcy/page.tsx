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

  return <WykonawcyView contractors={contractors} />;
}
