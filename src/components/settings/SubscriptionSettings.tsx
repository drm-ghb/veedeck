"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, X, Check, ChevronRight, Users, PushPin, LocalMall, ChatBubble, CheckSquare, Package, CalendarDays, NotebookText, ClipboardList, Engineering } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { PLAN_LABELS } from "@/lib/stripe/prices";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface Subscription {
  id: string; plan: string; status: string;
  cardLast4: string | null; cardBrand: string | null;
  billingName: string | null; cancelAt: Date | string | null; createdAt: Date | string;
}

interface BillingRecord {
  id: string; plan: string; interval: string;
  amount: number; currency: string; paidAt: Date | string; invoiceUrl: string | null;
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
  billingRecords: BillingRecord[];
}

/* ─── plans data ─────────────────────────────────────────────────────────── */

const PLAN_MODULES = [
  { label: "Klienci",         icon: <Users size={13} /> },
  { label: "ProjectFlow",     icon: <PushPin size={13} /> },
  { label: "Listy zakupowe",  icon: <LocalMall size={13} /> },
  { label: "Dyskusje",        icon: <ChatBubble size={13} /> },
  { label: "Zadania",         icon: <CheckSquare size={13} /> },
  { label: "Produkty",        icon: <Package size={13} /> },
  { label: "Kalendarz",       icon: <CalendarDays size={13} /> },
  { label: "Notatnik",        icon: <NotebookText size={13} /> },
  { label: "Ankiety",         icon: <ClipboardList size={13} /> },
  { label: "Wykonawcy",       icon: <Engineering size={13} /> },
];

const PLANS_DATA = [
  {
    id: "freelancer",
    name: "Solo",
    tagline: "Dla freelancera prowadzącego projekty samodzielnie",
    monthlyPLN: 99,
    regularMonthlyPLN: 129,
    yearlyPLN: 89,
    customPricing: false,
    featured: false,
    teamSize: "1 użytkownik",
    features: [
      "Profesjonalny portal dla klienta i wykonawcy",
      "Centrum komunikacji z klientami i wykonawcami",
      "Akceptacja renderów i produktów bez chaosu",
      "Harmonogram i płatności pod kontrolą",
      "Własne logo i kolory w panelu klienta",
      "Zapisuj produkty z sieci jednym klikiem (veepick)",
      "Bez limitów · projekty, przestrzeń, historia wersji",
      "Pomoc w przeniesieniu list zakupowych z innych narzędzi",
    ],
    upgradeNote: "Gdy dołączy współpracownik — przejdź na Studio.",
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Dla pracowni z małym zespołem i wieloma projektami",
    monthlyPLN: 219,
    regularMonthlyPLN: 269,
    yearlyPLN: 197,
    customPricing: false,
    featured: true,
    teamSize: "3 użytkowników",
    features: [
      "Wszystko z Solo",
      "Centrum komunikacji z zespołem, klientami i wykonawcami",
      "Wspólna praca z zespołem · do 2 osób",
      "Harmonogram i płatności",
      "Zaawansowane uprawnienia dla członków zespołu",
      "Szkolenie dla zespołu w cenie planu",
      "Nielimitowane projekty i przestrzeń dyskowa",
    ],
    upgradeNote: "Potrzebujesz więcej miejsc? Przejdź na Biuro.",
  },
  {
    id: "agencja",
    name: "Biuro",
    tagline: "Dla dużych pracowni i agencji bez kompromisów",
    monthlyPLN: 0,
    regularMonthlyPLN: 0,
    yearlyPLN: 0,
    customPricing: true,
    featured: false,
    teamSize: "do ustalenia",
    features: [
      "Wszystko z Studio",
      "Liczba członków zespołu · dopasowana do potrzeb",
      "White label · panel klienta w pełni pod Twoją marką",
      "Harmonogram i płatności w skali agencji",
      "Dedykowane funkcje na potrzeby Twojego biura",
      "Integracje z narzędziami zewnętrznymi",
      "Integracje z systemami księgowymi",
      "Dedykowane wsparcie i onboarding",
    ],
    upgradeNote: null,
  },
];

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
        if (!res.ok) throw new Error(data.error ?? "Nieznany błąd");
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
      if (!res.ok) throw new Error(data.error ?? "Nieznany błąd");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Nie udało się przejść do płatności");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Wybierz plan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">30-dniowy trial bezpłatnie · Nie wymaga karty kredytowej</p>
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
              Miesięcznie
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Rocznie
            </button>
            {annual && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                −10% rocznie
              </span>
            )}
          </div>

          {/* VAT toggle */}
          <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button onClick={() => setVatMode("netto")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${vatMode === "netto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              Netto
            </button>
            <button onClick={() => setVatMode("brutto")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${vatMode === "brutto" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              Brutto
            </button>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2">
            {rateDate && currency !== "PLN" && (
              <span className="text-xs text-muted-foreground">kurs z {rateDate}</span>
            )}
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
          🏷️ Ceny promocyjne przez pierwsze 6 miesięcy od startu — potem cena standardowa
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
                  ? `${vatYearly * 12} zł/rok`
                  : `${Math.ceil(vatYearly / (rates[currency] ?? 1) * 12)} ${CURRENCY_SYMBOLS[currency]}/rok`)
              : null;
            return (
              <div key={plan.id}
                className={`p-6 ${plan.featured ? "bg-primary/3" : ""}`}
                style={{ display: "grid", gridTemplateRows: "subgrid", gridRow: "span 13" }}>

                {/* Row 1: Badge */}
                <div className="flex justify-center items-start">
                  {isCurrentPlan ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Twój plan</span>
                  ) : plan.featured ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">Polecany</span>
                  ) : null}
                </div>

                {/* Row 2: Name */}
                <h3 className="text-lg font-bold text-foreground text-center uppercase tracking-wide">{plan.name}</h3>

                {/* Row 3: Tagline */}
                <p className="text-xs text-muted-foreground leading-snug text-center">{plan.tagline}</p>

                {/* Row 4: Price block */}
                <div className="text-center flex items-baseline justify-center gap-2 pt-3">
                  {plan.customPricing ? (
                    <span className="text-xl font-semibold text-muted-foreground italic">Cena ustalana indywidualnie</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-foreground">{priceStr}</span>
                      {regularStr && !ratesLoading && (
                        <span className="text-sm text-muted-foreground line-through">{regularStr}</span>
                      )}
                      <span className="text-sm text-muted-foreground">/mies.{vatMode === "brutto" ? " brutto" : " netto"}</span>
                    </>
                  )}
                </div>

                {/* Row 5: Annual note */}
                <div className="text-center">
                  {annualTotal && !plan.customPricing && (
                    <p className="text-xs text-muted-foreground">Rozliczane {annualTotal}</p>
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
                      Porozmawiajmy ↗
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
                      {checkoutLoading === plan.id ? "Przekierowuję…"
                        : isCurrentPlan
                          ? <span className="flex items-center justify-center gap-1.5"><Check size={14} />Posiadasz</span>
                          : hasActiveSub ? `Zmień na ${plan.name}`
                          : `Wybierz ${plan.name}`}
                    </button>
                  )}
                </div>

                {/* Row 8: Modules label */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-4">Moduły</p>

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
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Co zyskujesz</p>

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

        {/* Veezard addon */}
        <div className="mx-6 mb-6 mt-4 flex items-center gap-4 flex-wrap p-4 rounded-xl bg-muted/50 border border-border">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0 text-violet-600 dark:text-violet-400 font-bold text-sm">V</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Veezard — dodatek płatny osobno</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rozszerzenie dostępne do każdego pakietu. Cena zostanie ogłoszona wkrótce.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */

export default function SubscriptionSettings({ trialEndsAt, isFree, subscription: initialSub, discounts, billingRecords }: Props) {
  const t = useT();
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subscription, setSubscription] = useState(initialSub);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialDaysUsed = trialDaysLeft !== null ? Math.max(0, TRIAL_DAYS - trialDaysLeft) : 0;
  const trialProgress = Math.min(100, (trialDaysUsed / TRIAL_DAYS) * 100);
  const trialColor = trialDaysLeft === null ? "bg-gray-300"
    : trialDaysLeft <= 3 ? "bg-red-500"
    : trialDaysLeft <= 7 ? "bg-amber-500"
    : "bg-emerald-500";

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch("/api/subscription", { method: "DELETE" });
    setCancelling(false);
    if (res.ok) {
      const data = await res.json();
      setSubscription(data.subscription);
      setShowCancelConfirm(false);
      toast.success(t.subscription.cancelled);
    } else {
      toast.error(t.subscription.cancelError);
    }
  }

  const activeDiscount = discounts.find((d) => {
    const now = new Date();
    return new Date(d.validFrom) <= now && (!d.validUntil || new Date(d.validUntil) >= now);
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Plan i rozliczenia</h2>
        <p className="text-sm text-muted-foreground mt-1">Zarządzaj subskrypcją i przeglądaj historię płatności.</p>
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
                {trialDaysLeft === 0 ? "Okres próbny wygasł" : `Okres próbny · pozostało ${trialDaysLeft} ${trialDaysLeft === 1 ? "dzień" : "dni"}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trialDaysLeft === 0 ? "Wybierz plan, żeby zachować dostęp." : `${trialDaysUsed} z ${TRIAL_DAYS} dni wykorzystano.`}
              </p>
            </div>
            <button onClick={() => setShowPlansModal(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
              Ulepsz plan
            </button>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${trialColor}`} style={{ width: `${trialProgress}%` }} />
          </div>
          <p className={`text-xs font-medium ${trialDaysLeft <= 3 ? "text-red-600 dark:text-red-400" : trialDaysLeft <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {trialDaysLeft === 0 ? "Brak dostępu po wygaśnięciu próby." : `Próba kończy się za ${trialDaysLeft} ${trialDaysLeft === 1 ? "dzień" : "dni"}.`}
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
                {subscription.cardLast4 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscription.cardBrand ?? t.subscription.cardFallback} •••• {subscription.cardLast4}
                    {subscription.billingName && ` — ${subscription.billingName}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowPlansModal(true)} className="text-xs text-primary hover:underline">{t.subscription.changePlanCard}</button>
                {!showCancelConfirm && (
                  <button onClick={() => setShowCancelConfirm(true)} className="text-xs text-destructive hover:underline">{t.subscription.cancelSub}</button>
                )}
              </div>
            </div>
            {showCancelConfirm && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                <p className="text-sm text-foreground flex-1">{t.subscription.cancelConfirm}</p>
                <button onClick={() => setShowCancelConfirm(false)} className="text-xs text-muted-foreground hover:underline">{t.subscription.cancelNo}</button>
                <button onClick={handleCancel} disabled={cancelling} className="text-xs text-destructive font-medium hover:underline disabled:opacity-60">
                  {cancelling ? t.subscription.cancelling : t.subscription.cancelYes}
                </button>
              </div>
            )}
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
                  {t.subscription.accessExpiresAt} {new Date(subscription.cancelAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button onClick={() => setShowPlansModal(true)} className="text-xs text-primary hover:underline">{t.subscription.renewSub}</button>
          </div>
        </div>
      )}

      {/* Discount */}
      {activeDiscount && (
        <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-700 dark:text-violet-400">
          {t.subscription.activeDiscount} <span className="font-semibold">
            {activeDiscount.type === "percent" ? `${activeDiscount.value}%` : `${activeDiscount.value} zł`}
          </span>
          {activeDiscount.validUntil && ` (do ${new Date(activeDiscount.validUntil).toLocaleDateString("pl-PL")})`}
          {activeDiscount.note && ` — ${activeDiscount.note}`}
        </div>
      )}

      {/* "Ulepsz plan" button for users with active sub */}
      {!isFree && !trialDaysLeft && !subscription && (
        <button onClick={() => setShowPlansModal(true)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          Ulepsz plan
        </button>
      )}

      {/* Historia rozliczeń */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Historia rozliczeń</h3>
          <div className="flex-1 h-px bg-border" />
        </div>
        {billingRecords.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">Brak historii rozliczeń.</p>
            <p className="text-xs text-muted-foreground mt-1">Płatności pojawią się tutaj po aktywacji subskrypcji.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Okres</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kwota</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billingRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      {new Date(r.paidAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 capitalize text-foreground">{r.plan}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.interval === "yearly" ? "Roczna" : "Miesięczna"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {r.amount.toFixed(2)} {r.currency}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.invoiceUrl && (
                        <a href={r.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Faktura</a>
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
