import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();

  const { category, subject, message, attachmentUrl, attachmentName } = body;
  if (!subject?.trim() && !message?.trim()) {
    return NextResponse.json({ error: "Subject or message required" }, { status: 400 });
  }

  const helpRequest = await prisma.helpRequest.create({
    data: {
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? body.email ?? "unknown",
      userName: (session?.user as any)?.fullName ?? session?.user?.name ?? null,
      category: category ?? null,
      subject: subject?.trim() ?? "",
      message: message?.trim() ?? "",
      attachmentUrl: attachmentUrl ?? null,
      attachmentName: attachmentName ?? null,
    },
  });

  return NextResponse.json(helpRequest, { status: 201 });
}
