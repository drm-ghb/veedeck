import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SOURCE_EMAILS = ["bigdan799@gmail.com", "adriannaliskowicz@gmail.com"];

const users = await prisma.user.findMany({
  where: { email: { in: SOURCE_EMAILS } },
  select: { id: true, email: true },
});

const result = {};

for (const user of users) {
  const lists = await prisma.shoppingList.findMany({
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

  result[user.email] = lists.map(l => ({
    name: l.name,
    budget: l.budget,
    hidePrices: l.hidePrices,
    sections: l.sections.map(s => ({
      name: s.name,
      budget: s.budget,
      unsorted: s.unsorted,
      products: s.products,
    })),
  }));
}

console.log(JSON.stringify(result, null, 2));

await prisma.$disconnect();
await pool.end();
