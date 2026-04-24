import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Non-blocking cleanup: delete read notifications older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  prisma.notification.deleteMany({
    where: { userId: session.user.id, read: true, createdAt: { lt: thirtyDaysAgo } },
  }).catch(() => {});

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, read } = await req.json().catch(() => ({ read: true }));
  const where = ids?.length
    ? { userId: session.user.id, id: { in: ids as string[] } }
    : { userId: session.user.id };

  await prisma.notification.updateMany({ where, data: { read: read ?? true } });

  return NextResponse.json({ ok: true });
}
