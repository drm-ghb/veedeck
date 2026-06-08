import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceUserId } from "@/lib/workspace";
import ContractorProjectView from "@/components/dashboard/wykonawcy/ContractorProjectView";

interface Props {
  params: Promise<{ id: string; assignmentId: string }>;
  searchParams: Promise<{ fileId?: string; folderId?: string }>;
}

export default async function ContractorProjectPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const designerId = getWorkspaceUserId(session as any);
  const { id, assignmentId } = await params;
  const { fileId: autoOpenFileId, folderId: autoOpenFolderId } = await searchParams;

  // Redirect old notification links (?fileId=&folderId=) to the new route format
  if (autoOpenFileId && autoOpenFolderId) {
    redirect(`/wykonawcy/${id}/projekty/${assignmentId}/foldery/${autoOpenFolderId}/pliki/${autoOpenFileId}?comments=1`);
  }

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

  // Comment and pin counts per file (total + unread)
  const allComments = await prisma.contractorFileComment.findMany({
    where: { file: { folder: { assignmentId } } },
    select: { fileId: true, viewedByDesigner: true, authorRole: true, posX: true },
  });
  const unreadPerFile: Record<string, number> = {};
  const totalPerFile: Record<string, number> = {};
  const unreadPinsPerFile: Record<string, number> = {};
  const totalPinsPerFile: Record<string, number> = {};
  for (const c of allComments) {
    if (c.posX == null) {
      totalPerFile[c.fileId] = (totalPerFile[c.fileId] ?? 0) + 1;
      if (!c.viewedByDesigner && c.authorRole === "contractor") {
        unreadPerFile[c.fileId] = (unreadPerFile[c.fileId] ?? 0) + 1;
      }
    } else {
      totalPinsPerFile[c.fileId] = (totalPinsPerFile[c.fileId] ?? 0) + 1;
      if (!c.viewedByDesigner && c.authorRole === "contractor") {
        unreadPinsPerFile[c.fileId] = (unreadPinsPerFile[c.fileId] ?? 0) + 1;
      }
    }
  }

  // Designer display name
  const designerUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, name: true },
  });
  const designerName = designerUser?.fullName || designerUser?.name || "Projektant";

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
      unreadPerFile={unreadPerFile}
      totalPerFile={totalPerFile}
      unreadPinsPerFile={unreadPinsPerFile}
      totalPinsPerFile={totalPinsPerFile}
      designerName={designerName}
      info={{
        investmentStreet: assignment.investmentStreet,
        investmentCity: assignment.investmentCity,
        investmentPostalCode: assignment.investmentPostalCode,
        investmentCountry: assignment.investmentCountry,
        designerContactName: assignment.designerContactName,
        designerContactPhone: assignment.designerContactPhone,
        investorContactName: assignment.investorContactName,
        investorContactPhone: assignment.investorContactPhone,
        projectNotes: assignment.projectNotes,
      }}
    />
  );
}
