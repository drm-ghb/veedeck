import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hash = await bcrypt.hash('admin', 10);

const user = await prisma.user.create({
  data: {
    name: 'admin',
    email: 'admin@renderflow.local',
    password: hash,
    isAdmin: true,
  }
});

console.log('Utworzono konto admina:');
console.log('  ID:', user.id);
console.log('  Email:', user.email);
console.log('  Nazwa:', user.name);
console.log('  isAdmin:', user.isAdmin);

await prisma.$disconnect();
await pool.end();
