import { getStripe } from "@/lib/stripe/client";
import { getPlanFromPriceId } from "@/lib/stripe/prices";
import { updateSubscriptionStatus } from "@/lib/db/subscriptions";
import { prisma } from "@/lib/prisma";

/**
 * Wywołaj po powrocie z Stripe Customer Portal (?portal=return).
 * Odpytuje Stripe o aktualny stan subskrypcji i synchronizuje DB.
 */
export async function syncPortalReturn(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) return;

  const stripe = getStripe();

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 1,
    status: "all",
  });

  const sub = subscriptions.data[0];

  if (!sub) {
    // Brak subskrypcji w Stripe — oznacz jako cancelled w DB
    await prisma.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "cancelled" },
    });
    return;
  }

  const priceId = sub.items.data[0]?.price?.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

  await updateSubscriptionStatus({
    stripeCustomerId: user.stripeCustomerId,
    status: sub.status,
    plan: plan ?? undefined,
    cancelAt,
  });
}
