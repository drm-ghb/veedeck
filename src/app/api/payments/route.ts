import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/payments?clientId=xxx — fetch all groups + payments for a client
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
    select: { id: true, totalAmount: true },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [groups, payments] = await Promise.all([
    prisma.paymentGroup.findMany({
      where: { clientId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.findMany({
      where: { clientId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return NextResponse.json({ groups, payments, totalAmount: client.totalAmount });
}

// PATCH /api/payments?clientId=xxx — update totalAmount
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.projectClient.update({
    where: { id: clientId },
    data: { totalAmount: body.totalAmount != null ? parseFloat(body.totalAmount) : null },
    select: { totalAmount: true },
  });

  return NextResponse.json(updated);
}

// POST /api/payments — create payment
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, groupId, rfProjectId, name, amount, status } = body;

  if (!clientId || !name || amount == null) {
    return NextResponse.json({ error: "clientId, name, amount required" }, { status: 400 });
  }

  const client = await prisma.projectClient.findFirst({
    where: {
      id: clientId,
      OR: [{ client: { designerId: session.user.id } }, { project: { userId: session.user.id } }],
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.payment.count({ where: { clientId } });
  const payment = await prisma.payment.create({
    data: {
      clientId,
      groupId: groupId ?? null,
      rfProjectId: rfProjectId ?? null,
      name,
      amount: parseFloat(amount),
      status: status ?? "pending",
      order: count,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
