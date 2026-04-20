import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { listsCategoryOrder: true, customCategories: true },
  });

  return NextResponse.json({
    listsCategoryOrder: user?.listsCategoryOrder ?? [],
    customCategories: user?.customCategories ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listsCategoryOrder, customCategories } = await req.json();

  const data: Record<string, unknown> = {};
  if (Array.isArray(listsCategoryOrder)) data.listsCategoryOrder = listsCategoryOrder;
  if (Array.isArray(customCategories)) data.customCategories = customCategories.map((c: string) => c.trim()).filter(Boolean);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
