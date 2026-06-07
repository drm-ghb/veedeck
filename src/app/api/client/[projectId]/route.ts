import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  // Fetch rooms with renders
  const rooms = await prisma.room.findMany({
    where: { projectId, archived: false },
    orderBy: { order: "asc" },
    include: {
      folders: {
        where: { archived: false },
        orderBy: { order: "asc" },
        select: { id: true, name: true, pinned: true },
      },
      renders: {
        where: { archived: false },
        orderBy: { order: "asc" },
        include: {
          comments: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
            include: { replies: { orderBy: { createdAt: "asc" } } },
          },
          versions: {
            orderBy: { archivedAt: "desc" },
            select: { id: true, fileUrl: true, versionNumber: true, archivedAt: true },
          },
          folder: { select: { id: true, name: true } },
        },
      },
    },
  });

  const shoppingLists = await prisma.shoppingList.findMany({
    where: { projectId, archived: false },
    select: { id: true, name: true, shareToken: true },
  });

  let discussion = await prisma.discussion.findUnique({
    where: { projectId },
    select: { id: true },
  });

  // Lazy-create discussion for legacy projects that predate auto-creation
  if (!discussion) {
    discussion = await prisma.discussion.create({
      data: {
        title: project.title,
        type: "project",
        ownerId: project.userId,
        projectId,
      },
      select: { id: true },
    });

    // Add all client users linked to this project as participants
    const clientLinks = await prisma.projectClient.findMany({
      where: { projectId, userId: { not: null } },
      select: { userId: true },
    });
    if (clientLinks.length > 0) {
      await prisma.discussionParticipant.createMany({
        data: clientLinks.map((l) => ({ discussionId: discussion!.id, userId: l.userId! })),
        skipDuplicates: true,
      });
    }
  }

  const { user, sharePassword, shareExpiresAt, ...rest } = project;
  const { name, showProfileName, showClientLogo, clientLogoUrl, ...userSettings } = user;

  return NextResponse.json({
    ...rest,
    ...userSettings,
    rooms,
    shoppingLists,
    designerName: showProfileName ? name : null,
    clientLogoUrl: showClientLogo ? clientLogoUrl : null,
    hasDiscussion: !!discussion,
    discussionId: discussion?.id ?? null,
  });
}
