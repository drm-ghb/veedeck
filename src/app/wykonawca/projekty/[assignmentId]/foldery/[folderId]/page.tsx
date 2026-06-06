import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Folder } from "@/components/ui/icons";
import ContractorFilesGrid from "@/components/wykonawca/ContractorFilesGrid";

interface Props {
  params: Promise<{ assignmentId: string; folderId: string }>;
}

export default async function ContractorFolderPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "contractor") redirect("/login");

  const { assignmentId, folderId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) notFound();

  const contractorName = contractor.name;

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
    include: { project: { select: { id: true, title: true } } },
  });
  if (!assignment) notFound();

  const folder = await prisma.contractorFolder.findFirst({
    where: { id: folderId, assignmentId, visible: true },
    include: {
      parent: { select: { id: true, name: true } },
      files: {
        include: {
          render: { select: { id: true, name: true, fileUrl: true, fileType: true } },
          _count: { select: { comments: { where: { viewedByContractor: false, authorRole: "designer" } } } },
          comments: {
            select: {
              _count: { select: { replies: { where: { viewedByContractor: false } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      subfolders: {
        where: { visible: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { files: true } },
          files: {
            select: {
              _count: { select: { comments: { where: { viewedByContractor: false, authorRole: "designer" } } } },
              comments: {
                select: {
                  _count: { select: { replies: { where: { viewedByContractor: false } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!folder) notFound();

  const hasSubfolders = folder.subfolders.length > 0;
  const backHref = folder.parent
    ? `/wykonawca/projekty/${assignmentId}/foldery/${folder.parent.id}`
    : `/wykonawca/projekty/${assignmentId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
          <Link href={`/wykonawca/projekty/${assignmentId}`} className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[120px]">
            {assignment.project.title}
          </Link>
          {folder.parent && (
            <>
              <span className="flex-shrink-0">/</span>
              <Link href={`/wykonawca/projekty/${assignmentId}/foldery/${folder.parent.id}`} className="hover:text-foreground transition-colors min-w-0 shrink truncate max-w-[120px]">
                {folder.parent.name}
              </Link>
            </>
          )}
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground font-medium min-w-0 shrink truncate max-w-[140px]">{folder.name}</span>
        </nav>
      </div>

      <h1 className="text-2xl font-semibold">{folder.name}</h1>

      {hasSubfolders ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folder.subfolders.map((sub) => {
            const subUnread = sub.files.reduce(
              (sum, f) => sum + f._count.comments + f.comments.reduce((s2, c) => s2 + c._count.replies, 0),
              0
            );
            return (
              <Link key={sub.id} href={`/wykonawca/projekty/${assignmentId}/foldery/${sub.id}`}>
                <div className="relative flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-[0_4px_16px_rgba(25,33,61,0.12)] hover:border-primary/30 transition-all cursor-pointer">
                  <Folder size={24} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">{sub._count.files} plików</p>
                  </div>
                  {subUnread > 0 && (
                    <span className="absolute top-3 right-3 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Nieprzeczytane: {subUnread}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <ContractorFilesGrid
          files={folder.files.map((file) => ({
            id: file.id,
            name: file.name,
            createdAt: file.createdAt.toISOString(),
            displayUrl: file.render?.fileUrl ?? file.fileUrl ?? null,
            effectiveType: file.render?.fileType ?? file.fileType,
            totalComments: file.comments.length,
          }))}
          assignmentId={assignmentId}
          folderId={folderId}
          initialUnreadCounts={Object.fromEntries(
            folder.files.map((file) => [
              file.id,
              file._count.comments + file.comments.reduce((sum, c) => sum + c._count.replies, 0),
            ])
          )}
          authorName={contractorName}
          authorRole="contractor"
        />
      )}
    </div>
  );
}
