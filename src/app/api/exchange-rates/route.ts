import { NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET() {
  try {
    const res = await fetch(
      "https://api.nbp.pl/api/exchangerates/tables/A/last/2/?format=json",
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) throw new Error("NBP API error");
    const data = await res.json();
    const table = data[0];
    const map: Record<string, number> = {};
    for (const r of table.rates) map[r.code] = r.mid;
    return NextResponse.json({
      date: table.effectiveDate as string,
      rates: {
        EUR: map["EUR"] ?? 4.25,
        USD: map["USD"] ?? 3.95,
        GBP: map["GBP"] ?? 5.05,
      },
    });
  } catch {
    return NextResponse.json({
      date: null,
      rates: { EUR: 4.25, USD: 3.95, GBP: 5.05 },
    });
  }
}
