import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ListDetail from "@/components/listy/ListDetail";

export default async function ListPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ product?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const { product: initialOpenProductId } = await searchParams;

  const [userSettings, list] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { listsCategoryOrder: true, clientLogoUrl: true } }),
    prisma.shoppingList.findFirst({
      where: {
        userId: session.user.id,
        OR: [{ slug }, { id: slug }],
      },
      select: {
        id: true, name: true, shareToken: true, budget: true,
        project: {
          select: {
            id: true, title: true, hiddenModules: true,
            addressStreet: true, addressCity: true, addressPostalCode: true, addressCountry: true,
            clients: { where: { isMainContact: true }, select: { name: true }, take: 1 },
          },
        },
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true, name: true, order: true, sortBy: true, budget: true, unsorted: true,
            products: {
              orderBy: { order: "asc" },
              select: {
                id: true, name: true, url: true, imageUrl: true, price: true,
                manufacturer: true, color: true, dimensions: true, description: true,
                deliveryTime: true, quantity: true, order: true, category: true,
                hidden: true, approval: true, productId: true,
                supplier: true, catalogNumber: true,
                _count: { select: { comments: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!list) notFound();

  return (
    <ListDetail
      designerName={(session.user as { name?: string }).name ?? "Projektant"}
      designerEmail={(session.user as { email?: string }).email ?? undefined}
      designerLogoUrl={userSettings?.clientLogoUrl ?? undefined}
      initialOpenProductId={initialOpenProductId}
      categoryOrder={userSettings?.listsCategoryOrder ?? []}
      list={{
        id: list.id,
        name: list.name,
        shareToken: list.shareToken,
        budget: list.budget ?? null,
        project: list.project ? {
          id: list.project.id,
          title: list.project.title,
          hiddenModules: list.project.hiddenModules,
          clientName: list.project.clients[0]?.name ?? null,
          addressStreet: list.project.addressStreet ?? null,
          addressCity: list.project.addressCity ?? null,
          addressPostalCode: list.project.addressPostalCode ?? null,
          addressCountry: list.project.addressCountry ?? null,
        } : null,
        sections: list.sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          sortBy: s.sortBy,
          budget: s.budget ?? null,
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
            category: p.category,
            hidden: p.hidden,
            approval: p.approval,
            productId: p.productId,
            supplier: p.supplier,
            catalogNumber: p.catalogNumber,
            commentCount: p._count.comments,
          })),
        })),
      }}
    />
  );
}
