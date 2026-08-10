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
        where: { archived: false, parentId: null },
        orderBy: { order: "asc" },
        select: {
          id: true, name: true, pinned: true,
          subfolders: {
            where: { archived: false },
            orderBy: { order: "asc" },
            select: { id: true, name: true, pinned: true },
          },
        },
      },
      renders: {
        where: { archived: false },
        orderBy: { order: "asc" },
        include: {
          comments: {
            where: { isInternal: false, archivedVersionId: null },
            orderBy: { createdAt: "asc" },
            include: { replies: { orderBy: { createdAt: "asc" } } },
          },
          versions: {
            orderBy: { archivedAt: "desc" },
            select: { id: true, fileUrl: true, versionNumber: true, label: true, archivedAt: true },
          },
          folder: { select: { id: true, name: true } },
        },
      },
    },
  });

  const shoppingLists = await prisma.shoppingList.findMany({
    where: {
      archived: false,
      isSharedWithClient: true,
      OR: [
        { projectId },
        ...(project.clientId ? [{ clientId: project.clientId }] : []),
      ],
    },
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

  // Collect all Client IDs this user is a contact for
  const userLinks = await prisma.projectClient.findMany({
    where: { userId: session.user.id, clientId: { not: null } },
    select: { clientId: true },
  });
  const surveyClientIds = [...new Set([
    ...(project.clientId ? [project.clientId] : []),
    ...userLinks.map((l) => l.clientId as string),
  ])];

  const hasSurveys = surveyClientIds.length > 0
    ? await prisma.survey.count({
        where: { assignedClientId: { in: surveyClientIds }, status: "ACTIVE", archived: false },
      }).then((n) => n > 0)
    : false;

  const hasMoodboard = await prisma.moodboard.count({
    where: {
      isSharedWithClient: true,
      archived: false,
      OR: [
        { projectId },
        ...(project.clientId ? [{ clientId: project.clientId }] : []),
      ],
    },
  }).then((n) => n > 0);

  // Contact name for the logged-in client user (authoritative name from ProjectClient)
  const userContact = await prisma.projectClient.findFirst({
    where: { userId: session.user.id },
    select: { name: true },
  });

  // Client-level hiddenModules (set in Klienci → Moduły) — takes precedence / merged with project-level
  const clientEntity = project.clientId
    ? await prisma.client.findUnique({
        where: { id: project.clientId },
        select: { hiddenModules: true },
      })
    : null;

  const { user, sharePassword, shareExpiresAt, ...rest } = project;
  const { name, showProfileName, showClientLogo, clientLogoUrl, ...userSettings } = user;

  // Merge: union of project-level and client-level hiddenModules
  const hiddenModules = [
    ...new Set([...(rest.hiddenModules ?? []), ...(clientEntity?.hiddenModules ?? [])]),
  ];

  return NextResponse.json({
    ...rest,
    ...userSettings,
    hiddenModules,
    rooms,
    shoppingLists,
    designerName: showProfileName ? name : null,
    clientLogoUrl: showClientLogo ? clientLogoUrl : null,
    hasDiscussion: !!discussion,
    discussionId: discussion?.id ?? null,
    hasSurveys,
    hasMoodboard,
    contactName: userContact?.name ?? null,
  });
}
