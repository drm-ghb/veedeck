import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const result = await prisma.listProduct.updateMany({
    where: { productId: { not: null } },
    data: { productId: null },
  });
  console.log(`Cleared productId from ${result.count} list products`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
