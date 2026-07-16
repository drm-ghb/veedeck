import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { readFileSync } from "fs";

// Load .env manually
const env = readFileSync(".env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...rest] = line.trim().split("=");
  if (k && !k.startsWith("#") && !process.env[k]) {
    process.env[k] = rest.join("=").replace(/^"|"$/g, "");
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const projects = await prisma.project.findMany({
  where: { title: "test" },
  select: { id: true, title: true, archived: true, modules: true, clientId: true },
});

console.log(JSON.stringify(projects, null, 2));

const testtt = projects[0];
if (testtt && !testtt.archived) {
  console.log("\nArchiwizuję 'testtt'...");
  await prisma.project.update({ where: { id: testtt.id }, data: { archived: true } });
  console.log("Gotowe.");
} else if (testtt?.archived) {
  console.log("\n'testtt' już jest zarchiwizowany.");
} else {
  console.log("\nProjekt 'testtt' nie znaleziony.");
}

await prisma.$disconnect();
await pool.end();
