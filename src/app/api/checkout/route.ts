import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import {
  getPriceId,
  isPlanId,
  isBillingInterval,
  isCurrency,
} from "@/lib/stripe/prices";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const TRIAL_DAYS = 14;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, interval, currency } = body as {
      plan?: string;
      interval?: string;
      currency?: string;
    };

    if (!plan || !isPlanId(plan)) {
      return NextResponse.json({ error: "Nieprawidłowy plan" }, { status: 400 });
    }
    if (!interval || !isBillingInterval(interval)) {
      return NextResponse.json({ error: "Nieprawidłowy interwał rozliczenia" }, { status: 400 });
    }
    if (!currency || !isCurrency(currency)) {
      return NextResponse.json({ error: "Nieprawidłowa waluta" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }

    const priceId = getPriceId(plan, interval, currency);

    // Jeśli user ma już stripeCustomerId (z poprzedniej subskrypcji/trialu) — użyj go,
    // żeby Stripe nie tworzył duplikatów klientów.
    const customerParams = user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email };

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
      },
      payment_method_collection: "if_required",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/ustawienia/wtyczka?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/ustawienia/wtyczka?checkout=cancelled`,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
      ...customerParams,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Błąd tworzenia checkout session:", err);
    return NextResponse.json(
      { error: "Nie udało się utworzyć sesji płatności" },
      { status: 500 }
    );
  }
}
