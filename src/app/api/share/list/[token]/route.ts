import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const list = await prisma.shoppingList.findUnique({
    where: { shareToken: token },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          shareToken: true,
          renders: { select: { id: true }, take: 1 },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          products: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!list) return NextResponse.json({ error: "Nie znaleziono listy" }, { status: 404 });

  return NextResponse.json({
    id: list.id,
    name: list.name,
    project: list.project
      ? {
          id: list.project.id,
          title: list.project.title,
          shareToken: list.project.shareToken,
          hasRenders: list.project.renders.length > 0,
        }
      : null,
    sections: list.sections.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      products: s.products.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        imageUrl: p.imageUrl,
        price: p.price,
        manufacturer: p.manufacturer,
        color: p.color,
        size: p.size,
        description: p.description,
        deliveryTime: p.deliveryTime,
        quantity: p.quantity,
        order: p.order,
      })),
    })),
  });
}
