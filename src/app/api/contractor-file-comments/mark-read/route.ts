import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId, role } = await req.json();
  if (!fileId || !role) return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });

  if (role === "contractor") {
    // Mark only non-pin replies and non-pin designer comments as viewed (pins have separate marking)
    await prisma.contractorFileReply.updateMany({
      where: { viewedByContractor: false, comment: { fileId, posX: null } },
      data: { viewedByContractor: true },
    });
    await prisma.contractorFileComment.updateMany({
      where: { fileId, viewedByContractor: false, authorRole: "designer", posX: null },
      data: { viewedByContractor: true },
    });
  } else if (role === "designer") {
    // Mark only non-pin comments as viewed (pins have separate marking)
    await prisma.contractorFileComment.updateMany({
      where: { fileId, viewedByDesigner: false, posX: null },
      data: { viewedByDesigner: true },
    });
  }

  return NextResponse.json({ success: true });
}
