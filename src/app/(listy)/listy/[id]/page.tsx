import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ListDetail from "@/components/listy/ListDetail";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: session.user.id },
    include: {
      project: { select: { id: true, title: true } },
      sections: {
        orderBy: { order: "asc" },
        include: { products: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!list) notFound();

  return (
    <ListDetail
      list={{
        id: list.id,
        name: list.name,
        shareToken: list.shareToken,
        project: list.project,
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
      }}
    />
  );
}
