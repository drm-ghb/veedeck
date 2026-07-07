"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, X, Check, ChevronRight } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

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

type PlanFeature = { text: string; available: boolean };
type PlanSection = { label: string; features: PlanFeature[] };

const PLANS_DATA = [
  {
    id: "freelancer",
    name: "Freelancer",
    tagline: "Dla projektantów zaczynających z veedeck",
    monthlyPLN: 99,
    yearlyPLN: 79,
    featured: false,
    sections: [
      { label: "Projekty i pliki", features: [
        { text: "5 aktywnych projektów", available: true },
        { text: "Historia wersji (5 wersji)", available: true },
        { text: "Komentarze z pinezkami", available: true },
        { text: "Panel klienta i wykonawcy", available: true },
        { text: "20 GB przestrzeni", available: true },
      ]},
      { label: "Komunikacja", features: [
        { text: "Czat z klientem", available: true },
        { text: "Zaproszenia dla klientów", available: true },
        { text: "Listy zakupowe", available: true },
      ]},
      { label: "Zarządzanie projektem", features: [
        { text: "Zadania i podzadania", available: true },
        { text: "Dokumenty klienta", available: false },
        { text: "Kalendarz z gośćmi", available: false },
      ]},
      { label: "Branding i narzędzia", features: [
        { text: "Wtyczka Veepick", available: true },
        { text: "Logo w brandingu", available: false },
        { text: "Miejsca w zespole", available: false },
      ]},
    ] as PlanSection[],
    upgradeNote: "Brak dokumentów klienta i kalendarza — upgrade do Studio gdy zaczniesz zarządzać pełną dokumentacją projektów.",
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Pełne studio projektowe dla rosnących pracowni",
    monthlyPLN: 199,
    yearlyPLN: 159,
    featured: true,
    sections: [
      { label: "Projekty i pliki", features: [
        { text: "30 aktywnych projektów", available: true },
        { text: "Pełna historia wersji", available: true },
        { text: "Komentarze z pinezkami", available: true },
        { text: "Panel klienta i wykonawcy", available: true },
        { text: "60 GB przestrzeni", available: true },
      ]},
      { label: "Komunikacja", features: [
        { text: "Czat z klientem", available: true },
        { text: "Zaproszenia dla klientów", available: true },
        { text: "Listy zakupowe", available: true },
      ]},
      { label: "Zarządzanie projektem", features: [
        { text: "Zadania i podzadania", available: true },
        { text: "Dokumenty klienta z folderami", available: true },
        { text: "Kalendarz z gośćmi", available: true },
      ]},
      { label: "Branding i narzędzia", features: [
        { text: "Wtyczka Veepick", available: true },
        { text: "Logo w brandingu portalu", available: true },
        { text: "3 miejsca w zespole", available: true },
      ]},
    ] as PlanSection[],
    upgradeNote: "Powyżej 3 osób w zespole lub potrzebujesz AI podsumowań i white label — upgrade do Agencja.",
  },
  {
    id: "agencja",
    name: "Agencja",
    tagline: "Dla dużych pracowni i agencji bez kompromisów",
    monthlyPLN: 499,
    yearlyPLN: 399,
    featured: false,
    sections: [
      { label: "Projekty i pliki", features: [
        { text: "Bez limitu projektów", available: true },
        { text: "Pełna historia wersji", available: true },
        { text: "Komentarze z pinezkami", available: true },
        { text: "Panel klienta i wykonawcy", available: true },
        { text: "200 GB przestrzeni", available: true },
      ]},
      { label: "Komunikacja", features: [
        { text: "Czat z klientem", available: true },
        { text: "Zaproszenia dla klientów", available: true },
        { text: "Listy zakupowe", available: true },
      ]},
      { label: "Zarządzanie projektem", features: [
        { text: "Zadania i podzadania", available: true },
        { text: "Dokumenty klienta z folderami", available: true },
        { text: "Kalendarz z gośćmi", available: true },
      ]},
      { label: "Branding i narzędzia", features: [
        { text: "Wtyczka Veepick", available: true },
        { text: "White label (własna domena)", available: true },
        { text: "Logo + kolory brandingu", available: true },
        { text: "AI podsumowania komentarzy", available: true },
        { text: "Bez limitu miejsc w zespole", available: true },
      ]},
    ] as PlanSection[],
    upgradeNote: null,
  },
];

const CURRENCIES = ["PLN", "EUR", "USD", "GBP"] as const;
type Currency = typeof CURRENCIES[number];
const CURRENCY_SYMBOLS: Record<Currency, string> = { PLN: "zł", EUR: "€", USD: "$", GBP: "£" };
const TRIAL_DAYS = 14;

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatPrice(plnPrice: number, currency: Currency, rates: Record<string, number>, annual: boolean): string {
  const price = annual ? Math.round(plnPrice * 0.8) : plnPrice; // approx yearly discount
  if (currency === "PLN") return `${price} zł`;
  const rate = rates[currency];
  if (!rate) return `${price} zł`;
  return `${Math.ceil(price / rate)} ${CURRENCY_SYMBOLS[currency]}`;
}

/* ─── Plans Modal ─────────────────────────────────────────────────────────── */

function PlansModal({ onClose }: { onClose: () => void }) {
  const [annual, setAnnual] = useState(false);
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

  function handleChoosePlan(planId: string) {
    // TODO: redirect to Stripe checkout with price ID for planId + currency + interval
    toast.info("Integracja ze Stripe wkrótce dostępna.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Wybierz plan</h2>
            <p className="text-sm text-muted-foreground mt-0.5">14-dniowy trial bezpłatnie · Nie wymaga karty kredytowej</p>
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
                −17% · 2 mies. gratis
              </span>
            )}
          </div>

          {/* Currency + rate date */}
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

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {PLANS_DATA.map((plan) => {
            const priceStr = ratesLoading ? "…" : formatPrice(plan.monthlyPLN, currency, rates, annual);
            const annualTotal = annual
              ? (currency === "PLN"
                  ? `${plan.yearlyPLN * 12} zł/rok`
                  : `${Math.ceil(plan.yearlyPLN / (rates[currency] ?? 1) * 12)} ${CURRENCY_SYMBOLS[currency]}/rok`)
              : null;
            return (
              <div key={plan.id} className={`flex flex-col p-6 ${plan.featured ? "bg-primary/3" : ""}`}>
                {plan.featured ? (
                  <span className="self-start text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary mb-3">Najpopularniejszy</span>
                ) : (
                  <div className="h-7 mb-3" />
                )}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 leading-snug">{plan.tagline}</p>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-foreground">{priceStr}</span>
                  <span className="text-sm text-muted-foreground">/mies.</span>
                </div>
                {annualTotal ? (
                  <p className="text-xs text-muted-foreground mb-4">Rozliczane {annualTotal}</p>
                ) : (
                  <div className="h-5 mb-4" />
                )}
                <button onClick={() => handleChoosePlan(plan.id)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors mb-5 ${
                    plan.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-foreground hover:bg-muted/70 border border-border"
                  }`}>
                  Wybierz {plan.name}
                </button>

                <div className="space-y-4 flex-1">
                  {plan.sections.map((section) => (
                    <div key={section.label}>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.label}</p>
                      <div className="space-y-1.5">
                        {section.features.map((f) => (
                          <div key={f.text} className={`flex items-start gap-2 text-xs ${f.available ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                            {f.available
                              ? <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                              : <X size={13} className="text-muted-foreground/40 shrink-0 mt-0.5" />
                            }
                            {f.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {plan.upgradeNote && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug flex items-start gap-1.5">
                      <ChevronRight size={13} className="shrink-0 mt-0.5" />
                      {plan.upgradeNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
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
                <p className="text-sm font-semibold text-foreground capitalize">Plan {subscription.plan}</p>
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
              <p className="text-sm font-semibold text-foreground capitalize">Plan {subscription.plan}</p>
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

      {showPlansModal && <PlansModal onClose={() => setShowPlansModal(false)} />}
    </div>
  );
}
