"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Home, Minus, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  size: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: number;
}

interface Section {
  id: string;
  name: string;
  order: number;
  products: Product[];
}

interface ListData {
  id: string;
  name: string;
  project: {
    id: string;
    title: string;
    shareToken: string;
    hasRenders: boolean;
  } | null;
  sections: Section[];
}

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

function SectionTotal({ products }: { products: Product[] }) {
  let total = 0;
  let currency = "";
  let hasAny = false;
  for (const p of products) {
    const n = parsePrice(p.price);
    if (n !== null) { total += n * p.quantity; if (!currency) currency = getCurrency(p.price); hasAny = true; }
  }
  if (!hasAny) return null;
  return (
    <span className="text-sm font-semibold">
      {total.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
    </span>
  );
}

export default function PublicListPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/list/${token}`)
      .then((r) => {
        if (r.status === 404) throw new Error("not_found");
        return r.json();
      })
      .then(setList)
      .catch((e) => setError(e.message === "not_found" ? "Lista nie istnieje lub link wygasł." : "Wystąpił błąd."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-[#19213D]/30 border-t-[#19213D] rounded-full animate-spin" />
    </div>
  );

  if (error || !list) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">{error ?? "Nie znaleziono listy."}</p>
      </div>
    </div>
  );

  const allProducts = list.sections.flatMap((s) => s.products);
  const grandTotal = allProducts.reduce((sum, p) => {
    const n = parsePrice(p.price);
    return n !== null ? sum + n * p.quantity : sum;
  }, 0);
  const grandCurrency = getCurrency(allProducts.find((p) => getCurrency(p.price))?.price ?? null);
  const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {list.project && (
            <Link
              href={`/share/${list.project.shareToken}/home`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home size={14} />
              {list.project.title}
            </Link>
          )}
          {list.project && <span className="text-muted-foreground">/</span>}
          <h1 className="text-sm font-semibold text-foreground">{list.name}</h1>
        </div>
        {hasTotal && (
          <span className="text-sm font-semibold tabular-nums">
            {grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {list.sections.length === 0 && (
          <p className="text-center text-muted-foreground py-16">Lista jest pusta.</p>
        )}

        {list.sections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{section.name}</h2>
                {section.products.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                    {section.products.length}
                  </span>
                )}
              </div>
              <SectionTotal products={section.products} />
            </div>

            {section.products.length === 0 ? (
              <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
                Brak produktów w tej sekcji
              </p>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {section.products.map((product, i) => {
                  const unitPrice = parsePrice(product.price);
                  const currency = getCurrency(product.price);
                  const totalPrice = unitPrice !== null ? unitPrice * product.quantity : null;
                  const last = i === section.products.length - 1;

                  return (
                    <div key={product.id} className={`flex items-center gap-4 px-4 py-3 ${!last ? "border-b border-border" : ""}`}>
                      <span className="w-5 text-right text-xs text-muted-foreground tabular-nums shrink-0">{i + 1}</span>

                      <div className="w-14 h-14 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-lg text-muted-foreground/30 select-none">📦</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.manufacturer && <p className="text-xs text-muted-foreground mt-0.5">{product.manufacturer}</p>}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          {product.color && <span className="text-xs text-muted-foreground">Kolor: {product.color}</span>}
                          {product.size && <span className="text-xs text-muted-foreground">Rozmiar: {product.size}</span>}
                          {product.deliveryTime && <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Qty (read-only) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Szt.:</span>
                          <span className="text-sm font-medium tabular-nums">{product.quantity}</span>
                        </div>

                        {/* Price */}
                        {totalPrice !== null && (
                          <div className="text-right min-w-[72px]">
                            <p className="text-sm font-semibold tabular-nums">
                              {totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}
                            </p>
                            {product.quantity > 1 && unitPrice !== null && (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {unitPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / szt.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Link */}
                        {product.url ? (
                          <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Otwórz produkt">
                            <ExternalLink size={13} />
                          </a>
                        ) : <span className="w-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
