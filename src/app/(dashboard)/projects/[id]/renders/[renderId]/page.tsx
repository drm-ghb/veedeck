import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
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
        where: { archivedVersionId: null },
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      },
      project: true,
      room: { select: { name: true } },
      folder: { select: { name: true } },
      versions: { orderBy: { archivedAt: "desc" } },
    },
  });

  if (!render || render.project.userId !== getWorkspaceUserId(session!)) notFound();

  const navUser = await prisma.user.findUnique({
    where: { id: session!.user!.id! },
    select: { navMode: true, avatarUrl: true },
  });
  const sidebarVisible = navUser?.navMode === "sidebar";

  const roomRenders = render.roomId
    ? await prisma.render.findMany({
        where: {
          roomId: render.roomId,
          folderId: render.folderId ?? null,
          archived: false,
        },
        orderBy: { order: "asc" },
        select: { id: true, name: true, fileUrl: true, fileType: true },
      })
    : [];

  const productPins = await prisma.renderProductPin.findMany({
    where: { renderId: render.id, archivedVersionId: null },
    include: {
      product: { select: { id: true, name: true, imageUrl: true, url: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className={`fixed inset-0 top-[57px] z-40 bg-background ${sidebarVisible ? "md:left-14 md:rounded-tl-2xl" : ""}`}>
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
        fileType={render.fileType}
        imageUrl={render.fileUrl}
        initialComments={render.comments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          replies: c.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        }))}
        authorName={session!.user!.name || session!.user!.email || "Projektant"}
        authorAvatarUrl={navUser?.avatarUrl ?? null}
        isDesigner={true}
        viewCount={render.viewCount}
        roomRenders={roomRenders.map((r) => ({ ...r, fileType: r.fileType ?? "image" }))}
        versions={render.versions.map((v) => ({
          id: v.id,
          fileUrl: v.fileUrl,
          versionNumber: v.versionNumber,
          archivedAt: v.archivedAt.toISOString(),
        }))}
        initialProductPins={productPins}
      />
    </div>
  );
}
