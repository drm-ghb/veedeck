"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Wallet } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

type PlanId = "standard" | "commercial" | "enterprise";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  cardLast4: string | null;
  cardBrand: string | null;
  billingName: string | null;
  cancelAt: Date | string | null;
  createdAt: Date | string;
}

interface Discount {
  id: string;
  type: string;
  value: number;
  validFrom: Date | string;
  validUntil: Date | string | null;
  note: string | null;
}

interface Props {
  trialEndsAt: string | null;
  isFree: boolean;
  subscription: Subscription | null;
  discounts: Discount[];
}

export default function SubscriptionSettings({ trialEndsAt, isFree, subscription: initialSub, discounts }: Props) {
  const t = useT();
  const [subscription, setSubscription] = useState(initialSub);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>((initialSub?.plan as PlanId) ?? null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [cardName, setCardName] = useState(initialSub?.billingName ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const PLANS = [
    {
      id: "standard" as PlanId,
      name: "Standard",
      price: "99 zł / msc",
      features: [
        t.subscription.featureAllModules,
        t.subscription.featureUnlimited,
        t.subscription.featureNoTeam,
      ],
      recommended: false,
    },
    {
      id: "commercial" as PlanId,
      name: "Commercial",
      price: "149 zł / msc",
      features: [
        t.subscription.featureAllModules,
        t.subscription.featureUnlimited,
        t.subscription.featureTeam5,
      ],
      recommended: true,
    },
    {
      id: "enterprise" as PlanId,
      name: "Enterprise",
      price: t.subscription.priceEnterprise,
      features: [
        t.subscription.featureAllModules,
        t.subscription.featureUnlimited,
        t.subscription.featureTeamUnlimited,
        t.subscription.featureCustomMods,
        t.subscription.featureCustomModules,
      ],
      recommended: false,
    },
  ];

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function handleSubscribe() {
    if (!selectedPlan) return;
    if (selectedPlan === "enterprise") {
      toast.info(t.subscription.contactUsToast);
      return;
    }
    if (!subscription && (!cardName || !cardNumber || !cardExpiry || !cardCvc)) {
      toast.error(t.subscription.fillCardData);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: selectedPlan,
        billingName: cardName,
        cardLast4: cardNumber.replace(/\s/g, "").slice(-4),
        cardBrand: "Visa",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSubscription(data.subscription);
      setShowPaymentForm(false);
      toast.success(t.subscription.updated);
    } else {
      toast.error(t.subscription.updateError);
    }
  }

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
        <h2 className="text-xl font-semibold text-foreground">{t.subscription.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t.subscription.desc}</p>
      </div>

      {/* Trial / Free status */}
      {isFree && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          {t.subscription.freeAccess}
        </div>
      )}
      {!isFree && trialDaysLeft !== null && !subscription && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          trialDaysLeft <= 5
            ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${trialDaysLeft <= 5 ? "bg-red-500" : "bg-amber-500"} animate-pulse`} />
          {trialDaysLeft === 0
            ? t.subscription.trialExpiredChoosePlan
            : `${t.subscription.trialRemainingPrefix} ${trialDaysLeft} ${trialDaysLeft === 1 ? t.subscription.trialRemainingDay : t.subscription.trialRemainingDays}.`}
        </div>
      )}

      {/* Active subscription */}
      {subscription && subscription.status === "active" && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
            <Wallet size={20} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">
                Plan {subscription.plan} — <span className="text-emerald-600 dark:text-emerald-400">{t.subscription.statusActive}</span>
              </p>
              {subscription.cardLast4 && (
                <p className="text-xs text-muted-foreground">
                  {subscription.cardBrand ?? t.subscription.cardFallback} •••• {subscription.cardLast4}
                  {subscription.billingName && ` — ${subscription.billingName}`}
                </p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setShowPaymentForm((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showPaymentForm ? t.subscription.cancelEdit : t.subscription.changePlanCard}
              </button>
              {!showCancelConfirm && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs text-destructive hover:underline"
                >
                  {t.subscription.cancelSub}
                </button>
              )}
            </div>
          </div>
          {showCancelConfirm && (
            <div className="px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center gap-3">
              <p className="text-sm text-foreground flex-1">
                {t.subscription.cancelConfirm}
              </p>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                {t.subscription.cancelNo}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs text-destructive font-medium hover:underline disabled:opacity-60"
              >
                {cancelling ? t.subscription.cancelling : t.subscription.cancelYes}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancelled subscription */}
      {subscription && subscription.status === "cancelled" && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Wallet size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">
                Plan {subscription.plan} — <span className="text-amber-600 dark:text-amber-400">{t.subscription.statusCancelled}</span>
              </p>
              {subscription.cancelAt && (
                <p className="text-xs text-muted-foreground">
                  {t.subscription.accessExpiresAt} {new Date(subscription.cancelAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPaymentForm((v) => !v)}
              className="ml-auto text-xs text-primary hover:underline"
            >
              {showPaymentForm ? t.subscription.cancelEdit : t.subscription.renewSub}
            </button>
          </div>
        </div>
      )}

      {/* Discount info */}
      {activeDiscount && (
        <div className="px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-700 dark:text-violet-400">
          {t.subscription.activeDiscount} <span className="font-semibold">
            {activeDiscount.type === "percent" ? `${activeDiscount.value}%` : `${activeDiscount.value} zł`}
          </span>
          {activeDiscount.validUntil && ` (do ${new Date(activeDiscount.validUntil).toLocaleDateString("pl-PL")})`}
          {activeDiscount.note && ` — ${activeDiscount.note}`}
        </div>
      )}

      {/* Plans */}
      {(!subscription || showPaymentForm) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                } ${plan.recommended ? "ring-1 ring-primary/20" : ""}`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {t.subscription.recommended}
                  </span>
                )}
                <h3 className="text-base font-semibold text-foreground mb-0.5">{plan.name}</h3>
                <p className="text-lg font-bold text-primary mb-3">{plan.price}</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {selectedPlan && selectedPlan !== "enterprise" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-md">
              <h3 className="text-base font-semibold">{t.subscription.cardDataTitle}</h3>
              <div>
                <label className="block text-sm font-medium mb-1">{t.subscription.cardHolderName}</label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Jan Kowalski"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t.subscription.cardNumberLabel}</label>
                <input
                  value={cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                  }}
                  placeholder="0000 0000 0000 0000"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">{t.subscription.cardExpiryLabel}</label>
                  <input
                    value={cardExpiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                    }}
                    placeholder="MM/RR"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium mb-1">{t.subscription.cardCvcLabel}</label>
                  <input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {subscription ? t.subscription.updateBtn : t.subscription.activateBtn}
              </button>
            </div>
          )}

          {selectedPlan === "enterprise" && (
            <div className="px-5 py-4 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
              {t.subscription.enterpriseContact}{" "}
              <a href="mailto:kontakt@arcdeck.pl" className="text-primary hover:underline font-medium">
                kontakt@arcdeck.pl
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
