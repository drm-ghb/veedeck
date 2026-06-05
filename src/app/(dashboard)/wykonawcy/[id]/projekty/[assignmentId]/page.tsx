import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceUserId } from "@/lib/workspace";
import ContractorProjectView from "@/components/dashboard/wykonawcy/ContractorProjectView";

interface Props {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function ContractorProjectPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const designerId = getWorkspaceUserId(session as any);
  const { id, assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { id, designerId },
    select: { id: true, name: true },
  });
  if (!contractor) notFound();

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: id },
    include: {
      project: { select: { id: true, title: true } },
      folders: {
        where: { parentId: null, type: { in: ["rysunki", "wizualizacje", "dokumenty"] } },
        include: {
          _count: { select: { files: true } },
          files: {
            include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
            orderBy: { createdAt: "desc" },
          },
          subfolders: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { files: true } },
              files: {
                include: { render: { select: { id: true, name: true, fileUrl: true, fileType: true } } },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!assignment) notFound();

  const rooms = await prisma.room.findMany({
    where: { projectId: assignment.project.id, archived: false },
    include: {
      folders: {
        where: { archived: false },
        include: {
          renders: {
            where: { archived: false },
            select: { id: true, name: true, fileUrl: true, fileType: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      renders: {
        where: { archived: false, folderId: null },
        select: { id: true, name: true, fileUrl: true, fileType: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const serializedFolders = assignment.folders.map((f) => ({
    ...f,
    files: f.files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
    })),
    subfolders: f.subfolders.map((sub) => ({
      ...sub,
      files: sub.files.map((file) => ({
        ...file,
        createdAt: file.createdAt.toISOString(),
      })),
    })),
  }));

  return (
    <ContractorProjectView
      contractorId={contractor.id}
      contractorName={contractor.name}
      assignmentId={assignmentId}
      projectTitle={assignment.project.title}
      projectId={assignment.project.id}
      folders={serializedFolders}
      rooms={rooms}
    />
  );
}
