import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import Stripe from "stripe";
import {
  saveStripeCustomerForUser,
  updateSubscriptionStatus,
} from "@/lib/db/subscriptions";
import { getPlanFromPriceId } from "@/lib/stripe/prices";
import { prisma } from "@/lib/prisma";
import { notifyAdminNewPayment } from "@/lib/email";

export const runtime = "nodejs"; // wymagane, Stripe SDK nie działa na edge runtime

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Brak podpisu webhooka" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Nieprawidłowy podpis webhooka Stripe:", err);
    return NextResponse.json({ error: "Nieprawidłowy podpis" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.customer) {
        await saveStripeCustomerForUser(userId, session.customer as string);
      }
      const user = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } })
        : null;
      await notifyAdminNewPayment({
        userEmail: user?.email ?? session.customer_details?.email ?? "nieznany",
        userName: user?.fullName ?? null,
        plan: session.metadata?.plan ?? "nieznany",
        interval: session.metadata?.interval ?? "nieznany",
        amountTotal: session.amount_total,
        currency: session.currency,
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id;
      const planFromPrice = priceId ? getPlanFromPriceId(priceId) : null;
      if (priceId && !planFromPrice) {
        console.warn("[webhook] Nieznany priceId, plan nie zaktualizowany:", priceId);
        break;
      }
      const plan = planFromPrice ?? subscription.metadata?.plan;
      await updateSubscriptionStatus({
        stripeCustomerId: subscription.customer as string,
        status: subscription.status,
        plan: plan ?? undefined,
        currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionStatus({
        stripeCustomerId: subscription.customer as string,
        status: "canceled",
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.customer || invoice.amount_paid === 0) break;

      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: invoice.customer as string },
        select: { id: true, subscription: { select: { plan: true } } },
      });
      if (!user) break;

      const plan = user.subscription?.plan ?? "unknown";
      const interval = (invoice.lines?.data?.[0] as any)?.price?.recurring?.interval ?? "month";
      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date();

      await prisma.billingRecord.create({
        data: {
          userId: user.id,
          plan,
          interval,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          paidAt,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
        },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn("Nieudana płatność dla klienta:", invoice.customer);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
