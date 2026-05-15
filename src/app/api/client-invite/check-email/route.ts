import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) return NextResponse.json({ exists: false });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ exists: !!user });
}
