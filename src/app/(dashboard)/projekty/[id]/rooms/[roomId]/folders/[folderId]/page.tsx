import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { getRecursiveRenderCounts } from "@/lib/folder-utils";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import RenderUploader from "@/components/render/RenderUploader";
import FolderRenderView from "@/components/render/FolderRenderView";
import FolderCard from "@/components/render/FolderCard";
import AddFolderDialog from "@/components/render/AddFolderDialog";

interface Props {
  params: Promise<{ id: string; roomId: string; folderId: string }>;
}

export default async function FolderPage({ params }: Props) {
  const session = await auth();
  const { id, roomId, folderId } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      room: { include: { project: true } },
      parent: { select: { id: true, name: true } },
      subfolders: {
        where: { archived: false },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!folder || folder.room.project.userId !== getWorkspaceUserId(session!)) notFound();

  const subfolderCounts = await getRecursiveRenderCounts(
    folder.subfolders.map((s) => s.id)
  );

  const renders = await prisma.render.findMany({
    where: { folderId, archived: false },
    include: { _count: { select: { comments: true } } },
    orderBy: { order: "asc" },
  });

  const breadcrumbItems = [
    { label: folder.room.project.title, href: `/projekty/${id}` },
    { label: folder.room.name, href: `/projekty/${id}/rooms/${roomId}` },
    ...(folder.parent
      ? [{ label: folder.parent.name, href: `/projekty/${id}/rooms/${roomId}/folders/${folder.parent.id}` }]
      : []),
    { label: folder.name },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{folder.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {renders.length} {renders.length === 1 ? "plik" : renders.length < 5 ? "pliki" : "plików"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddFolderDialog roomId={roomId} parentId={folderId} />
          <RenderUploader projectId={id} roomId={roomId} folderId={folderId} />
        </div>
      </div>

      {folder.subfolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {folder.subfolders.map((sub) => (
            <FolderCard
              key={sub.id}
              folder={{ id: sub.id, name: sub.name, renderCount: subfolderCounts.get(sub.id) ?? 0, pinned: sub.pinned }}
              projectId={id}
              roomId={roomId}
            />
          ))}
        </div>
      )}

      <FolderRenderView
        projectId={id}
        roomId={roomId}
        folderId={folderId}
        renders={renders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          fileType: r.fileType ?? undefined,
          commentCount: r._count.comments,
          viewCount: r.viewCount,
          status: r.status,
          pinned: r.pinned,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
