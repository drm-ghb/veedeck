import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  // Fetch all sent announcements that should be visible now
  const announcements = await prisma.announcement.findMany({
    where: {
      status: "sent",
      publishAt: { lte: now },
    },
    include: {
      dismissals: {
        where: { userId },
        orderBy: { dismissedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { publishAt: "desc" },
  });

  const pending = announcements.filter((a) => {
    // Check recipient targeting
    if (a.recipientType === "selected" && !a.recipientIds.includes(userId)) {
      return false;
    }

    const lastDismissal = a.dismissals[0];

    if (a.frequency === "once") {
      // Show only if never dismissed
      return !lastDismissal;
    }

    // Recurring
    if (a.endAt && now > a.endAt) return false;
    if (!lastDismissal) return true;

    // Show again if intervalDays has passed since last dismissal
    const intervalMs = (a.intervalDays ?? 7) * 24 * 60 * 60 * 1000;
    return now.getTime() - lastDismissal.dismissedAt.getTime() > intervalMs;
  });

  // Return without dismissals data
  const result = pending.map(({ dismissals: _, ...rest }) => rest);

  return NextResponse.json(result);
}
