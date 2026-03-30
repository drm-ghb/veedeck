import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RenderViewer from "@/components/render/RenderViewer";

interface Props {
  params: Promise<{ id: string; renderId: string }>;
}

export default async function RenderPage({ params }: Props) {
  const session = await auth();
  const { id, renderId } = await params;

  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      },
      project: true,
      room: { select: { name: true } },
      folder: { select: { name: true } },
      versions: { orderBy: { archivedAt: "desc" } },
    },
  });

  if (!render || render.project.userId !== session!.user!.id!) notFound();

  const roomRenders = render.roomId
    ? await prisma.render.findMany({
        where: {
          roomId: render.roomId,
          folderId: render.folderId ?? null,
          archived: false,
        },
        orderBy: { order: "asc" },
        select: { id: true, name: true, fileUrl: true },
      })
    : [];

  return (
    <div className="fixed inset-0 top-[57px] z-20 bg-background">
      <RenderViewer
        renderId={render.id}
        renderName={render.name}
        projectId={id}
        projectTitle={render.project.title}
        roomId={render.roomId ?? undefined}
        roomName={render.room?.name ?? undefined}
        folderId={render.folderId ?? undefined}
        folderName={render.folder?.name ?? undefined}
        initialRenderStatus={render.status}
        imageUrl={render.fileUrl}
        initialComments={render.comments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        }))}
        authorName={session!.user!.name || session!.user!.email || "Projektant"}
        isDesigner={true}
        viewCount={render.viewCount}
        roomRenders={roomRenders}
        versions={render.versions.map((v) => ({
          id: v.id,
          fileUrl: v.fileUrl,
          versionNumber: v.versionNumber,
          archivedAt: v.archivedAt.toISOString(),
        }))}
      />
    </div>
  );
}
