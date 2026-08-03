import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAccessToken, buildAccessLink } from "@/lib/access-token";

// POST /api/access/token — generate a magic link without sending email
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  if (!userId) return NextResponse.json({ error: "Brakuje userId" }, { status: 400 });

  const designerId = session.user.id;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!targetUser || !["client", "contractor"].includes(targetUser.role)) {
    return NextResponse.json({ error: "Użytkownik nie istnieje lub nie ma roli klienta/wykonawcy" }, { status: 404 });
  }

  let hasAccess = false;
  if (targetUser.role === "client") {
    const pc = await prisma.projectClient.findFirst({
      where: { userId, OR: [{ client: { designerId } }, { project: { userId: designerId } }] },
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

  if (!hasAccess) return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const rawToken = await createAccessToken(userId);
  const link = buildAccessLink(rawToken);

  return NextResponse.json({ ok: true, link });
}
