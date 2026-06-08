import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import ContractorFileViewer from "@/components/wykonawca/ContractorFileViewer";

interface Props {
  params: Promise<{ id: string; assignmentId: string; folderId: string; fileId: string }>;
}

export default async function DesignerContractorFileViewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const designerId = getWorkspaceUserId(session as any);
  const { id, assignmentId, folderId, fileId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { id, designerId },
    select: { id: true, name: true },
  });
  if (!contractor) notFound();

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: id },
    select: { id: true },
  });
  if (!assignment) notFound();

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId },
    select: {
      name: true,
      files: {
        select: {
          id: true,
          name: true,
          fileUrl: true,
          fileType: true,
          render: { select: { fileUrl: true, fileType: true } },
          comments: {
            select: { id: true, viewedByDesigner: true, authorRole: true, posX: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!folder) notFound();

  const currentIndex = folder.files.findIndex((f) => f.id === fileId);
  if (currentIndex === -1) notFound();

  const designerUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, name: true },
  });
  const designerName = designerUser?.fullName || designerUser?.name || "Projektant";

  const files = folder.files.map((f) => ({
    id: f.id,
    name: f.name,
    displayUrl: f.render?.fileUrl ?? f.fileUrl ?? null,
    effectiveType: f.render?.fileType ?? f.fileType,
    totalComments: f.comments.filter((c) => c.posX == null).length,
    unreadCount: f.comments.filter((c) => c.posX == null && !c.viewedByDesigner && c.authorRole === "contractor").length,
  }));

  // Mark all contractor_comment notifications for this file as read
  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      type: "contractor_comment",
      read: false,
      link: { contains: `/pliki/${fileId}` },
    },
    data: { read: true },
  });

  const backHref = `/wykonawcy/${id}/projekty/${assignmentId}`;
  const fileRouteBase = `/wykonawcy/${id}/projekty/${assignmentId}/foldery/${folderId}/pliki`;

  return (
    <div className="fixed inset-0 top-[57px] z-40 bg-background md:left-14 md:rounded-tl-2xl">
      <Suspense>
        <ContractorFileViewer
          files={files}
          initialIndex={currentIndex}
          assignmentId={assignmentId}
          folderId={folderId}
          folderName={folder.name}
          authorName={designerName}
          authorRole="designer"
          backHref={backHref}
          fileRouteBase={fileRouteBase}
        />
      </Suspense>
    </div>
  );
}
