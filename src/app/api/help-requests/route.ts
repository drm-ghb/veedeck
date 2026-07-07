import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { notifyAdminNewTicket } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json();

  const { category, subject, message, attachmentUrl, attachmentName, attachments } = body;
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
      attachments: attachments ?? null,
    },
  });

  await pusherServer.trigger("admin-channel", "new-ticket", { id: helpRequest.id }).catch(() => {});
  notifyAdminNewTicket({
    userEmail: helpRequest.userEmail,
    userName: helpRequest.userName,
    subject: helpRequest.subject,
    message: helpRequest.message,
    category: helpRequest.category,
  });

  return NextResponse.json(helpRequest, { status: 201 });
}
