import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUserId } from "@/lib/workspace";
import BibliotecaView from "@/components/produkty/BibliotecaView";

export default async function ProduktyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = getWorkspaceUserId(session);

  const [products, textures, models3d] = await Promise.all([
    prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.texture.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.model3D.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <BibliotecaView
      initialTextures={textures.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        imageUrl: t.imageUrl,
        manufacturer: t.manufacturer,
        resolution: t.resolution,
        scale: t.scale,
        finish: t.finish,
        favorite: t.favorite,
        isPbr: t.isPbr,
        urlAlbedo: t.urlAlbedo,
        urlNormal: t.urlNormal,
        urlRoughness: t.urlRoughness,
        urlMetallic: t.urlMetallic,
        urlAo: t.urlAo,
        urlHeight: t.urlHeight,
        createdAt: t.createdAt.toISOString(),
      }))}
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
        favorite: p.favorite,
        source: p.source,
        createdAt: p.createdAt.toISOString(),
      }))}
      initialModels3d={models3d.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        thumbnailUrl: m.thumbnailUrl,
        urlGlb: m.urlGlb,
        meshyTaskId: m.meshyTaskId,
        linkedProductId: m.linkedProductId,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
