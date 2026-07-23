import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import MoodboardCanvas from "@/components/moodboard/MoodboardCanvas";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MoodboardCanvasPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = getWorkspaceUserId(session);

  const moodboard = await prisma.moodboard.findFirst({
    where: { id, userId },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });

  if (!moodboard) notFound();

  return (
    <MoodboardCanvas
      id={moodboard.id}
      title={moodboard.title}
      canvasData={moodboard.canvasData as object}
      isSharedWithClient={moodboard.isSharedWithClient}
      client={moodboard.client}
      project={moodboard.project}
    />
  );
}
