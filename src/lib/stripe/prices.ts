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
      pln: "price_1TqumdGgpGzQ3j0ZQyiBiGeJ",
      usd: "price_1TqvsqGgpGzQ3j0Zm6PxBF1T",
      eur: "price_1TqvsuGgpGzQ3j0Z6EeFg5Cv",
      gbp: "price_1TqvsxGgpGzQ3j0ZJjClsr7G",
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
      pln: "price_1TqutKGgpGzQ3j0ZivAQmysY",
      usd: "price_1TqvtFGgpGzQ3j0ZsT5c8qFk",
      eur: "price_1TqvtJGgpGzQ3j0ZE30tUAqq",
      gbp: "price_1TqvtMGgpGzQ3j0ZrYNZY6q9",
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
  freelancer: "Freelancer",
  studio: "Studio",
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

export function isPlanId(value: string): value is PlanId {
  return value === "freelancer" || value === "studio";
}

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "month" || value === "year";
}

export function isCurrency(value: string): value is Currency {
  return value === "pln" || value === "usd" || value === "eur" || value === "gbp";
}
