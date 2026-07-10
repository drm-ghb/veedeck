import { prisma } from "@/lib/prisma";

export async function saveStripeCustomerForUser(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId },
  });
}

export async function updateSubscriptionStatus(params: {
  stripeCustomerId: string;
  status: string;
  plan?: string;
  currentPeriodEnd?: Date;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: params.stripeCustomerId },
    select: { id: true },
  });

  if (!user) {
    console.error("[subscriptions] Nie znaleziono usera dla stripeCustomerId:", params.stripeCustomerId);
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      status: params.status,
      ...(params.plan ? { plan: params.plan } : {}),
      ...(params.currentPeriodEnd ? { cancelAt: params.currentPeriodEnd } : {}),
    },
    create: {
      userId: user.id,
      plan: params.plan ?? "unknown",
      status: params.status,
      ...(params.currentPeriodEnd ? { cancelAt: params.currentPeriodEnd } : {}),
    },
  });
}
