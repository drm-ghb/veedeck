import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import ProduktyView from "@/components/produkty/ProduktyView";

export default async function ProduktyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);

  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProduktyView
      initialProducts={products.map((p) => ({
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
        category: p.category,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
