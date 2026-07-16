// Mapa Stripe Price ID dla planów veedeck.
// Uwaga: to są ID z trybu TESTOWEGO Stripe. Przy przejściu na live mode
// trzeba wygenerować analogiczne produkty/ceny w koncie live i podmienić ID poniżej
// (najlepiej trzymać je w zmiennych środowiskowych zamiast na sztywno w kodzie).

export type PlanId = "freelancer" | "studio";
export type BillingInterval = "month" | "year";
export type Currency = "pln" | "usd" | "eur" | "gbp";

type PriceTable = Record<PlanId, Record<BillingInterval, Record<Currency, string>>>;

export const STRIPE_PRICES: PriceTable = {
  freelancer: {
    month: {
      pln: "price_1Ttvy6GgpGzQ3j0ZKFXcfJVY",
      usd: "price_1TtvyFGgpGzQ3j0ZstQRfFun",
      eur: "price_1TtvyIGgpGzQ3j0ZBLWJUFRN",
      gbp: "price_1TtvyMGgpGzQ3j0ZVIjortqQ",
    },
    year: {
      pln: "price_1Tqvt1GgpGzQ3j0Z1P0OTS04",
      usd: "price_1Tqvt4GgpGzQ3j0ZVKiNhBYo",
      eur: "price_1Tqvt7GgpGzQ3j0ZXgQ4W8Db",
      gbp: "price_1TqvtAGgpGzQ3j0Z20CTwOmg",
    },
  },
  studio: {
    month: {
      pln: "price_1TtvyAGgpGzQ3j0ZIthRYfHA",
      usd: "price_1TtvyQGgpGzQ3j0ZVwPnUKFM",
      eur: "price_1TtvyUGgpGzQ3j0ZJUjUxyfC",
      gbp: "price_1TtvyaGgpGzQ3j0ZJKGKXCQN",
    },
    year: {
      pln: "price_1TqvtPGgpGzQ3j0Z5juWk4Sx",
      usd: "price_1TqvtSGgpGzQ3j0ZZBUoQ8ZY",
      eur: "price_1TqvtWGgpGzQ3j0ZkDTAhiK1",
      gbp: "price_1TqvtZGgpGzQ3j0Z6RPM0Jh6",
    },
  },
};

export const PLAN_LABELS: Record<PlanId, string> = {
  freelancer: "Solo",
  studio: "Studio",
};

// Kupony promocyjne — aktywne przez pierwsze miesiące od startu.
// Kontrolowane przez PROMO_ENDS_AT w env (ISO string). Jak nie ustawione → promo nieaktywne.
export const PROMO_COUPONS: Record<PlanId, string> = {
  freelancer: "SOLO_PROMO_6M",
  studio:     "STUDIO_PROMO_6M",
};

// Agencja nie ma checkoutu — to plan "Wycena indywidualna" (kontakt sprzedażowy),
// więc celowo nie ma go w tej tabeli.

export function getPriceId(plan: PlanId, interval: BillingInterval, currency: Currency): string {
  const price = STRIPE_PRICES[plan]?.[interval]?.[currency];
  if (!price) {
    throw new Error(`Brak ceny Stripe dla plan=${plan} interval=${interval} currency=${currency}`);
  }
  return price;
}

export function getPlanFromPriceId(priceId: string): PlanId | null {
  for (const [plan, intervals] of Object.entries(STRIPE_PRICES)) {
    for (const currencies of Object.values(intervals)) {
      if (Object.values(currencies).includes(priceId)) {
        return plan as PlanId;
      }
    }
  }
  return null;
}

export function isPlanId(value: string): value is PlanId {
  return value === "freelancer" || value === "studio";
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "month" || value === "year";
}

export function isCurrency(value: string): value is Currency {
  return value === "pln" || value === "usd" || value === "eur" || value === "gbp";
}
