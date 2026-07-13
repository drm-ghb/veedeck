import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Get all distinct userIds with pending notifications
  const pending = await prisma.emailNotifQueue.groupBy({
    by: ["userId"],
  });

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const userIds = pending.map((p) => p.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, emailNotifEnabled: true },
    select: {
      id: true,
      email: true,
      emailNotifModules: true,
      emailNotifDigestInterval: true,
      lastEmailDigestSentAt: true,
    },
  });

  let processed = 0;

  for (const user of users) {
    const intervalMs = user.emailNotifDigestInterval * 60 * 1000;
    const lastSent = user.lastEmailDigestSentAt;

    // Skip if not enough time has passed since last digest
    if (lastSent && now.getTime() - lastSent.getTime() < intervalMs) {
      continue;
    }

    // Get pending items for this user filtered by enabled modules
    const items = await prisma.emailNotifQueue.findMany({
      where: {
        userId: user.id,
        module: { in: user.emailNotifModules },
      },
      orderBy: { createdAt: "asc" },
    });

    if (items.length === 0) continue;

    try {
      await sendDigestEmail(
        user.email,
        items.map((i) => ({ type: i.type, payload: i.payload as Record<string, unknown> })),
        { intervalMinutes: user.emailNotifDigestInterval }
      );

      await prisma.emailNotifQueue.deleteMany({
        where: { id: { in: items.map((i) => i.id) } },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastEmailDigestSentAt: now },
      });

      processed++;
    } catch (err) {
      console.error(`[cron/notify-digest] Failed for user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ processed });
}
