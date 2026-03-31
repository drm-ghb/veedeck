import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const result = await prisma.project.updateMany({
    where: { modules: { isEmpty: true } },
    data: { modules: ["renderflow"] },
  });
  console.log(`Updated ${result.count} existing projects → modules: ["renderflow"]`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
