export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SubscriptionSettings from "@/components/settings/SubscriptionSettings";
import { syncCheckoutSession } from "@/lib/stripe/syncCheckoutSession";
import { syncPortalReturn } from "@/lib/stripe/syncPortalReturn";
import { getStripe } from "@/lib/stripe/client";
import { getPlanFromPriceId } from "@/lib/stripe/prices";

export default async function PlanIRozliczeniaPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string; portal?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  if (params.checkout === "success" && params.session_id) {
    try {
      await syncCheckoutSession(params.session_id, session.user.id);
    } catch (err) {
      console.error("[PlanIRozliczeniaPage] sync checkout error:", err);
    }
  }

  if (params.portal === "return") {
    try {
      await syncPortalReturn(session.user.id);
    } catch (err) {
      console.error("[PlanIRozliczeniaPage] sync portal error:", err);
    }
  }

  const [user, subscription, discounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trialEndsAt: true, isFree: true, stripeCustomerId: true },
    }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.discount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Fetch invoices directly from Stripe
  let stripeInvoices: {
    id: string;
    paidAt: string;
    plan: string | null;
    previousPlan: string | null;
    interval: string | null;
    amount: number;
    currency: string;
    invoiceUrl: string | null;
  }[] = [];

  if (user?.stripeCustomerId) {
    try {
      const stripe = getStripe();
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 100,
      });

      // For upgrade invoices Stripe creates proration lines — find the main (positive amount) line
      const getMainLine = (inv: { lines?: { data: any[] } }) => {
        const lines = inv.lines?.data ?? [];
        return (
          lines.find((l: any) => !l.proration && l.amount > 0) ??
          lines.find((l: any) => l.amount > 0) ??
          lines[0] ??
          null
        );
      };

      // price.id may be null on proration lines — fall back to parsing description
      const getPlanFromLine = (line: any): string | null => {
        const priceId = !line?.price ? null : typeof line.price === "string" ? line.price : line.price?.id ?? null;
        if (priceId) return getPlanFromPriceId(priceId);
        const desc = (line?.description ?? "").toUpperCase();
        if (desc.includes("STUDIO")) return "studio";
        if (desc.includes("SOLO") || desc.includes("FREELANCER")) return "freelancer";
        return null;
      };

      const getInterval = (line: any, inv: any): string | null => {
        // Try from line price first
        if (line?.price && typeof line.price !== "string") {
          const i = line.price?.recurring?.interval;
          if (i) return i;
        }
        // Fall back to subscription items
        const sub = typeof inv.subscription === "string" ? null : inv.subscription;
        return sub?.items?.data?.[0]?.price?.recurring?.interval ?? null;
      };

      // invoices.data is newest-first; invoices.data[i+1] is the previous payment
      const plans = invoices.data.map((inv) => getPlanFromLine(getMainLine(inv)));
      stripeInvoices = invoices.data.map((inv, i) => {
        const line = getMainLine(inv);
        const interval = getInterval(line, inv);
        const plan = plans[i];
        const previousPlan = plans[i + 1] ?? null;
        return {
          id: inv.id,
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date((inv as any).created * 1000).toISOString(),
          plan,
          previousPlan: previousPlan !== plan ? previousPlan : null,
          interval: interval === "year" ? "yearly" : interval === "month" ? "monthly" : interval,
          amount: inv.total / 100,
          currency: inv.currency.toUpperCase(),
          invoiceUrl: inv.hosted_invoice_url ?? null,
        };
      }).filter((inv) => inv.amount > 0);
    } catch (err) {
      console.error("[PlanIRozliczeniaPage] stripe invoices error:", String(err));
    }
  }

  return (
    <SubscriptionSettings
      trialEndsAt={user?.trialEndsAt?.toISOString() ?? null}
      isFree={user?.isFree ?? false}
      subscription={subscription}
      discounts={discounts}
      stripeInvoices={stripeInvoices}
    />
  );
}
