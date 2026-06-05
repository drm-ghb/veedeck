import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ContractorDashboard from "@/components/wykonawca/ContractorDashboard";

interface Props {
  params: Promise<{ assignmentId: string }>;
}

export default async function ContractorProjectPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "contractor") redirect("/login");

  const { assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) notFound();

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
    include: {
      project: { select: { id: true, title: true } },
      folders: {
        where: { visible: true, parentId: null, type: { in: ["rysunki", "wizualizacje", "dokumenty"] } },
        include: {
          _count: { select: { files: true } },
          subfolders: { include: { _count: { select: { files: true } } } },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!assignment) notFound();

  const totalAssignments = await prisma.contractorAssignment.count({
    where: { contractorId: contractor.id, archived: false },
  });

  const folders = assignment.folders.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    visible: f.visible,
    totalFiles: f._count.files + f.subfolders.reduce((sum, sub) => sum + sub._count.files, 0),
  }));

  return (
    <ContractorDashboard
      assignmentId={assignmentId}
      projectTitle={assignment.project.title}
      folders={folders}
      hasMultipleProjects={totalAssignments > 1}
    />
  );
}
