import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import RenderUploader from "@/components/render/RenderUploader";
import FolderRenderView from "@/components/render/FolderRenderView";

interface Props {
  params: Promise<{ id: string; roomId: string; folderId: string }>;
}

export default async function FolderPage({ params }: Props) {
  const session = await auth();
  const { id, roomId, folderId } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { room: { include: { project: true } } },
  });

  if (!folder || folder.room.project.userId !== session!.user!.id!) notFound();

  const renders = await prisma.render.findMany({
    where: { folderId, archived: false },
    include: { _count: { select: { comments: true } } },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <Breadcrumb items={[
        { label: folder.room.project.title, href: `/projects/${id}` },
        { label: folder.room.name, href: `/projects/${id}/rooms/${roomId}` },
        { label: folder.name },
      ]} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{folder.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {renders.length} {renders.length === 1 ? "plik" : renders.length < 5 ? "pliki" : "plików"}
          </p>
        </div>
        <RenderUploader projectId={id} roomId={roomId} folderId={folderId} />
      </div>

      <FolderRenderView
        projectId={id}
        renders={renders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          commentCount: r._count.comments,
          viewCount: r.viewCount,
          status: r.status,
        }))}
      />
    </div>
  );
}
