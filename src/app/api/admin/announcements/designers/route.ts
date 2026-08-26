import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const designers = await prisma.user.findMany({
    where: { role: "designer" },
    select: { id: true, email: true, fullName: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(designers);
}
