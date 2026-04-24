import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const { name, email, phone, isMainContact, startDate, endDate } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Imię jest wymagane" }, { status: 400 });

  // If this is the main contact, unset all others first
  if (isMainContact) {
    await prisma.projectClient.updateMany({
      where: { projectId: id },
      data: { isMainContact: false },
    });
  }

  const client = await prisma.projectClient.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      isMainContact: !!isMainContact,
      projectId: id,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  // Sync project clientName/clientEmail/clientPhone if main contact
  if (isMainContact) {
    await prisma.project.update({
      where: { id },
      data: { clientName: client.name, clientEmail: client.email ?? null, clientPhone: client.phone ?? null },
    });
  }

  return NextResponse.json(client);
}
