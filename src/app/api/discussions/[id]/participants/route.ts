import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import { pusherServer } from "@/lib/pusher";

async function getDiscussionAndOwner(id: string, userId: string) {
  const discussion = await prisma.discussion.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      ownerId: true,
      projectId: true,
      participants: {
        include: {
          user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } },
        },
      },
    },
  });
  if (!discussion) return null;
  if (discussion.ownerId !== userId) return null;
  return discussion;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await prisma.discussion.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      projectId: true,
      participants: {
        include: {
          user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } },
        },
      },
    },
  });
  if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (discussion.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Team members of the designer
  const teamMembers = await prisma.user.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, fullName: true, avatarUrl: true, role: true },
  });

  // Eligible clients from project (if discussion is linked to a project)
  let eligibleClients: { id: string; name: string | null; fullName: string | null; avatarUrl: string | null; role: string }[] = [];
  if (discussion.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: discussion.projectId },
      select: {
        // New model: Project → Client → contacts
        client: {
          select: {
            contacts: {
              where: { userId: { not: null } },
              select: { user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } } },
            },
          },
        },
        // Old model: Project → ProjectClient[] directly
        clients: {
          where: { userId: { not: null } },
          select: { user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } } },
        },
      },
    });
    // Merge both sources, deduplicate by id
    const allClients = [
      ...(project?.client?.contacts ?? []),
      ...(project?.clients ?? []),
    ]
      .map((c) => c.user)
      .filter((u): u is NonNullable<typeof u> => !!u);
    const seen = new Set<string>();
    for (const u of allClients) {
      if (!seen.has(u.id)) { seen.add(u.id); eligibleClients.push(u); }
    }
  }

  const participantIds = new Set(discussion.participants.map((p) => p.userId));

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, fullName: true, avatarUrl: true, role: true },
  });

  return NextResponse.json({
    owner,
    participants: discussion.participants,
    eligibleTeamMembers: teamMembers.filter((u) => !participantIds.has(u.id)),
    eligibleClients: eligibleClients.filter((u) => !participantIds.has(u.id)),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const discussion = await getDiscussionAndOwner(id, userId);
  if (!discussion) return NextResponse.json({ error: "Not found or forbidden" }, { status: 403 });

  const { userId: targetUserId } = await req.json();
  if (!targetUserId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });

  const existing = await prisma.discussionParticipant.findUnique({
    where: { discussionId_userId: { discussionId: id, userId: targetUserId } },
  });
  if (existing) return NextResponse.json({ error: "Już uczestnik" }, { status: 409 });

  const participant = await prisma.discussionParticipant.create({
    data: { discussionId: id, userId: targetUserId },
    include: {
      user: { select: { id: true, name: true, fullName: true, avatarUrl: true, role: true } },
    },
  });

  // Notify the added user
  const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, fullName: true } });
  const senderName = sender?.fullName || sender?.name || "Projektant";

  await pusherServer.trigger(`user-${targetUserId}`, "added-to-discussion", {
    discussionId: id,
    title: discussion.title,
    addedBy: senderName,
  });
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      message: `${senderName} dodał Cię do dyskusji „${discussion.title}"`,
      link: `/dyskusje`,
      type: "discussion_added",
    },
  });

  return NextResponse.json(participant, { status: 201 });
}
