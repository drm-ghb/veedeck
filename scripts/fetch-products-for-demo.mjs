import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SOURCE_EMAIL = "adriannaliskowicz@gmail.com";

const user = await prisma.user.findUnique({
  where: { email: SOURCE_EMAIL },
  select: { id: true },
});

if (!user) {
  console.error("User not found:", SOURCE_EMAIL);
  process.exit(1);
}

const products = await prisma.product.findMany({
  where: { userId: user.id },
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
    catalogNumber: true,
    supplier: true,
    dimensions: true,
    category: true,
    favorite: true,
  },
  orderBy: { createdAt: "asc" },
});

console.log(JSON.stringify(products, null, 2));
console.error(`Fetched ${products.length} products`);

await prisma.$disconnect();
await pool.end();
