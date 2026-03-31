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

/** Extract first gallery image from raw HTML — tries multiple common patterns */
function extractGalleryImage(html: string, baseUrl: string): string | null {
  const BLOCKED = /logo|icon|sprite|pixel|placeholder|blank|loading|avatar|flag|badge|star|rating|arrow|bullet|check|social|payment|brand|banner|header|footer|nav|menu|search|cart|wishlist|account|close|hamburger/i;

  function resolve(src: string): string | null {
    if (!src || BLOCKED.test(src)) return null;
    if (src.startsWith("//")) src = "https:" + src;
    if (src.startsWith("/")) {
      try { return new URL(src, baseUrl).href; } catch { return null; }
    }
    return src.startsWith("http") ? src : null;
  }

  // 1. WooCommerce: data-large_image attribute (highest quality product image)
  const wcLarge = html.match(/data-large_image=["']([^"']+)["']/i);
  if (wcLarge?.[1]) { const r = resolve(wcLarge[1]); if (r) return r; }

  // 2. data-zoom-image (common in product galleries)
  const zoomImg = html.match(/data-zoom-image=["']([^"']+)["']/i);
  if (zoomImg?.[1]) { const r = resolve(zoomImg[1]); if (r) return r; }

  // 3. Collect src/data-src/data-lazy/data-original from <img> tags
  const imgRe = /<img[^>]+>/gi;
  const srcRe = /(?:data-(?:src|lazy|original|full|main|image)|src)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"'?]*(?:\?[^"']*)?)["']/i;

  const candidates: string[] = [];
  let imgMatch;
  while ((imgMatch = imgRe.exec(html)) !== null) {
    const tag = imgMatch[0];
    const m = tag.match(srcRe);
    if (!m) continue;
    const r = resolve(m[1].trim());
    if (r) candidates.push(r);
  }

  return candidates[0] ?? null;
}

/** Extract a numeric value and unit from a dimension string like "36 cm" */
function parseDim(val: string | null | undefined): { num: string; unit: string } | null {
  if (!val) return null;
  const m = val.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/i);
  if (!m) return null;
  return { num: m[1].replace(",", "."), unit: (m[2] ?? "").toLowerCase() };
}

/** Extract value of a named spec field from HTML table/list only (no free-text — too error-prone).
 *  Matches patterns like: <td>Szerokość:</td><td>36 cm</td> */
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

    // Label inline (strict): only inside a <label> or <li> tag to avoid picking up descriptions
    const label = html.match(
      new RegExp(`<(?:label|li|span)[^>]*>\\s*${escaped}[:\\s]+([\\d][^<]{1,20})<\\/(?:label|li|span)>`, "i")
    );
    if (label?.[1]?.trim()) return label[1].trim();
  }
  return null;
}

/** Extract product dimensions and compose WxLxH string */
function extractSize(
  ld: Record<string, unknown> | null,
  html: string,
  productName: string | null,
): string | null {
  // 1. Explicit size field in JSON-LD
  if (ld?.size && typeof ld.size === "string") return ld.size;

  // 2. JSON-LD width/height/depth fields
  const ldW = parseDim(ld?.width as string);
  const ldH = parseDim(ld?.height as string);
  const ldD = parseDim(ld?.depth as string);
  const ldParts = [ldW, ldH, ldD].filter(Boolean) as { num: string; unit: string }[];
  if (ldParts.length >= 2) {
    const unit = ldParts.find((p) => p.unit)?.unit ?? "";
    return ldParts.map((p) => p.num).join("x") + (unit ? " " + unit : "");
  }

  // 3. Extract individual dimensions from HTML spec table
  const rawWidth  = extractSpecField(html, "Szerokość", "Szerokosc", "Width",  "Szer");
  const rawLength = extractSpecField(html, "Długość",   "Dlugosc",   "Length", "Głębokość", "Glebokosc", "Depth");
  const rawHeight = extractSpecField(html, "Wysokość",  "Wysokosc",  "Height", "Wys");
  const rawDepth  = extractSpecField(html, "Głębokość", "Glebokosc", "Depth");

  const w = parseDim(rawWidth);
  const l = parseDim(rawLength);
  const h = parseDim(rawHeight);
  const d = parseDim(rawDepth);

  const htmlParts: { num: string; unit: string }[] = [];
  if (w) htmlParts.push(w);
  // length and depth — pick whichever we found, avoid duplicating
  if (l && (!d || l.num !== d.num)) htmlParts.push(l);
  else if (d && !l) htmlParts.push(d);
  if (h) htmlParts.push(h);

  if (htmlParts.length >= 2) {
    const unit = htmlParts.find((p) => p.unit)?.unit ?? "";
    return htmlParts.map((p) => p.num).join("x") + (unit ? " " + unit : "");
  }

  // 4. "Rozmiar: 800x800" label
  const labelSize = html.match(/(?:Rozmiar|Rozmiary|Wymiary?)[:\s]+([^\n<]{2,30})/i);
  if (labelSize?.[1]?.trim()) return labelSize[1].trim();

  // 5. Dimension pattern with unit anywhere in name/description/HTML
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

    const size =
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

    return NextResponse.json({ name, imageUrl, price, manufacturer, color, size, description, deliveryTime });
  } catch (err) {
    console.error("[POST /api/scrape] error:", err);
    return NextResponse.json({ error: "Nie udało się pobrać danych" }, { status: 500 });
  }
}
