import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [loginLogs, activityLogs] = await Promise.all([
    prisma.loginLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ loginLogs, activityLogs });
}
