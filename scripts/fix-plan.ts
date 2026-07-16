import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = "bigdan799@gmail.com";

  const { rows: users } = await pool.query(
    `SELECT id FROM "User" WHERE email = $1`,
    [email]
  );
  if (!users.length) { console.log("User not found"); process.exit(1); }
  const userId = users[0].id;
  console.log("userId:", userId);

  const { rows: subs } = await pool.query(
    `SELECT id, plan, status FROM "Subscription" WHERE "userId" = $1`,
    [userId]
  );
  console.log("Current subscription:", subs[0]);

  const { rows: updated } = await pool.query(
    `UPDATE "Subscription" SET plan = 'studio' WHERE "userId" = $1 RETURNING id, plan, status`,
    [userId]
  );
  console.log("Updated:", updated[0]);

  await pool.end();
}

main().catch(console.error);
