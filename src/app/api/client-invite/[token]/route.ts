import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validation";

// GET — walidacja tokenu zaproszenia klienta (publiczny)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { designer: { select: { name: true, fullName: true, email: true } } },
  });

  if (!invitation || invitation.type !== "client" || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  const designer = invitation.designer;
  const designerName = designer.fullName || designer.name || designer.email || "Projektant";

  return NextResponse.json({ email: invitation.email, designerName });
}

// POST — rejestracja klienta przez token zaproszenia
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { fullName, phone, email, password } = await req.json();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { designer: { select: { name: true, fullName: true, email: true } } },
  });

  if (!invitation || invitation.type !== "client" || invitation.status !== "PENDING") {
    return NextResponse.json({ error: "Zaproszenie jest nieważne lub wygasło" }, { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Zaproszenie wygasło" }, { status: 410 });
  }

  if (!fullName?.trim()) {
    return NextResponse.json({ error: "Podaj imię i nazwisko" }, { status: 400 });
  }

  const finalEmail = email?.trim() || invitation.email;
  if (!finalEmail) {
    return NextResponse.json({ error: "Podaj adres e-mail" }, { status: 400 });
  }

  if (!password || !validatePassword(password)) {
    return NextResponse.json(
      { error: "Hasło musi mieć min. 8 znaków, zawierać małą i dużą literę oraz cyfrę" },
      { status: 400 }
    );
  }

  // Check if email is already taken
  const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
  if (existing) {
    return NextResponse.json({ error: "Ten adres e-mail jest już zarejestrowany" }, { status: 409 });
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      email: finalEmail,
      fullName: fullName.trim(),
      password: hashed,
      phone: phone?.trim() || null,
      role: "client",
      ownerId: invitation.designerId,
    },
  });

  // If invitation is linked to a project, add as ProjectClient
  if (invitation.projectId) {
    const project = await prisma.project.findUnique({ where: { id: invitation.projectId } });
    if (project) {
      await prisma.projectClient.create({
        data: {
          name: fullName.trim(),
          email: finalEmail,
          phone: phone?.trim() || null,
          projectId: invitation.projectId,
          clientId: project.clientId ?? null,
          userId: newUser.id,
          order: 0,
        },
      });
    }
  }

  await prisma.invitation.update({
    where: { token },
    data: { status: "ACCEPTED" },
  });

  const designer = invitation.designer;
  const designerName = designer.fullName || designer.name || designer.email || "Projektant";

  // Powiadomienie dla nowego klienta
  await prisma.notification.create({
    data: {
      userId: newUser.id,
      message: `Witaj! Twoje konto klienta u projektanta ${designerName} jest gotowe.`,
      link: "/dashboard",
      type: "info",
    },
  });

  return NextResponse.json({ ok: true });
}
