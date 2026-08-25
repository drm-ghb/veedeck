"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, X, Check, ChevronRight, Users, PushPin, LocalMall, ChatBubble, CheckSquare, Stacks, CalendarDays, NotebookText, ClipboardList, Engineering, Interests, VeezardIcon } from "@/components/ui/icons";
import { useT, useLang } from "@/lib/i18n";
import { PLAN_LABELS } from "@/lib/stripe/prices";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface Subscription {
  id: string; plan: string; status: string;
  cardLast4: string | null; cardBrand: string | null;
  billingName: string | null; cancelAt: Date | string | null; createdAt: Date | string;
}

interface StripeInvoice {
  id: string;
  paidAt: string;
  plan: string | null;
  previousPlan: string | null;
  interval: string | null;
  amount: number;
  currency: string;
  invoiceUrl: string | null;
}

interface Discount {
  id: string; type: string; value: number;
  validFrom: Date | string; validUntil: Date | string | null; note: string | null;
}

interface Props {
  trialEndsAt: string | null;
  isFree: boolean;
  subscription: Subscription | null;
  discounts: Discount[];
  stripeInvoices: StripeInvoice[];
}

/* ─── plans data (moved inside component — see below) ────────────────────── */

const CURRENCIES = ["PLN", "EUR", "USD", "GBP"] as const;
type Currency = typeof CURRENCIES[number];
const CURRENCY_SYMBOLS: Record<Currency, string> = { PLN: "zł", EUR: "€", USD: "$", GBP: "£" };
const TRIAL_DAYS = 30;

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(monthlyPLN: number, yearlyPLN: number, currency: Currency, rates: Record<string, number>, annual: boolean, vatMode: "netto" | "brutto"): string {
  let price = annual ? yearlyPLN : monthlyPLN;
  if (vatMode === "brutto") price = Math.round(price * 1.23);
  if (currency === "PLN") return `${price} zł`;
  const rate = rates[currency];
  if (!rate) return `${price} zł`;
  return `${Math.ceil(price / rate)} ${CURRENCY_SYMBOLS[currency]}`;
}

/* ─── Plans Modal ─────────────────────────────────────────────────────────── */

function PlansModal({ onClose, subscription }: { onClose: () => void; subscription: Subscription | null }) {
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "en" ? "en-US" : "pl-PL";

  const PLAN_MODULES = [
    { label: t.nav.projects,     icon: <Users size={13} /> },
    { label: "ProjectFlow",      icon: <PushPin size={13} /> },
    { label: t.nav.lists,        icon: <LocalMall size={13} /> },
    { label: t.nav.moodboard,    icon: <Interests size={13} /> },
    { label: t.nav.discussions,  icon: <ChatBubble size={13} /> },
    { label: t.nav.tasks,        icon: <CheckSquare size={13} /> },
    { label: t.nav.products,     icon: <Stacks size={13} /> },
    { label: t.nav.calendar,     icon: <CalendarDays size={13} /> },
    { label: t.nav.notes,        icon: <NotebookText size={13} /> },
    { label: t.nav.surveys,      icon: <ClipboardList size={13} /> },
    { label: t.nav.contractors,  icon: <Engineering size={13} /> },
    { label: "Veezard",          icon: <VeezardIcon size={13} /> },
  ];

  const PLANS_DATA = [
    {
      id: "freelancer",
      name: "Solo",
      tagline: t.subscription.soloTagline,
      monthlyPLN: 99,
      regularMonthlyPLN: 129,
      yearlyPLN: 89,
      customPricing: false,
      featured: false,
      teamSize: t.subscription.soloTeamSize,
      features: [
        t.subscription.soloFeature1,
        t.subscription.soloFeature2,
        t.subscription.soloFeature3,
        t.subscription.soloFeature4,
        t.subscription.soloFeature5,
        t.subscription.soloFeature6,
        t.subscription.soloFeature7,
        t.subscription.soloFeature8,
      ],
      upgradeNote: t.subscription.soloUpgradeNote,
    },
    {
      id: "studio",
      name: "Studio",
      tagline: t.subscription.studioTagline,
      monthlyPLN: 219,
      regularMonthlyPLN: 269,
      yearlyPLN: 197,
      customPricing: false,
      featured: true,
      teamSize: t.subscription.studioTeamSize,
      features: [
        t.subscription.studioFeature1,
        t.subscription.studioFeature2,
        t.subscription.studioFeature3,
        t.subscription.studioFeature4,
        t.subscription.studioFeature5,
        t.subscription.studioFeature6,
        t.subscription.studioFeature7,
      ],
      upgradeNote: t.subscription.studioUpgradeNote,
    },
    {
      id: "agencja",
      name: "Biuro",
      tagline: t.subscription.biuroTagline,
      monthlyPLN: 0,
      regularMonthlyPLN: 0,
      yearlyPLN: 0,
      customPricing: true,
      featured: false,
      teamSize: t.subscription.biuroTeamSize,
      features: [
        t.subscription.biuroFeature1,
        t.subscription.biuroFeature2,
        t.subscription.biuroFeature3,
        t.subscription.biuroFeature4,
        t.subscription.biuroFeature5,
        t.subscription.biuroFeature6,
        t.subscription.biuroFeature7,
        t.subscription.biuroFeature8,
      ],
      upgradeNote: null,
    },
  ];

  const [annual, setAnnual] = useState(false);
  const [vatMode, setVatMode] = useState<"netto" | "brutto">("netto");
  const [currency, setCurrency] = useState<Currency>("PLN");
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 4.25, USD: 3.95, GBP: 5.05 });
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exchange-rates")
      .then((r) => r.json())
      .then((data) => {
        setRates(data.rates);
        setRateDate(data.date);
      })
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, []);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleChoosePlan(planId: string) {
    if (planId === "agencja") return; // agencja = kontakt, nie checkout
    setCheckoutError(null);
    setCheckoutLoading(planId);
    try {
      if (subscription?.status === "active") {
        const res = await fetch("/api/portal", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t.subscription.unknownError);
        window.location.href = data.url;
        return;
      }
      const interval = annual ? "year" : "month";
      const stripeCurrency = currency.toLowerCase() as "pln" | "eur" | "usd" | "gbp";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval, currency: stripeCurrency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.subscription.unknownError);
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t.subscription.checkoutError);
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.subscription.modalTitle}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t.subscription.modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-border bg-muted/30">
          {/* Billing toggle */}
          <div className="flex items-center gap-3">
            <button onClick={() => setAnnual(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.subscription.monthly}
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.subscription.annually}
            </button>
            {annual && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {t.subscription.annualDiscount}
              </span>
            )}
          </div>

          {/* VAT toggle */}
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button onClick={() => setVatMode("netto")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${vatMode === "netto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {t.subscription.net}
            </button>
            <button onClick={() => setVatMode("brutto")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${vatMode === "brutto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {t.subscription.gross}
            </button>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border border-border hover:bg-muted"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {checkoutError && (
          <div className="px-6 py-3 bg-destructive/10 text-destructive text-sm border-b border-border">
            {checkoutError}
          </div>
        )}

        {/* Promo banner */}
        <div className="mx-6 mt-4 mb-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300 text-xs font-medium">
          🏷️ {t.subscription.promoBanner}
        </div>

        {/* Plans grid — subgrid aligns rows across cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border mt-4">
          {PLANS_DATA.map((plan) => {
            const isCurrentPlan = subscription?.status === "active" && subscription.plan === plan.id;
            const hasActiveSub = subscription?.status === "active";
            const vatYearly = vatMode === "brutto" ? Math.round(plan.yearlyPLN * 1.23) : plan.yearlyPLN;
            const priceStr = ratesLoading ? "…" : formatPrice(plan.monthlyPLN, plan.yearlyPLN, currency, rates, annual, vatMode);
            const regularStr = !plan.customPricing && plan.regularMonthlyPLN > 0
              ? formatPrice(plan.regularMonthlyPLN, Math.round(plan.regularMonthlyPLN * 0.9), currency, rates, annual, vatMode)
              : null;
            const annualTotal = annual && !plan.customPricing
              ? (currency === "PLN"
                  ? `${vatYearly * 12} zł${t.subscription.perYear}`
                  : `${Math.ceil(vatYearly / (rates[currency] ?? 1) * 12)} ${CURRENCY_SYMBOLS[currency]}${t.subscription.perYear}`)
              : null;
            return (
              <div key={plan.id}
                className={`p-6 ${plan.featured ? "bg-primary/3" : ""}`}
                style={{ display: "grid", gridTemplateRows: "subgrid", gridRow: "span 13" }}>

                {/* Row 1: Badge */}
                <div className="flex justify-center items-start">
                  {isCurrentPlan ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{t.subscription.yourPlan}</span>
                  ) : plan.featured ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">{t.subscription.planRecommended}</span>
                  ) : null}
                </div>

                {/* Row 2: Name */}
                <h3 className="text-lg font-bold text-foreground text-center uppercase tracking-wide">{plan.name}</h3>

                {/* Row 3: Tagline */}
                <p className="text-xs text-muted-foreground leading-snug text-center">{plan.tagline}</p>

                {/* Row 4: Price block */}
                <div className="text-center flex items-baseline justify-center gap-2 pt-3">
                  {plan.customPricing ? (
                    <span className="text-xl font-semibold text-muted-foreground italic">{t.subscription.customPricing}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">{priceStr}</span>
                      {regularStr && !ratesLoading && (
                        <span className="text-sm text-muted-foreground line-through">{regularStr}</span>
                      )}
                      <span className="text-sm text-muted-foreground">{t.subscription.perMonth}{vatMode === "brutto" ? t.subscription.perMonthGross : t.subscription.perMonthNet}</span>
                    </>
                  )}
                </div>

                {/* Row 5: Annual note */}
                <div className="text-center">
                  {annualTotal && !plan.customPricing && (
                    <p className="text-xs text-muted-foreground">{t.subscription.billedAnnually} {annualTotal}</p>
                  )}
                </div>

                {/* Row 6: Team size chip */}
                <div className="flex justify-center py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-full px-3 py-1">
                    <Users size={12} />
                    {plan.teamSize}
                  </span>
                </div>

                {/* Row 7: CTA */}
                <div>
                  {plan.customPricing ? (
                    <a href="https://veedeck.com/kontakt" target="_blank" rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-muted text-foreground hover:bg-muted/70 border border-border text-center block">
                      {t.subscription.letsTalk}
                    </a>
                  ) : (
                    <button onClick={() => handleChoosePlan(plan.id)}
                      disabled={checkoutLoading !== null || isCurrentPlan}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                        isCurrentPlan
                          ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                          : plan.featured
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-foreground hover:bg-muted/70 border border-border"
                      }`}>
                      {checkoutLoading === plan.id ? t.subscription.redirecting
                        : isCurrentPlan
                          ? <span className="flex items-center justify-center gap-1.5"><Check size={14} />{t.subscription.currentPlan}</span>
                          : hasActiveSub ? `${t.subscription.changeTo} ${plan.name}`
                          : `${t.subscription.choosePlan} ${plan.name}`}
                    </button>
                  )}
                </div>

                {/* Row 8: Modules label */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-4">{t.subscription.modules}</p>

                {/* Row 9: Modules grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {PLAN_MODULES.map((mod) => (
                    <div key={mod.label} className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5">
                      <span className="text-muted-foreground/70 shrink-0">{mod.icon}</span>
                      {mod.label}
                    </div>
                  ))}
                </div>

                {/* Row 10: Separator */}
                <hr className="border-border my-2" />

                {/* Row 11: Features label */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t.subscription.whatYouGet}</p>

                {/* Row 12: Features list */}
                <div className="space-y-1.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs text-foreground">
                      <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* Row 13: Upgrade note */}
                <div>
                  {plan.upgradeNote && (
                    <div className="pt-3 border-t border-border flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 leading-snug mt-3">
                      <span className="shrink-0 mt-0.5">↑</span>
                      {plan.upgradeNote}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */

export default function SubscriptionSettings({ trialEndsAt, isFree, subscription: initialSub, discounts, stripeInvoices }: Props) {
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "en" ? "en-US" : "pl-PL";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState(initialSub);

  async function handleGoToPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.subscription.unknownError);
      window.location.href = data.url;
    } catch {
      toast.error(t.subscription.portalError);
      setPortalLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success(t.subscription.checkoutSuccess + " " + (initialSub ? (PLAN_LABELS[initialSub.plan as keyof typeof PLAN_LABELS] ?? initialSub.plan) : "") + "!");
      router.replace("/ustawienia/plan-i-rozliczenia");
    } else if (searchParams.get("portal") === "return") {
      router.replace("/ustawienia/plan-i-rozliczenia");
    }
  }, []);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialDaysUsed = trialDaysLeft !== null ? Math.max(0, TRIAL_DAYS - trialDaysLeft) : 0;
  const trialProgress = Math.min(100, (trialDaysUsed / TRIAL_DAYS) * 100);
  const trialColor = trialDaysLeft === null ? "bg-gray-300"
    : trialDaysLeft <= 3 ? "bg-red-500"
    : trialDaysLeft <= 7 ? "bg-amber-500"
    : "bg-emerald-500";

  const activeDiscount = discounts.find((d) => {
    const now = new Date();
    return new Date(d.validFrom) <= now && (!d.validUntil || new Date(d.validUntil) >= now);
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t.subscription.pageTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t.subscription.pageSubtitle}</p>
      </div>

      {/* Free access */}
      {isFree && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          {t.subscription.freeAccess}
        </div>
      )}

      {/* Trial progress bar */}
      {!isFree && trialDaysLeft !== null && !subscription && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {trialDaysLeft === 0 ? t.subscription.trialExpired : `${t.subscription.trialRemaining} ${trialDaysLeft} ${trialDaysLeft === 1 ? t.subscription.trialDay : t.subscription.trialDays}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trialDaysLeft === 0 ? t.subscription.trialChoosePlan : `${trialDaysUsed} ${t.subscription.trialUsed} ${TRIAL_DAYS} ${t.subscription.trialDaysUsedSuffix}`}
              </p>
            </div>
            <button onClick={() => setShowPlansModal(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
              {t.subscription.upgradePlan}
            </button>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${trialColor}`} style={{ width: `${trialProgress}%` }} />
          </div>
          <p className={`text-xs font-medium ${trialDaysLeft <= 3 ? "text-red-600 dark:text-red-400" : trialDaysLeft <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {trialDaysLeft === 0 ? t.subscription.trialExpiredAccess : `${t.subscription.trialEnding} ${trialDaysLeft} ${trialDaysLeft === 1 ? t.subscription.trialDay : t.subscription.trialDays}.`}
          </p>
        </div>
      )}

      {/* Active subscription */}
      {subscription?.status === "active" && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground capitalize">Plan {PLAN_LABELS[subscription.plan as keyof typeof PLAN_LABELS] ?? subscription.plan}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{t.subscription.statusActive}</p>
                {subscription.cancelAt && new Date(subscription.cancelAt) > new Date() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {t.subscription.cancellationScheduled} {new Date(subscription.cancelAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                {subscription.cardLast4 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.cardBrand ?? t.subscription.cardFallback} •••• {subscription.cardLast4}
                    {subscription.billingName && ` — ${subscription.billingName}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowPlansModal(true)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  {t.subscription.viewPlans}
                </button>
                {subscription.cancelAt && new Date(subscription.cancelAt) > new Date() ? (
                  <button onClick={handleGoToPortal} disabled={portalLoading} className="text-xs text-primary hover:underline disabled:opacity-60">
                    {portalLoading ? t.subscription.redirecting : t.subscription.renewSub}
                  </button>
                ) : (
                  <>
                    <button onClick={handleGoToPortal} disabled={portalLoading} className="text-xs text-primary hover:underline disabled:opacity-60">
                      {portalLoading ? t.subscription.redirecting : t.subscription.changePlanCard}
                    </button>
                    <button onClick={handleGoToPortal} disabled={portalLoading} className="text-xs text-destructive hover:underline disabled:opacity-60">
                      {t.subscription.cancelSub}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled subscription */}
      {subscription?.status === "cancelled" && (
        <div className="bg-card border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">Plan {PLAN_LABELS[subscription.plan as keyof typeof PLAN_LABELS] ?? subscription.plan}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">{t.subscription.statusCancelled}</p>
              {subscription.cancelAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.subscription.accessExpiresAt} {new Date(subscription.cancelAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button onClick={handleGoToPortal} disabled={portalLoading} className="text-xs text-primary hover:underline disabled:opacity-60">{t.subscription.renewSub}</button>
          </div>
        </div>
      )}

      {/* Discount */}
      {activeDiscount && (
        <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-700 dark:text-violet-400">
          {t.subscription.activeDiscount} <span className="font-semibold">
            {activeDiscount.type === "percent" ? `${activeDiscount.value}%` : `${activeDiscount.value} zł`}
          </span>
          {activeDiscount.validUntil && ` (${t.subscription.discountUntil} ${new Date(activeDiscount.validUntil).toLocaleDateString(dateLocale)})`}
          {activeDiscount.note && ` — ${activeDiscount.note}`}
        </div>
      )}

      {/* "Ulepsz plan" button for users with active sub */}
      {!isFree && !trialDaysLeft && !subscription && (
        <button onClick={() => setShowPlansModal(true)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          {t.subscription.upgradePlan}
        </button>
      )}

      {/* Historia rozliczeń */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.subscription.billingHistory}</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        {stripeInvoices.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t.subscription.noBillingHistory}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.subscription.noBillingHistoryDesc}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.subscription.colDate}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.subscription.colPlan}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.subscription.colPeriod}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.subscription.colAmount}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stripeInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      {new Date(inv.paidAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      {inv.previousPlan ? (
                        <span className="flex items-center gap-1">
                          <span className="capitalize text-muted-foreground">{PLAN_LABELS[inv.previousPlan as keyof typeof PLAN_LABELS] ?? inv.previousPlan}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="capitalize font-medium">{inv.plan ? (PLAN_LABELS[inv.plan as keyof typeof PLAN_LABELS] ?? inv.plan) : "—"}</span>
                        </span>
                      ) : (
                        <span className="capitalize">{inv.plan ? (PLAN_LABELS[inv.plan as keyof typeof PLAN_LABELS] ?? inv.plan) : "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.interval === "yearly" ? t.subscription.yearly : inv.interval === "monthly" ? t.subscription.monthlyLabel : "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {inv.amount.toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.invoiceUrl && (
                        <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{t.subscription.invoice}</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showPlansModal && <PlansModal onClose={() => setShowPlansModal(false)} subscription={subscription} />}
    </div>
  );
}
