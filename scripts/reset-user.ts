import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = "bigdan799@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, trialEndsAt: true, isFree: true, stripeCustomerId: true, subscription: { select: { id: true, status: true } } },
  });

  console.log("Before:", JSON.stringify(user, null, 2));

  if (!user) { console.log("User not found"); process.exit(1); }

  if (user.subscription) {
    await prisma.userSubscription.delete({ where: { userId: user.id } });
    console.log("Subscription deleted");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: null,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Done — trial reset to 14 days from now, stripeCustomerId cleared");
}

main().finally(() => prisma.$disconnect());
