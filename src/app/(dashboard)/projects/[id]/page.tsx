import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import ProjectView from "@/components/dashboard/ProjectView";
import ShareDialog from "@/components/dashboard/ShareDialog";
import AddRoomDialog from "@/components/dashboard/AddRoomDialog";
import CopyClientLinkButton from "@/components/dashboard/CopyClientLinkButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: getWorkspaceUserId(session!) },
  });

  if (!project) notFound();

  const [rooms, archivedRooms] = await Promise.all([
    prisma.room.findMany({
      where: { projectId: id, archived: false },
      include: { _count: { select: { renders: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.room.findMany({
      where: { projectId: id, archived: true },
      include: { _count: { select: { renders: true } } },
      orderBy: { order: "asc" },
    }),
  ]);

  const shareUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/share/${project.shareToken}`;
  const clientPanelUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/share/${project.shareToken}/home`;

  return (
    <div>
      <Breadcrumb backHref="/renderflow" items={[
        { label: project.title },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {(project.clientName || project.description) && (
            <p className="text-gray-500 mt-0.5 text-sm">
              {[project.clientName, project.description].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CopyClientLinkButton url={clientPanelUrl} />
          <ShareDialog shareUrl={shareUrl} hiddenModules={project.hiddenModules} />
          <AddRoomDialog projectId={id} />
        </div>
      </div>

      <ProjectView
        projectId={id}
        rooms={rooms}
        archivedRooms={archivedRooms}
      />
    </div>
  );
}
