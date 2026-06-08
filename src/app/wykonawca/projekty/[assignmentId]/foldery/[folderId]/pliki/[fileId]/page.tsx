import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import ContractorFileViewer from "@/components/wykonawca/ContractorFileViewer";

interface Props {
  params: Promise<{ assignmentId: string; folderId: string; fileId: string }>;
}

export default async function ContractorFileViewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((session.user as any).role !== "contractor") redirect("/login");

  const { assignmentId, folderId, fileId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) notFound();

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
    select: { id: true },
  });
  if (!assignment) notFound();

  // Fetch all files in the folder (for prev/next navigation)
  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId, visible: true },
    select: {
      name: true,
      files: {
        select: {
          id: true,
          name: true,
          fileUrl: true,
          fileType: true,
          createdAt: true,
          render: { select: { fileUrl: true, fileType: true } },
          comments: {
            select: {
              id: true,
              viewedByContractor: true,
              authorRole: true,
              posX: true,
              _count: { select: { replies: { where: { viewedByContractor: false } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!folder) notFound();

  const currentIndex = folder.files.findIndex((f) => f.id === fileId);
  if (currentIndex === -1) notFound();

  // Auto-mark designer pins as viewed when file is opened
  await prisma.contractorFileComment.updateMany({
    where: { fileId, posX: { not: null }, authorRole: "designer", viewedByContractor: false },
    data: { viewedByContractor: true },
  });

  // Mark all notifications for this file as read and notify bell in real-time
  const updated = await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false, link: { contains: `/pliki/${fileId}` } },
    data: { read: true },
  });
  if (updated.count > 0) {
    await pusherServer.trigger(`user-${session.user.id}`, "notifications-read", {});
  }

  const files = folder.files.map((f) => ({
    id: f.id,
    name: f.name,
    displayUrl: f.render?.fileUrl ?? f.fileUrl ?? null,
    effectiveType: f.render?.fileType ?? f.fileType,
    totalComments: f.comments.filter((c) => c.posX == null).length,
    unreadCount:
      f.comments.filter((c) => c.posX == null && !c.viewedByContractor && c.authorRole === "designer").length +
      f.comments.filter((c) => c.posX == null).reduce((sum, c) => sum + c._count.replies, 0),
  }));

  const backHref = `/wykonawca/projekty/${assignmentId}/foldery/${folderId}`;

  return (
    <div className="fixed inset-0 top-[53px] z-20 bg-background">
      <Suspense>
        <ContractorFileViewer
          files={files}
          initialIndex={currentIndex}
          assignmentId={assignmentId}
          folderId={folderId}
          folderName={folder.name}
          authorName={contractor.name}
          authorRole="contractor"
          backHref={backHref}
        />
      </Suspense>
    </div>
  );
}
