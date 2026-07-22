import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: "Cannot impersonate admin" }, { status: 403 });

  // Clean up any previous tokens for this user
  await prisma.impersonationToken.deleteMany({ where: { userId: id } });

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
  const record = await prisma.impersonationToken.create({
    data: { userId: id, expiresAt },
  });

  return NextResponse.json({ token: record.token });
}
