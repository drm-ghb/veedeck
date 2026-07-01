import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !(session.user as any).isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await prisma.helpRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, fullName: true, name: true } },
    },
  });

  return NextResponse.json(tickets);
}
