import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({
    where: { id, designerId },
    include: {
      assignments: {
        include: {
          project: { select: { id: true, title: true, clientName: true } },
          folders: { include: { _count: { select: { files: true } } }, orderBy: { order: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  return NextResponse.json(contractor);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  const { name, company, trade, email, phone } = await req.json();

  const updated = await prisma.contractor.update({
    where: { id },
    data: {
      name: name ?? contractor.name,
      company: company !== undefined ? company || null : contractor.company,
      trade: trade !== undefined ? trade || null : contractor.trade,
      email: email !== undefined ? email || null : contractor.email,
      phone: phone !== undefined ? phone || null : contractor.phone,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const designerId = getWorkspaceUserId(session);
  const { id } = await params;

  const contractor = await prisma.contractor.findFirst({ where: { id, designerId } });
  if (!contractor) {
    return NextResponse.json({ error: "Nie znaleziono wykonawcy" }, { status: 404 });
  }

  await prisma.contractor.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
