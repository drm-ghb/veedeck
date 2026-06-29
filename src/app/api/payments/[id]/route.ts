import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getPaymentAndVerify(id: string, userId: string) {
  return prisma.payment.findFirst({
    where: {
      id,
      client: {
        OR: [
          { project: { userId } },
          { client: { designerId: userId } },
        ],
      },
    },
  });
}

// PATCH /api/payments/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await getPaymentAndVerify(id, session.user.id);
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.payment.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.amount !== undefined && { amount: parseFloat(body.amount) }),
      ...(body.status !== undefined && {
        status: body.status,
        paidAt: body.status === "paid" ? new Date() : null,
      }),
      ...(body.groupId !== undefined && { groupId: body.groupId }),
      ...(body.attachmentUrl !== undefined && { attachmentUrl: body.attachmentUrl }),
      ...(body.attachmentName !== undefined && { attachmentName: body.attachmentName }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/payments/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await getPaymentAndVerify(id, session.user.id);
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
