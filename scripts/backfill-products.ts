import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Get all list products with their section -> list -> user chain
  const listProducts = await prisma.listProduct.findMany({
    include: {
      section: {
        include: {
          list: {
            select: { userId: true },
          },
        },
      },
    },
  });

  console.log(`Found ${listProducts.length} list products`);

  let created = 0;
  let skipped = 0;

  for (const lp of listProducts) {
    const userId = lp.section.list.userId;

    // Check for existing product (dedup by name OR url)
    const existing = await prisma.product.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: lp.name, mode: "insensitive" } },
          ...(lp.url?.trim() ? [{ url: lp.url.trim() }] : []),
        ],
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        name: lp.name,
        url: lp.url || null,
        imageUrl: lp.imageUrl || null,
        price: lp.price || null,
        manufacturer: lp.manufacturer || null,
        color: lp.color || null,
        dimensions: lp.dimensions || null,
        description: lp.description || null,
        deliveryTime: lp.deliveryTime || null,
        quantity: lp.quantity,
        category: lp.category || null,
        userId,
      },
    });
    created++;
  }

  console.log(`Done: ${created} added, ${skipped} skipped (duplicates)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
