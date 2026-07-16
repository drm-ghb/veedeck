import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.findUnique({
  where: { email: "d.rychlik@veedeck.com" },
  select: { id: true },
});

if (!user) {
  console.log("User not found");
  process.exit(1);
}

const lists = await prisma.shoppingList.findMany({
  where: { userId: user.id },
  select: { id: true, name: true },
  orderBy: { order: "asc" },
});

console.log(JSON.stringify(lists, null, 2));

await prisma.$disconnect();
await pool.end();
