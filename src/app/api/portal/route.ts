import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "Ten użytkownik nie ma jeszcze subskrypcji Stripe" },
        { status: 400 }
      );
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/ustawienia/plan-i-rozliczenia?portal=return`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Błąd tworzenia portal session:", err);
    return NextResponse.json(
      { error: "Nie udało się otworzyć panelu zarządzania subskrypcją" },
      { status: 500 }
    );
  }
}
