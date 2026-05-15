import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClientInvitationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email, projectId } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Podaj adres e-mail" }, { status: 400 });
    }

    // Verify projectId belongs to this designer
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
      });
      if (!project) {
        return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 403 });
      }
    }

    const designer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, fullName: true, email: true },
    });
    const designerName =
      designer?.fullName || designer?.name || designer?.email || "Projektant";

    // Invalidate any previous pending client invitations to this email from this designer
    await prisma.invitation.updateMany({
      where: {
        email,
        designerId: session.user.id,
        type: "client",
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        designerId: session.user.id,
        type: "client",
        projectId: projectId ?? null,
        status: "PENDING",
        expiresAt,
      },
    });

    try {
      await sendClientInvitationEmail({ to: email, designerName, token: invitation.token });
    } catch {
      await prisma.invitation.delete({ where: { id: invitation.id } });
      return NextResponse.json({ error: "Nie udało się wysłać e-maila. Sprawdź ustawienia SMTP." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[client-invite] POST error:", err);
    return NextResponse.json({ error: "Wystąpił błąd serwera" }, { status: 500 });
  }
}
