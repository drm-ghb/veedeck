import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "contractor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contractor = await prisma.contractor.findFirst({
    where: { userId: session.user.id },
  });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono profilu wykonawcy" }, { status: 404 });
  }

  const assignments = await prisma.contractorAssignment.findMany({
    where: { contractorId: contractor.id, archived: false },
    include: {
      project: { select: { id: true, title: true } },
      contractor: { include: { designer: { select: { id: true, name: true, fullName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}
