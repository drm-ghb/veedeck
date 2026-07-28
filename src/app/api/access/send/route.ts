import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccessToken, buildAccessLink } from "@/lib/access-token";

// POST /api/access/send — designer sends a magic link to a client or contractor
// Body: { userId: string; locale?: "pl" | "en" }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string;
  let locale: "pl" | "en" = "pl";
  try {
    const body = await req.json();
    userId = body.userId;
    if (body.locale === "en") locale = "en";
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Brakuje userId" }, { status: 400 });
  }

  // Verify the target user belongs to this designer
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!targetUser || !["client", "contractor"].includes(targetUser.role)) {
    return NextResponse.json({ error: "Użytkownik nie istnieje lub nie ma roli klienta/wykonawcy" }, { status: 404 });
  }

  if (!targetUser.email) {
    return NextResponse.json({ error: "Użytkownik nie ma adresu e-mail" }, { status: 422 });
  }

  // Verify ownership: client must be linked to this designer, or contractor must be
  const designerId = session.user.id;

  let hasAccess = false;
  if (targetUser.role === "client") {
    // Check via Client entity (new-style) or via Project (old-style)
    const pc = await prisma.projectClient.findFirst({
      where: {
        userId,
        OR: [
          { client: { designerId } },
          { project: { userId: designerId } },
        ],
      },
      select: { id: true },
    });
    hasAccess = !!pc;
  } else if (targetUser.role === "contractor") {
    const contractor = await prisma.contractor.findFirst({
      where: { userId, designerId },
      select: { id: true },
    });
    hasAccess = !!contractor;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  // Get designer name for the email
  const designer = await prisma.user.findUnique({
    where: { id: designerId },
    select: { name: true },
  });

  const rawToken = await createAccessToken(userId);
  const link = buildAccessLink(rawToken);

  const { sendAccessLinkEmail } = await import("@/lib/email");
  await sendAccessLinkEmail({
    to: targetUser.email,
    link,
    personName: targetUser.name ?? "Użytkowniku",
    designerName: designer?.name ?? "Twój projektant",
    locale,
  });

  return NextResponse.json({ ok: true, link });
}
