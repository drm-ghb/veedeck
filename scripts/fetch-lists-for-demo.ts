import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg as any;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const SOURCE_EMAILS = ["bigdan799@gmail.com", "adriannaliskowicz@gmail.com"];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: SOURCE_EMAILS } },
    select: { id: true, email: true },
  });

  for (const user of users) {
    console.log(`\n=== ${user.email} ===`);

    const lists = await (prisma as any).shoppingList.findMany({
      where: { userId: user.id, archived: false },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            products: {
              where: { hidden: false },
              orderBy: { order: "asc" },
              select: {
                name: true,
                url: true,
                imageUrl: true,
                price: true,
                manufacturer: true,
                color: true,
                description: true,
                deliveryTime: true,
                quantity: true,
                optional: true,
                catalogNumber: true,
                supplier: true,
                dimensions: true,
                category: true,
                note: true,
              },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    console.log(JSON.stringify(lists.map((l: any) => ({
      name: l.name,
      budget: l.budget,
      hidePrices: l.hidePrices,
      sections: l.sections.map((s: any) => ({
        name: s.name,
        budget: s.budget,
        unsorted: s.unsorted,
        products: s.products,
      })),
    })), null, 2));
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
