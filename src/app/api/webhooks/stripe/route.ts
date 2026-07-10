import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import Stripe from "stripe";
import {
  saveStripeCustomerForUser,
  updateSubscriptionStatus,
} from "@/lib/db/subscriptions";

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
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionStatus({
        stripeCustomerId: subscription.customer as string,
        status: subscription.status, // "trialing" | "active" | "past_due" | ...
        plan: subscription.metadata?.plan,
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
