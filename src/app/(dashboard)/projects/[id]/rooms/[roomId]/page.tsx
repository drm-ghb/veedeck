import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import RoomView from "@/components/render/RoomView";
import RenderUploader from "@/components/render/RenderUploader";
import AddFolderDialog from "@/components/render/AddFolderDialog";

interface Props {
  params: Promise<{ id: string; roomId: string }>;
}

export default async function RoomPage({ params }: Props) {
  const session = await auth();
  const { id, roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { project: true },
  });

  if (!room || room.project.userId !== session!.user!.id!) notFound();

  const [renders, archivedRenders, folders] = await Promise.all([
    prisma.render.findMany({
      where: { roomId, archived: false },
      include: { _count: { select: { comments: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.render.findMany({
      where: { roomId, archived: true },
      include: { _count: { select: { comments: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.folder.findMany({
      where: { roomId },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div>
      <Breadcrumb items={[
        { label: room.project.title, href: `/projects/${id}` },
        { label: room.name },
      ]} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{renders.length} {renders.length === 1 ? "render" : "renderów"}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddFolderDialog roomId={roomId} />
          <RenderUploader projectId={id} roomId={roomId} folders={folders} />
        </div>
      </div>

      <RoomView
        projectId={id}
        roomId={roomId}
        renders={renders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          commentCount: r._count.comments,
          viewCount: r.viewCount,
          status: r.status,
          folderId: r.folderId ?? null,
        }))}
        archivedRenders={archivedRenders.map((r) => ({
          id: r.id,
          name: r.name,
          fileUrl: r.fileUrl,
          commentCount: r._count.comments,
          viewCount: r.viewCount,
          status: r.status,
          folderId: r.folderId ?? null,
        }))}
        folders={folders.map((f) => ({
          id: f.id,
          name: f.name,
          renderCount: renders.filter((r) => r.folderId === f.id).length,
        }))}
      />
    </div>
  );
}
