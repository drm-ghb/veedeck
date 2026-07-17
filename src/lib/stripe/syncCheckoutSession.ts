import { getStripe } from "@/lib/stripe/client";
import { getPlanFromPriceId } from "@/lib/stripe/prices";
import { saveStripeCustomerForUser, updateSubscriptionStatus } from "@/lib/db/subscriptions";
import { prisma } from "@/lib/prisma";

/**
 * Wywołaj po powrocie z Stripe Checkout (?checkout=success&session_id=...).
 * Odpytuje Stripe bezpośrednio i synchronizuje stan subskrypcji w DB.
 * Bezpieczne: weryfikuje że session_id należy do zalogowanego usera.
 */
export async function syncCheckoutSession(sessionId: string, userId: string): Promise<void> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "subscription.items.data.price"],
  });

  // Weryfikacja własności — metadata.userId musi zgadzać się z zalogowanym userem
  if (session.metadata?.userId !== userId) {
    console.warn("[syncCheckoutSession] userId mismatch, pomijam sync");
    return;
  }

  if (session.status !== "complete") return;

  // Zapisz stripeCustomerId jeśli jeszcze nie ma
  if (session.customer && typeof session.customer === "string") {
    await saveStripeCustomerForUser(userId, session.customer);
  }

  // Zaktualizuj subskrypcję na podstawie danych z Stripe
  const sub = session.subscription;
  if (!sub || typeof sub === "string") return;

  const priceId = sub.items.data[0]?.price?.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;
  const planName = plan ?? session.metadata?.plan ?? undefined;
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;

  await updateSubscriptionStatus({
    stripeCustomerId: sub.customer as string,
    status: sub.status,
    plan: planName,
    cancelAt,
  });

  // Utwórz billing record jeśli jeszcze nie istnieje (na prod robi to webhook invoice.paid)
  if (session.invoice && typeof session.invoice === "string") {
    const invoice = await stripe.invoices.retrieve(session.invoice);
    if (invoice.amount_paid > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (user) {
        const existing = await prisma.billingRecord.findFirst({
          where: { userId: user.id, invoiceUrl: invoice.hosted_invoice_url ?? undefined },
        });
        if (!existing) {
          const interval =
            (invoice.lines?.data?.[0] as any)?.price?.recurring?.interval ?? "month";
          const paidAt = invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date();
          await prisma.billingRecord.create({
            data: {
              userId: user.id,
              plan: planName ?? "unknown",
              interval,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              paidAt,
              invoiceUrl: invoice.hosted_invoice_url ?? null,
            },
          });
        }
      }
    }
  }
}
