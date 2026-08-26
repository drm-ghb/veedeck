import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // For recurring announcements, always create a new dismissal record
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (announcement.frequency === "once") {
    await prisma.announcementDismissal.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: { dismissedAt: new Date() },
    });
  } else {
    // Recurring: update existing record with new timestamp
    await prisma.announcementDismissal.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: { dismissedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
