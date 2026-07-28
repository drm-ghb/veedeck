import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { taskReminderHours: true },
  });

  const defaults = { LOW: 72, MEDIUM: 48, HIGH: 24 };
  const hours = (user?.taskReminderHours as Record<string, number> | null) ?? defaults;
  return NextResponse.json(hours);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = getWorkspaceUserId(session);
  const body = await req.json();
  const { LOW, MEDIUM, HIGH } = body;

  if (typeof LOW !== "number" || typeof MEDIUM !== "number" || typeof HIGH !== "number") {
    return NextResponse.json({ error: "Nieprawidłowe wartości" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: ownerId },
    data: { taskReminderHours: { LOW, MEDIUM, HIGH } },
  });

  return NextResponse.json({ ok: true });
}
