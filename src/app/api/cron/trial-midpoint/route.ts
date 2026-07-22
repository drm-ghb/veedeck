import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendTrialMidpointEmail,
  sendTrialDay7Email,
  sendTrialDay3Email,
  sendTrialEndedEmail,
} from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Helper: window [now + (days - 1), now + (days + 1)]
  function window(days: number) {
    return {
      gte: new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000),
      lte: new Date(now.getTime() + (days + 1) * 24 * 60 * 60 * 1000),
    };
  }

  const stages = [
    {
      label: "midpoint-15",
      where: { trialEndsAt: window(15), trialMidpointSentAt: null },
      send: sendTrialMidpointEmail,
      mark: { trialMidpointSentAt: now },
    },
    {
      label: "day-7",
      where: { trialEndsAt: window(7), trialDay7SentAt: null },
      send: sendTrialDay7Email,
      mark: { trialDay7SentAt: now },
    },
    {
      label: "day-3",
      where: { trialEndsAt: window(3), trialDay3SentAt: null },
      send: sendTrialDay3Email,
      mark: { trialDay3SentAt: now },
    },
    {
      label: "ended",
      // trialEndsAt in the past (up to 2 days ago to catch drift)
      where: {
        trialEndsAt: { lte: now, gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        trialEndedSentAt: null,
      },
      send: sendTrialEndedEmail,
      mark: { trialEndedSentAt: now },
    },
  ] as const;

  const results: Record<string, number> = {};

  for (const stage of stages) {
    const users = await prisma.user.findMany({
      where: { ...stage.where, role: "designer" } as any,
      select: { id: true, email: true },
    });

    let count = 0;
    for (const user of users) {
      try {
        await stage.send({ to: user.email });
        await prisma.user.update({
          where: { id: user.id },
          data: stage.mark as any,
        });
        count++;
      } catch (err) {
        console.error(`[cron/trial-midpoint] ${stage.label} failed for user ${user.id}:`, err);
      }
    }
    results[stage.label] = count;
  }

  return NextResponse.json({ processed: results });
}
