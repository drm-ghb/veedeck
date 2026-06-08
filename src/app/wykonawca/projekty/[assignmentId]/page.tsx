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
    select: {
      id: true,
      investmentStreet: true,
      investmentCity: true,
      investmentPostalCode: true,
      investmentCountry: true,
      designerContactName: true,
      designerContactPhone: true,
      investorContactName: true,
      investorContactPhone: true,
      projectNotes: true,
      project: { select: { id: true, title: true } },
      folders: {
        where: { visible: true, parentId: null, type: { in: ["rysunki", "wizualizacje", "dokumenty"] } },
        select: {
          id: true,
          name: true,
          type: true,
          visible: true,
          _count: { select: { files: true } },
          subfolders: { select: { id: true, _count: { select: { files: true } } } },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!assignment) notFound();

  const totalAssignments = await prisma.contractorAssignment.count({
    where: { contractorId: contractor.id, archived: false },
  });

  // Compute unread reply counts per top-level folder
  const topFolderIds = assignment.folders.map((f) => f.id);
  const allSubfolderIds = assignment.folders.flatMap((f) => f.subfolders.map((s) => s.id));
  const subToParent: Record<string, string> = {};
  for (const f of assignment.folders) {
    for (const s of f.subfolders) subToParent[s.id] = f.id;
  }

  const [unreadReplies, unreadDesignerComments] = await Promise.all([
    prisma.contractorFileReply.findMany({
      where: {
        viewedByContractor: false,
        comment: { posX: null, file: { folderId: { in: [...topFolderIds, ...allSubfolderIds] } } },
      },
      select: { comment: { select: { file: { select: { folderId: true } } } } },
    }),
    prisma.contractorFileComment.findMany({
      where: {
        viewedByContractor: false,
        authorRole: "designer",
        posX: null,
        file: { folderId: { in: [...topFolderIds, ...allSubfolderIds] } },
      },
      select: { file: { select: { folderId: true } } },
    }),
  ]);

  const folderUnreadCounts: Record<string, number> = {};
  for (const reply of unreadReplies) {
    const fid = reply.comment.file.folderId;
    const topId = subToParent[fid] ?? fid;
    folderUnreadCounts[topId] = (folderUnreadCounts[topId] ?? 0) + 1;
  }
  for (const comment of unreadDesignerComments) {
    const fid = comment.file.folderId;
    const topId = subToParent[fid] ?? fid;
    folderUnreadCounts[topId] = (folderUnreadCounts[topId] ?? 0) + 1;
  }

  const folders = assignment.folders.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    visible: f.visible,
    totalFiles: f._count.files + f.subfolders.reduce((sum, sub) => sum + sub._count.files, 0),
    unreadCount: folderUnreadCounts[f.id] ?? 0,
  }));

  return (
    <ContractorDashboard
      assignmentId={assignmentId}
      projectTitle={assignment.project.title}
      folders={folders}
      hasMultipleProjects={totalAssignments > 1}
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
