import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import {
  getPriceId,
  isPlanId,
  isBillingInterval,
  isCurrency,
  PROMO_COUPONS,
} from "@/lib/stripe/prices";

function getPromoCoupon(plan: string): string | null {
  const endsAt = process.env.PROMO_ENDS_AT;
  if (!endsAt) return null;
  if (new Date() >= new Date(endsAt)) return null;
  return PROMO_COUPONS[plan as keyof typeof PROMO_COUPONS] ?? null;
}
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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

    const promoCoupon = getPromoCoupon(plan);

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      ...(user.stripeCustomerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      payment_method_collection: "if_required",
      // Jeśli promo aktywne — dołącz kupon. discounts i allow_promotion_codes są wzajemnie wykluczające się.
      ...(promoCoupon
        ? { discounts: [{ coupon: promoCoupon }] }
        : { allow_promotion_codes: true }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/ustawienia/plan-i-rozliczenia?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/ustawienia/plan-i-rozliczenia?checkout=cancelled`,
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
