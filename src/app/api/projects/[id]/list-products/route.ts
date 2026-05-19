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
  const userId = getWorkspaceUserId(session);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // Fetch all ListProducts from non-archived shopping lists of this project
  const lists = await prisma.shoppingList.findMany({
    where: { projectId: id, archived: false },
    include: {
      sections: {
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  url: true,
                  price: true,
                  manufacturer: true,
                },
              },
            },
          },
        },
      },
    },
  });

  type ProductEntry = {
    id: string;
    name: string;
    imageUrl: string | null;
    url: string | null;
    price: string | null;
    manufacturer: string | null;
    sectionIds: string[];
  };

  const productMap = new Map<string, ProductEntry>();
  const seenSections = new Set<string>();
  const sections: { id: string; name: string }[] = [];

  for (const list of lists) {
    for (const section of list.sections) {
      // Register real sections (skip the hidden unsorted bucket)
      if (!section.unsorted) {
        if (!seenSections.has(section.id)) {
          seenSections.add(section.id);
          sections.push({ id: section.id, name: section.name });
        }
      }
      for (const lp of section.products) {
        const key = lp.productId ? lp.productId : `lp:${lp.id}`;
        if (!productMap.has(key)) {
          productMap.set(key, {
            id: lp.product ? lp.product.id : `lp:${lp.id}`,
            name: lp.product ? lp.product.name : lp.name,
            imageUrl: lp.product ? lp.product.imageUrl : lp.imageUrl,
            url: lp.product ? lp.product.url : lp.url,
            price: lp.product ? lp.product.price : lp.price,
            manufacturer: lp.product ? lp.product.manufacturer : lp.manufacturer,
            sectionIds: [],
          });
        }
        // Only tag the product with a sectionId for real (named) sections
        if (!section.unsorted) {
          const entry = productMap.get(key)!;
          if (!entry.sectionIds.includes(section.id)) entry.sectionIds.push(section.id);
        }
      }
    }
  }

  return NextResponse.json({ products: Array.from(productMap.values()), sections });
}
