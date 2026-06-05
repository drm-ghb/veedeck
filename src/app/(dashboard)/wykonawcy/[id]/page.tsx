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

  const serializedContractor = {
    ...contractor,
    user: contractor.user ?? null,
    assignments: contractor.assignments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return <ContractorProfile contractor={serializedContractor} />;
}
