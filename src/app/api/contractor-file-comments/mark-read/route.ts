import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId, role } = await req.json();
  if (!fileId || !role) return NextResponse.json({ error: "Brakujące pola" }, { status: 400 });

  if (role === "contractor") {
    // Mark all replies on comments for this file as viewed by contractor
    await prisma.contractorFileReply.updateMany({
      where: {
        viewedByContractor: false,
        comment: { fileId },
      },
      data: { viewedByContractor: true },
    });
  } else if (role === "designer") {
    // Mark all comments for this file as viewed by designer
    await prisma.contractorFileComment.updateMany({
      where: { fileId, viewedByDesigner: false },
      data: { viewedByDesigner: true },
    });
  }

  return NextResponse.json({ success: true });
}
