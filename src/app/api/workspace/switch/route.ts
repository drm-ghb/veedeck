import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { primaryAccountId: true },
  });

  const primaryId = currentUser?.primaryAccountId ?? session.user.id;

  // Validate: target must be the primary account or a workspace account linked to it
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      OR: [{ id: primaryId }, { primaryAccountId: primaryId }],
    },
    select: { id: true },
  });

  if (!targetUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const token = randomBytes(32).toString("base64url");

  await prisma.impersonationToken.create({
    data: {
      token,
      userId: targetUserId,
      expiresAt: new Date(Date.now() + 60 * 1000), // 1 min
    },
  });

  return NextResponse.json({ token });
}
