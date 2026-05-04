import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientProject } from "@/lib/client-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { projectId, listId } = await params;
  const project = await getClientProject(session, projectId);
  if (!project) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId, projectId, archived: false },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          products: {
            where: { hidden: false },
            orderBy: { order: "asc" },
            include: { _count: { select: { comments: true } } },
          },
        },
      },
    },
  });

  if (!list) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });

  return NextResponse.json({
    id: list.id,
    name: list.name,
    shareToken: list.shareToken,
    hidePrices: list.hidePrices,
    sections: list.sections.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      unsorted: s.unsorted,
      products: s.products.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        imageUrl: p.imageUrl,
        price: p.price,
        manufacturer: p.manufacturer,
        color: p.color,
        dimensions: p.dimensions,
        description: p.description,
        deliveryTime: p.deliveryTime,
        quantity: p.quantity,
        order: p.order,
        commentCount: p._count.comments,
        approval: p.approval,
        note: p.note,
      })),
    })),
  });
}
