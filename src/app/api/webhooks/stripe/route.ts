import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import Stripe from "stripe";
import {
  saveStripeCustomerForUser,
  updateSubscriptionStatus,
} from "@/lib/db/subscriptions";
import { getPlanFromPriceId, PLAN_LABELS } from "@/lib/stripe/prices";

function planLabel(id: string | null | undefined): string {
  if (!id) return "nieznany";
  return PLAN_LABELS[id as keyof typeof PLAN_LABELS] ?? id;
}
import { prisma } from "@/lib/prisma";
import { notifyAdminNewPayment, sendPaymentFailedEmail, notifyAdminSubscriptionChanged } from "@/lib/email";

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
        plan: planLabel(session.metadata?.plan),
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
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      });

      if (event.type === "customer.subscription.updated") {
        const prev = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
          select: { email: true, fullName: true },
        });
        const prevPriceId = (prev?.items as any)?.data?.[0]?.price?.id;
        const prevPlan = prevPriceId ? getPlanFromPriceId(prevPriceId) : null;
        if (prevPlan && planFromPrice && prevPlan !== planFromPrice) {
          await notifyAdminSubscriptionChanged({
            userEmail: user?.email ?? "nieznany",
            userName: user?.fullName ?? null,
            changeType: "plan_change",
            oldPlan: planLabel(prevPlan),
            newPlan: planLabel(planFromPrice),
          });
        } else if (prev?.cancel_at !== undefined && !prev.cancel_at && subscription.cancel_at) {
          await notifyAdminSubscriptionChanged({
            userEmail: user?.email ?? "nieznany",
            userName: user?.fullName ?? null,
            changeType: "cancel_scheduled",
            newPlan: planLabel(plan),
            cancelAt: new Date(subscription.cancel_at * 1000),
          });
        } else if (prev?.cancel_at !== undefined && prev.cancel_at && !subscription.cancel_at) {
          await notifyAdminSubscriptionChanged({
            userEmail: user?.email ?? "nieznany",
            userName: user?.fullName ?? null,
            changeType: "cancel_revoked",
            newPlan: planLabel(plan),
          });
        }
      }
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
      if (!invoice.customer) break;
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: invoice.customer as string },
        select: { email: true },
      });
      if (user?.email) {
        await sendPaymentFailedEmail({ to: user.email }).catch((err) =>
          console.error("[webhook] sendPaymentFailedEmail failed:", err)
        );
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
