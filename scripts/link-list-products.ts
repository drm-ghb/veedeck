import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const listProducts = await prisma.listProduct.findMany({
    where: { productId: null },
    include: {
      section: { include: { list: { select: { userId: true } } } },
    },
  });

  console.log(`Found ${listProducts.length} unlinked list products`);

  let linked = 0;
  let notFound = 0;

  for (const lp of listProducts) {
    const userId = lp.section.list.userId;

    const product = await prisma.product.findFirst({
      where: {
        userId,
        OR: [
          { name: { equals: lp.name, mode: "insensitive" } },
          ...(lp.url?.trim() ? [{ url: lp.url.trim() }] : []),
        ],
      },
    });

    if (!product) {
      notFound++;
      continue;
    }

    await prisma.listProduct.update({
      where: { id: lp.id },
      data: { productId: product.id },
    });
    linked++;
  }

  console.log(`Done: ${linked} linked, ${notFound} no matching product`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
