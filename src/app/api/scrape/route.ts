import { NextRequest, NextResponse } from "next/server";

function getMetaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) return item;
      }
    } catch { /* continue */ }
  }
  return null;
}

function resolveAllImages(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") return [val];
  if (Array.isArray(val)) return val.flatMap(resolveAllImages);
  if (typeof val === "object" && val !== null) {
    const o = val as Record<string, unknown>;
    return resolveAllImages(o.url ?? o.contentUrl);
  }
  return [];
}

/** Extract main product image from raw HTML — tries multiple platform-specific and generic patterns */
function extractGalleryImage(html: string, baseUrl: string): string | null {
  const BLOCKED = /logo|icon|sprite|pixel|placeholder|blank|loading|avatar|flag|badge|star|rating|arrow|bullet|check|social|payment|brand|banner|header|footer|nav|menu|search|cart|wishlist|account|close|hamburger/i;

  function resolve(src: string): string | null {
    if (!src?.trim() || BLOCKED.test(src)) return null;
    src = src.trim();
    if (src.startsWith("data:")) return null;
    if (src.startsWith("//")) src = "https:" + src;
    if (src.startsWith("/")) {
      try { return new URL(src, baseUrl).href; } catch { return null; }
    }
    return src.startsWith("http") ? src : null;
  }

  /** Pick highest-resolution URL from a srcset string (prefer largest width descriptor) */
  function bestFromSrcset(srcset: string): string | null {
    let bestUrl = "";
    let bestW = -1;
    for (const entry of srcset.split(",").map(s => s.trim()).filter(Boolean)) {
      const parts = entry.split(/\s+/);
      const w = parseInt(parts[1] ?? "0") || 0;
      if (w > bestW) { bestW = w; bestUrl = parts[0]; }
    }
    return bestUrl ? resolve(bestUrl) : null;
  }

  // 1. Shopify: featured_image from JS variables
  const shopifyFeatured = html.match(/["']featured_image["']\s*:\s*["'](https?:\/\/[^"']+)["']/i);
  if (shopifyFeatured?.[1]) { const r = resolve(shopifyFeatured[1]); if (r) return r; }

  // 2. WooCommerce: data-large_image (highest quality gallery image)
  const wcLarge = html.match(/data-large_image=["']([^"']+)["']/i);
  if (wcLarge?.[1]) { const r = resolve(wcLarge[1]); if (r) return r; }

  // 3. data-zoom-image
  const zoomImg = html.match(/data-zoom-image=["']([^"']+)["']/i);
  if (zoomImg?.[1]) { const r = resolve(zoomImg[1]); if (r) return r; }

  // 4. data-main-image / data-primary-image / data-featured-image attributes
  const dataMain = html.match(/data-(?:main|primary|featured)[-_]?image=["']([^"']+)["']/i);
  if (dataMain?.[1]) { const r = resolve(dataMain[1]); if (r) return r; }

  // 5. itemprop="image" (microdata)
  const itempropImg =
    html.match(/itemprop=["']image["'][^>]*(?:src|content)=["']([^"']+)["']/i) ??
    html.match(/(?:src|content)=["']([^"']+)["'][^>]*itemprop=["']image["']/i);
  if (itempropImg?.[1]) { const r = resolve(itempropImg[1]); if (r) return r; }

  // 6. <img> with id/class explicitly naming main/primary/featured/hero image
  const mainClassRe = /<img\b[^>]*(?:id|class)=["'][^"']*(?:main[-_\s]?(?:image|img|photo)|primary[-_\s]?(?:image|img)|featured[-_\s]?(?:image|img)|product[-_\s]?(?:main|hero|featured|primary)|hero[-_\s]?(?:image|img))[^"']*["'][^>]*>/gi;
  let mainMatch: RegExpExecArray | null;
  while ((mainMatch = mainClassRe.exec(html)) !== null) {
    const tag = mainMatch[0];
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) { const r = bestFromSrcset(srcset); if (r) return r; }
    const src = tag.match(/(?:data-(?:src|lazy|original|full|large)|src)=["']([^"']+)["']/i)?.[1];
    if (src) { const r = resolve(src); if (r) return r; }
  }

  // 7. <picture> blocks — prefer <source srcset> (highest-res), fallback to <img src>
  const pictureRe = /<picture\b[^>]*>([\s\S]*?)<\/picture>/gi;
  let pictureMatch: RegExpExecArray | null;
  while ((pictureMatch = pictureRe.exec(html)) !== null) {
    const inner = pictureMatch[1];
    const sourceRe = /<source\b[^>]*srcset=["']([^"']+)["'][^>]*>/gi;
    let sourceMatch: RegExpExecArray | null;
    while ((sourceMatch = sourceRe.exec(inner)) !== null) {
      const r = bestFromSrcset(sourceMatch[1]);
      if (r) return r;
    }
    const imgSrc = inner.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1];
    if (imgSrc) { const r = resolve(imgSrc); if (r) return r; }
  }

  // 8. Collect all <img> tags — prefer those with explicit large width or srcset
  const imgRe = /<img\b[^>]+>/gi;
  const srcRe = /(?:data-(?:src|lazy|original|full|main|image)|src)\s*=\s*["']([^"'?]+(?:\?[^"']*)?)["']/i;
  const candidates: Array<{ url: string; w: number }> = [];
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRe.exec(html)) !== null) {
    const tag = imgMatch[0];
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const r = bestFromSrcset(srcset);
      if (r) { candidates.push({ url: r, w: 9999 }); continue; }
    }
    const m = tag.match(srcRe);
    if (!m) continue;
    const url = m[1].trim();
    if (!/\.(jpg|jpeg|png|webp|avif)/i.test(url)) continue;
    const r = resolve(url);
    if (!r) continue;
    const w = parseInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? "0") || 0;
    candidates.push({ url: r, w });
  }

  candidates.sort((a, b) => b.w - a.w);
  return candidates[0]?.url ?? null;
}

/** Extract a numeric value and unit from a dimension string like "36 cm" */
function parseDim(val: string | null | undefined): { num: string; unit: string } | null {
  if (!val) return null;
  const m = val.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/i);
  if (!m) return null;
  return { num: m[1].replace(",", "."), unit: (m[2] ?? "").toLowerCase() };
}

/** Extract value of a named spec field from HTML tables, lists, and common inline patterns.
 *  Matches patterns like: <td>Szerokość:</td><td>36 cm</td>, <strong>Szer.:</strong> 36 cm */
function extractSpecField(html: string, ...names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Table cell: <td>Name</td><td>value</td>  or  <th>Name</th><td>value</td>
    const cell = html.match(
      new RegExp(`<t[dh][^>]*>\\s*${escaped}[:\\s]*\\s*<\\/t[dh]>\\s*<t[dh][^>]*>([^<]+)<\\/t[dh]>`, "i")
    );
    if (cell?.[1]?.trim()) return cell[1].trim();

    // Definition list: <dt>Name</dt><dd>value</dd>
    const dl = html.match(
      new RegExp(`<dt[^>]*>\\s*${escaped}[:\\s]*\\s*<\\/dt>\\s*<dd[^>]*>([^<]+)<\\/dd>`, "i")
    );
    if (dl?.[1]?.trim()) return dl[1].trim();

    // <strong>Name:</strong> value  (very common in Polish shops)
    const strong = html.match(
      new RegExp(`<strong[^>]*>\\s*${escaped}[:\\s]*<\\/strong>\\s*([^<]{1,50})`, "i")
    );
    if (strong?.[1]?.trim()) return strong[1].trim();

    // <p> or <li> containing "Name: value"
    const para = html.match(
      new RegExp(`<(?:p|li)[^>]*>[^<]*${escaped}[:\\s]+([^<]{2,50})<\\/(?:p|li)>`, "i")
    );
    if (para?.[1]?.trim()) return para[1].trim();

    // Label inline (strict): only inside a <label>, <li>, or <span> tag
    const label = html.match(
      new RegExp(`<(?:label|li|span)[^>]*>\\s*${escaped}[:\\s]+([\\d][^<]{1,20})<\\/(?:label|li|span)>`, "i")
    );
    if (label?.[1]?.trim()) return label[1].trim();
  }
  return null;
}

/** Extract product dimensions */
function extractSize(
  ld: Record<string, unknown> | null,
  html: string,
  productName: string | null,
): string | null {
  // 1. Explicit size/dimensions field in JSON-LD
  if (ld?.size && typeof ld.size === "string") return ld.size as string;
  if (ld?.dimensions && typeof ld.dimensions === "string") return ld.dimensions as string;

  // 2. JSON-LD width/height/depth combination
  const ldW = parseDim(ld?.width as string);
  const ldH = parseDim(ld?.height as string);
  const ldD = parseDim(ld?.depth as string);
  const ldParts = [ldW, ldH, ldD].filter(Boolean) as { num: string; unit: string }[];
  if (ldParts.length >= 2) {
    const unit = ldParts.find((p) => p.unit)?.unit ?? "";
    return ldParts.map((p) => p.num).join("x") + (unit ? " " + unit : "");
  }

  // 3. "Wymiar:" / "Wymiary:" direct label (highest HTML priority)
  const labelWymiar = html.match(/Wymiary?[:\s]+([^\n<]{2,40})/i);
  if (labelWymiar?.[1]?.trim()) return labelWymiar[1].trim();

  // 4. "Rozmiar:" / "Rozmiary:" label
  const labelRozmiar = html.match(/Rozmiary?[:\s]+([^\n<]{2,40})/i);
  if (labelRozmiar?.[1]?.trim()) return labelRozmiar[1].trim();

  // 5. Individual dimension fields from spec table/list
  const rawH = extractSpecField(html, "Wysokość", "Wysokosc", "Height", "Wys.", "Wys");
  const rawW = extractSpecField(html, "Szerokość", "Szerokosc", "Width",  "Szer.", "Szer");
  const rawL = extractSpecField(html, "Długość",   "Dlugosc",   "Length", "Dł.",  "Dl");
  const rawD = extractSpecField(html, "Głębokość", "Glebokosc", "Depth",  "Gł.",  "Gl");
  const rawT = extractSpecField(html, "Grubość",   "Grubosc",   "Thickness");
  const rawDia = extractSpecField(html, "Średnica", "Srednica",  "Diameter", "Śr.");

  const parts: string[] = [];
  if (rawH) parts.push(`Wys. ${rawH}`);
  if (rawW) parts.push(`Szer. ${rawW}`);
  if (rawL && rawL !== rawD) parts.push(`Dł. ${rawL}`);
  else if (rawD) parts.push(`Gł. ${rawD}`);
  if (rawT) parts.push(`Gr. ${rawT}`);
  if (rawDia) parts.push(`Śr. ${rawDia}`);

  if (parts.length >= 2) return parts.join(" / ");
  if (parts.length === 1) return parts[0];

  // 6. Dimension pattern with unit (NxN cm) anywhere in name/description/HTML
  const DIM_WITH_UNIT = /\d+\s*[xX×]\s*\d+(?:\s*[xX×]\s*\d+)?\s*(?:cm|mm)\b/i;
  for (const text of [productName ?? "", (ld?.name as string) ?? "", (ld?.description as string) ?? "", html]) {
    const m = text.match(DIM_WITH_UNIT);
    if (m) return m[0];
  }

  return null;
}

/** Normalize raw price + currency into clean "NUMBER CURRENCY" format.
 *  Examples: "1 299,00" + "PLN" → "1299 PLN", "2699.00" + "EUR" → "2699 EUR" */
function formatPrice(rawPrice: unknown, currency: string): string | null {
  if (rawPrice == null) return null;
  const raw = String(rawPrice).trim();
  // Remove thousands separators (spaces or dots before 3-digit groups), normalize decimal comma→dot
  const normalized = raw
    .replace(/\s/g, "")           // remove spaces
    .replace(/\.(\d{3})/g, "$1") // remove dot-thousands-separator (1.299,00 → 1299,00)
    .replace(",", ".");           // comma decimal → dot
  const num = parseFloat(normalized);
  if (isNaN(num)) return null;
  // Format: integer if no cents, else keep up to 2 decimals
  const formatted = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(".", ",");
  const cur = currency?.trim() || "PLN";
  return `${formatted} ${cur}`;
}

function resolvePrice(offers: unknown): string | null {
  if (!offers) return null;
  const o = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown>;
  if (!o) return null;
  const price = o.price ?? o.lowPrice;
  const currency = (o.priceCurrency as string) ?? "PLN";
  return formatPrice(price, currency);
}

/** Extract price from script variables only (not HTML text — too unreliable) */
function extractPriceFromHtml(html: string): string | null {
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const script = match[1];
    if (!/"priceCurrency"/.test(script)) continue;
    const priceMatch = script.match(/"price"\s*:\s*"?([\d]+(?:[.,]\d+)?)"?/);
    const cur = script.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/)?.[1] ?? "PLN";
    if (priceMatch?.[1]) return formatPrice(priceMatch[1], cur);
  }
  return null;
}

/** Extract manufacturer from JS variables or HTML */
function extractManufacturerFromHtml(html: string, pageUrl: string): string | null {
  // 1. og:site_name
  const siteName = getMetaTag(html, "og:site_name");
  if (siteName) return siteName;

  // 2. SELLER_DATA = {"brandName":"..."}
  const sellerMatch = html.match(/SELLER_DATA\s*=\s*\{([^}]+)\}/);
  if (sellerMatch) {
    const brandName = sellerMatch[1].match(/"brandName"\s*:\s*"([^"]+)"/)?.[1];
    if (brandName) return brandName;
  }

  // 3. itemprop="brand"
  const itemPropBrand = html.match(/itemprop=["']brand["'][^>]*>\s*<[^>]+itemprop=["']name["'][^>]*>([^<]+)/i)
    ?? html.match(/itemprop=["']brand["'][^>]*>([^<]+)/i);
  if (itemPropBrand?.[1]?.trim()) return itemPropBrand[1].trim();

  // 4. Spec table "Producent" or "Marka"
  const tableMatch = html.match(/(?:Producent|Marka)[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i);
  if (tableMatch?.[1]?.trim()) return tableMatch[1].trim();

  // 5. Hostname as last resort (e.g. bocco.com → Bocco)
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, "").split(".")[0];
    if (host) return host.charAt(0).toUpperCase() + host.slice(1);
  } catch { /* ignore */ }

  return null;
}

/** Extract catalog / reference / SKU number from HTML spec tables */
function extractCatalogNumber(ld: Record<string, unknown> | null, html: string): string | null {
  // 1. Nr. katalogowy / Nr. Kat.
  const catNum = extractSpecField(html,
    "Nr. katalogowy", "Nr katalogowy", "Numer katalogowy", "Nr. kat.", "Nr kat", "Nr. Kat."
  );
  if (catNum) return catNum;

  // 2. Nr. referencyjny / REF
  const refNum = extractSpecField(html,
    "Nr. referencyjny", "Nr referencyjny", "Numer referencyjny", "REF", "Referencja"
  );
  if (refNum) return refNum;

  // 3. SKU — JSON-LD first, then spec table, then itemprop
  if (ld?.sku && typeof ld.sku === "string") return ld.sku;
  const skuSpec = extractSpecField(html, "SKU", "Kod produktu", "Kod towaru");
  if (skuSpec) return skuSpec;
  const itemSku = html.match(/itemprop=["']sku["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/itemprop=["']sku["'][^>]*>([^<\s]+)/i);
  if (itemSku?.[1]?.trim()) return itemSku[1].trim();

  return null;
}

/** Derive supplier domain (always with www. prefix) from URL */
function extractSupplier(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith("www.") ? hostname : `www.${hostname}`;
  } catch {
    return "";
  }
}

/** Extract color from HTML spec tables or meta */
function extractColorFromHtml(html: string): string | null {
  // 1. Label pattern: "Kolor: gun metal (GM)" — strip parenthetical variant codes
  const labelColor = html.match(/Kolor:\s*([^<(\n]{2,40})(?:\s*\([^)]*\))?\s*</i);
  if (labelColor?.[1]?.trim()) return labelColor[1].trim();

  // 2. Spec table/list: "Kolor" followed by value cell
  const tableColor = html.match(/Kolor[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i);
  if (tableColor?.[1]?.trim()) return tableColor[1].trim();

  // 3. itemprop="color"
  const itemColor = html.match(/itemprop=["']color["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/itemprop=["']color["'][^>]*>([^<]+)/i);
  if (itemColor?.[1]?.trim()) return itemColor[1].trim();

  // 4. data-color attribute
  const dataColor = html.match(/data-color=["']([^"']+)["']/i);
  if (dataColor?.[1]?.trim()) return dataColor[1].trim();

  // 5. JSON in scripts: "color":"..."
  const jsonColor = html.match(/"color"\s*:\s*"([^"]+)"/i);
  if (jsonColor?.[1]?.trim()) return jsonColor[1].trim();

  return null;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "Brak URL" }, { status: 400 });

  try {
    const parsed = new URL(url);
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": parsed.origin + "/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const html = await res.text();

    // If blocked and no useful content, extract name from URL slug as fallback
    if (!res.ok) {
      const slug = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
      const nameFromSlug = slug
        .replace(/-/g, " ")
        .replace(/\b\d{4,}\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const name = nameFromSlug || null;
      return NextResponse.json({ name, imageUrl: null, price: null, manufacturer: null, color: null, size: null, description: null, deliveryTime: null, partial: true });
    }
    const ld = extractJsonLd(html);

    const name =
      (ld?.name as string) ||
      getMetaTag(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;

    // Gallery image: JSON-LD > og:image (set by site owner) > WooCommerce/HTML fallback
    const ldImages = resolveAllImages(ld?.image);
    const imageUrl =
      ldImages[0] ||
      getMetaTag(html, "og:image") ||
      extractGalleryImage(html, url) ||
      null;

    const metaPriceCurrency =
      getMetaTag(html, "product:price:currency") ||
      getMetaTag(html, "og:price:currency") ||
      "PLN";
    const metaPriceRaw =
      getMetaTag(html, "product:price:amount") ||
      getMetaTag(html, "og:price:amount");

    const price =
      resolvePrice(ld?.offers) ||
      (metaPriceRaw ? formatPrice(metaPriceRaw, metaPriceCurrency) : null) ||
      extractPriceFromHtml(html) ||
      null;

    const manufacturer =
      (ld?.brand as Record<string, unknown>)?.name as string ||
      (typeof ld?.brand === "string" ? ld.brand : null) ||
      getMetaTag(html, "og:brand") ||
      extractManufacturerFromHtml(html, url) ||
      null;

    const color =
      (ld?.color as string) ||
      getMetaTag(html, "product:color") ||
      extractColorFromHtml(html) ||
      null;

    const dimensions =
      extractSize(ld, html, name) ||
      getMetaTag(html, "product:size") ||
      null;

    const description =
      (ld?.description as string) ||
      getMetaTag(html, "og:description") ||
      getMetaTag(html, "description") ||
      null;

    const deliveryTime =
      (ld?.offers as Record<string, unknown>)?.deliveryLeadTime as string ||
      null;

    const catalogNumber = extractCatalogNumber(ld, html);
    const supplier = extractSupplier(url);

    return NextResponse.json({ name, imageUrl, price, manufacturer, color, dimensions, description, deliveryTime, catalogNumber, supplier });
  } catch (err) {
    console.error("[POST /api/scrape] error:", err);
    return NextResponse.json({ error: "Nie udało się pobrać danych" }, { status: 500 });
  }
}
