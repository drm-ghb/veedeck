import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
  });
  if (!assignment) return NextResponse.json({ error: "Nie znaleziono projektu" }, { status: 404 });

  const discussion = await prisma.discussion.findUnique({
    where: { contractorAssignmentId: assignmentId },
  });

  if (!discussion) return NextResponse.json({ discussionId: null, messages: [] });

  const messages = await prisma.discussionMessage.findMany({
    where: { discussionId: discussion.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ discussionId: discussion.id, messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { assignmentId } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });

  const assignment = await prisma.contractorAssignment.findFirst({
    where: { id: assignmentId, contractorId: contractor.id, archived: false },
    include: { project: { select: { title: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Nie znaleziono projektu" }, { status: 404 });

  const { content, attachmentUrl, attachmentName, attachmentType } = await req.json();
  if (!content?.trim() && !attachmentUrl) {
    return NextResponse.json({ error: "Treść lub załącznik jest wymagany" }, { status: 400 });
  }

  // Check if discussion already exists (to detect first message)
  const existingDiscussion = await prisma.discussion.findUnique({
    where: { contractorAssignmentId: assignmentId },
  });
  const isNewDiscussion = !existingDiscussion;

  // Find or create the discussion (owned by the designer)
  const discussion = await prisma.discussion.upsert({
    where: { contractorAssignmentId: assignmentId },
    create: {
      title: assignment.project.title,
      type: "contractor",
      ownerId: assignment.designerId,
      contractorAssignmentId: assignmentId,
    },
    update: { updatedAt: new Date() },
  });

  const authorName = contractor.company || contractor.name;

  const message = await prisma.discussionMessage.create({
    data: {
      discussionId: discussion.id,
      content: content?.trim() || "",
      authorName,
      userId: session.user.id,
      sourceType: "chat",
      attachmentUrl: attachmentUrl ?? null,
      attachmentName: attachmentName ?? null,
      attachmentType: attachmentType ?? null,
    },
  });

  // Notify designer's DyskusjeView (existing subscription)
  await pusherServer.trigger(`discussion-${discussion.id}`, "new-message", message);

  // Notify contractor's own ContractorChatButton (for badge on other open tabs)
  await pusherServer.trigger(`contractor-assignment-${assignmentId}`, "new-message", message);

  // If new discussion, notify designer's NavSidebar to subscribe and increment badge
  if (isNewDiscussion) {
    await pusherServer.trigger(`user-${assignment.designerId}`, "new-discussion", {
      discussionId: discussion.id,
      hasMessage: true,
    });
  }

  return NextResponse.json(message, { status: 201 });
}
