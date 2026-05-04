import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { viewPreferences: true },
  });

  return NextResponse.json((user?.viewPreferences as Record<string, string>) ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Merge new keys into existing preferences
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { viewPreferences: true },
  });

  const existing = (user?.viewPreferences as Record<string, string>) ?? {};
  const updated = { ...existing, ...body };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { viewPreferences: updated },
  });

  return NextResponse.json(updated);
}
