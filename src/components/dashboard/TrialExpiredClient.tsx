"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

type PlanId = "standard" | "commercial" | "enterprise";

export default function TrialExpiredClient() {
  const t = useT();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [step, setStep] = useState<"plans" | "payment">("plans");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const PLANS = [
    {
      id: "standard" as PlanId,
      name: "Standard",
      price: "99 zł / msc",
      features: [
        t.subscription.featureAllModules,
        t.subscription.featureUnlimited,
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

  async function handleSubscribe() {
    if (!selectedPlan) return;
    if (selectedPlan === "enterprise") {
      toast.info(t.subscription.contactUsToast);
      return;
    }
    if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
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
      toast.success(t.subscription.activated);
      router.push("/");
    } else {
      toast.error(t.subscription.activationError);
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all" +
    " bg-white border border-gray-200 text-gray-900 placeholder-gray-400";

  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#111" }}>{t.subscription.trialExpiredTitle}</h1>
        <p style={{ color: "#6b7280" }}>{t.subscription.trialExpiredDesc}</p>
      </div>

      {step === "plans" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  backgroundColor: selectedPlan === plan.id ? "#f5f3ff" : "#fff",
                  borderColor: selectedPlan === plan.id ? "#7c3aed" : "#e5e7eb",
                  borderWidth: 2,
                  borderStyle: "solid",
                }}
                className="relative text-left p-6 rounded-2xl transition-all hover:border-violet-300"
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-0.5 rounded-full bg-violet-600 text-white whitespace-nowrap">
                    {t.subscription.recommended}
                  </span>
                )}
                <h3 className="text-lg font-semibold mb-1" style={{ color: "#111" }}>{plan.name}</h3>
                <p className="text-2xl font-bold mb-4 text-violet-600">{plan.price}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#6b7280" }}>
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "#7c3aed" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                if (!selectedPlan) { toast.error(t.subscription.selectPlanError); return; }
                if (selectedPlan === "enterprise") {
                  toast.info(t.subscription.contactUsToast);
                  return;
                }
                setStep("payment");
              }}
              disabled={!selectedPlan}
              className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t.subscription.nextPayment}
            </button>
          </div>
        </>
      )}

      {step === "payment" && selectedPlan && selectedPlan !== "enterprise" && (
        <div className="max-w-md mx-auto rounded-2xl p-8" style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setStep("plans")} className="text-sm text-violet-600 hover:text-violet-800 transition-colors">
              {t.subscription.changePlan}
            </button>
            <span className="text-sm ml-auto" style={{ color: "#6b7280" }}>
              Plan: <span className="text-violet-600 capitalize font-medium">{selectedPlan}</span>
            </span>
          </div>

          <h2 className="text-lg font-semibold mb-5" style={{ color: "#111" }}>{t.subscription.cardDataTitle}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>{t.subscription.cardNameLabel}</label>
              <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jan Kowalski" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>{t.subscription.cardNumberLabel}</label>
              <input
                value={cardNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                  setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                }}
                placeholder="0000 0000 0000 0000"
                className={inputCls + " font-mono"}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>{t.subscription.cardExpiryLabel}</label>
                <input
                  value={cardExpiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                  }}
                  placeholder="MM/RR"
                  className={inputCls + " font-mono"}
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>{t.subscription.cardCvcLabel}</label>
                <input
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  className={inputCls + " font-mono"}
                />
              </div>
            </div>
          </div>

          <p className="text-xs mt-4 mb-6" style={{ color: "#9ca3af" }}>
            {t.subscription.cardSecurity}
          </p>

          <button
            onClick={handleSubscribe}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t.subscription.activateBtn}
          </button>
        </div>
      )}
    </div>
  );
}
