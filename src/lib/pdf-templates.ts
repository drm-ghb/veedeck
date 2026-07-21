/**
 * PDF template system for shopping lists.
 * Violet: fully implemented. Editorial / Atelier / Architect / Linen: stubs (render as Violet).
 */

export type PdfTemplate = "violet" | "editorial" | "atelier" | "architect" | "linen";
export const PDF_TEMPLATES: PdfTemplate[] = ["violet", "editorial", "atelier", "architect", "linen"];
export type Lang = "pl" | "en";

type RGB = [number, number, number];

// ─── i18n strings used inside PDF ────────────────────────────────────────────
const STR = {
  pl: {
    preparedBy: "Oferta przygotowana przez",
    preparedFor: "Oferta przygotowana dla",
    contact: "Dane kontaktowe",
    dateLabel: "Data oferty",
    project: "Projekt",
    grandTotal: "Suma całkowita",
    noImage: "brak zdj.",
    supplier: "Dostawca",
    manufacturer: "Producent",
    dimension: "Wymiar",
    color: "Kolor",
    qty: "Ilość",
    unit: "szt.",
    remaining: "Pozostałe",
  },
  en: {
    preparedBy: "Prepared by",
    preparedFor: "Prepared for",
    contact: "Contact",
    dateLabel: "Date",
    project: "Project",
    grandTotal: "Grand total",
    noImage: "no image",
    supplier: "Supplier",
    manufacturer: "Manufacturer",
    dimension: "Size",
    color: "Color",
    qty: "Qty",
    unit: "pcs.",
    remaining: "Other",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  url?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  manufacturer?: string | null;
  color?: string | null;
  dimensions?: string | null;
  supplier?: string | null;
  quantity: number;
  hidden?: boolean;
  parentProductId?: string | null;
}

interface Section {
  id: string;
  name: string;
  unsorted?: boolean;
  products: Product[];
}

export interface GeneratePdfOptions {
  template: PdfTemplate;
  lang: Lang;
  list: {
    name: string;
    project?: {
      title?: string;
      clientName?: string | null;
      addressStreet?: string | null;
      addressCity?: string | null;
      addressPostalCode?: string | null;
      addressCountry?: string | null;
    } | null;
  };
  sections: Section[];
  designerName?: string;
  designerEmail?: string;
  designerLogoUrl?: string;
  grandTotal: number;
  grandCurrency: string;
  hasTotal: boolean;
  imgCache?: Record<string, string>;
  logoDataUrl?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number, lang: Lang) {
  return n.toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function fmtDate(lang: Lang) {
  return new Date().toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US");
}

function parsePrice(price?: string | null): number | null {
  if (!price) return null;
  const match = price.replace(/\s/g, "").replace(",", ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function getCurrency(price?: string | null): string {
  if (!price) return "";
  const match = price.match(/[A-Z]{2,3}|zł|€|\$|£/);
  return match ? match[0] : "";
}

async function loadImgToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(null);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildExportSections(sections: Section[], remainingLabel: string) {
  const regular = sections.filter((s) => !s.unsorted);
  const unsortedProducts = sections
    .filter((s) => s.unsorted)
    .flatMap((s) => s.products.filter((p) => !p.hidden));
  return [
    ...regular,
    ...(unsortedProducts.length > 0
      ? [{ id: "__unsorted__", name: remainingLabel, unsorted: false, products: unsortedProducts }]
      : []),
  ];
}

function buildAddressLines(project?: GeneratePdfOptions["list"]["project"]): string[] {
  if (!project) return [];
  const lines: string[] = [];
  if (project.addressStreet) lines.push(project.addressStreet);
  const cityLine = [project.addressPostalCode, project.addressCity].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (project.addressCountry) lines.push(project.addressCountry);
  return lines;
}

// ─── Font loader (returns false if file not found) ────────────────────────────
async function loadFont(
  doc: import("jspdf").jsPDF,
  path: string,
  family: string,
  style: "normal" | "bold" | "italic"
): Promise<boolean> {
  try {
    const b64 = await toBase64(path);
    const filename = path.split("/").pop()!;
    doc.addFileToVFS(filename, b64);
    doc.addFont(filename, family, style);
    return true;
  } catch {
    return false;
  }
}

// ─── Helper: Roman numerals ───────────────────────────────────────────────────
function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  }
  return r + ".";
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function generateListPDF(opts: GeneratePdfOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Always load Geist as fallback
  const [geistReg, geistBold] = await Promise.all([
    toBase64("/fonts/Geist-Regular.ttf"),
    toBase64("/fonts/Geist-Bold.ttf"),
  ]);
  doc.addFileToVFS("Geist-Regular.ttf", geistReg);
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", geistBold);
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");

  const exportSections = buildExportSections(opts.sections, STR[opts.lang].remaining);
  const allVisible = exportSections.flatMap((s) => s.products.filter((p) => !p.hidden));
  const imgCache: Record<string, string> = opts.imgCache ?? {};
  const logoDataUrl: string | null = opts.logoDataUrl ?? null;

  switch (opts.template) {
    case "editorial":
      await renderEditorial(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
      break;
    case "atelier":
      await renderAtelier(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
      break;
    case "architect":
      await renderArchitect(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
      break;
    case "linen":
      await renderLinen(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
      break;
    case "violet":
    default:
      await renderViolet(doc, opts, exportSections, allVisible, imgCache, logoDataUrl);
  }

  return doc;
}

// ─── Violet renderer ──────────────────────────────────────────────────────────
async function renderViolet(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";

  const ACCENT: RGB = [79, 70, 229];
  const ACCENT_BG: RGB = [238, 242, 255];
  const DARK: RGB = [28, 28, 28];
  const MUTED: RGB = [110, 110, 110];
  const BORDER: RGB = [225, 225, 225];
  const WHITE: RGB = [255, 255, 255];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const IMG = 31;

  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 14) {
      doc.addPage();
      y = 14;
    }
  }

  function fmt(n: number) {
    return fmtNum(n, opts.lang);
  }

  // ── Banner ─────────────────────────────────────────────────────────────────
  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const LINE_H = 5;
  const LABEL_H = 4.5;
  const SECTION_PAD = 3;
  const leftLines = 2;
  const rightLines = opts.list.project?.clientName
    ? 1 + addressLines.length
    : addressLines.length;
  const leftH = LABEL_H + SECTION_PAD + leftLines * LINE_H;
  const rightH = LABEL_H + SECTION_PAD + (rightLines > 0 ? rightLines * LINE_H : LINE_H);
  const BANNER_H = Math.max(leftH, rightH) + SECTION_PAD * 2 + 4;

  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, BANNER_H, "F");

  const MID = PAGE_W / 2;
  doc.setDrawColor(165, 180, 252);
  doc.setLineWidth(0.3);
  doc.line(MID, 5, MID, BANNER_H - 5);

  const COL_W = MID - ML - 4;

  // Left column
  let lx = ML;
  let ly = 6;
  const LOGO_SIZE = 12;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", lx, ly, LOGO_SIZE, LOGO_SIZE);
      lx += LOGO_SIZE + 3;
    } catch { /* skip */ }
  }

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  doc.text(s.preparedBy, lx, ly + 3);

  doc.setFont(FONT, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text(opts.designerName ?? "Projektant", lx, ly + 3 + LINE_H + 1.5);

  if (opts.designerEmail) {
    const contactY = ly + 3 + LINE_H * 2 + 2;
    doc.setFont(FONT, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(199, 210, 254);
    doc.text(s.contact, lx, contactY);
    doc.setFontSize(8);
    doc.text(opts.designerEmail, lx, contactY + LINE_H);
  }

  // Date
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(`${s.dateLabel}: ${today}`, PAGE_W - MR, 9, { align: "right" });

  // Right column
  const rx = MID + 4;
  let ry = 6;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  doc.text(s.preparedFor, rx, ry + 3);

  ry += 3 + LINE_H + 1.5;

  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...WHITE);
    doc.text(opts.list.project.clientName, rx, ry, { maxWidth: COL_W });
    ry += LINE_H + 1;
  }

  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(199, 210, 254);
    for (const line of addressLines) {
      doc.text(line, rx, ry, { maxWidth: COL_W });
      ry += LINE_H;
    }
  }

  // ── Title ──────────────────────────────────────────────────────────────────
  y = BANNER_H + 12;
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(opts.list.name, ML, y);

  if (opts.list.project?.title) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`${s.project}: ${opts.list.project.title}`, PAGE_W - MR, y, { align: "right" });
  }

  y += 9;

  // ── Sections ───────────────────────────────────────────────────────────────
  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;

    ensureSpace(16);

    // Section header
    doc.setFillColor(...ACCENT_BG);
    doc.roundedRect(ML, y, CW, 9, 2, 2, "F");
    doc.setFillColor(...ACCENT);
    doc.roundedRect(ML, y, 5, 9, 2, 2, "F");
    doc.rect(ML + 2, y, 3, 9, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT);
    doc.text(section.name.toUpperCase(), ML + 7, y + 6);

    const topLevelProducts = products.filter((p) => !p.parentProductId);
    const secTotal = topLevelProducts.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(topLevelProducts.find((p) => getCurrency(p.price))?.price ?? null);
    if (secTotal > 0) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...ACCENT);
      doc.text(`${fmt(secTotal)} ${secCur}`, ML + CW - 2, y + 6, { align: "right" });
    }

    y += 13;

    // Products
    const PRICE_COL = 44;
    const TEXT_X = ML + IMG + 4;
    const TEXT_W = CW - IMG - 4 - PRICE_COL - 4;
    const PRICE_X = ML + CW;

    function renderPdfProduct(p: Product, isVariant: boolean, isLast: boolean) {
      const IML = isVariant ? ML + 8 : ML;
      const IIMG = isVariant ? IMG - 4 : IMG;
      const ITEXT_X = IML + IIMG + 4;
      const ITEXT_W = CW - (IML - ML) - IIMG - 4 - PRICE_COL - 4;

      const nameLines = (doc.splitTextToSize(p.name, ITEXT_W) as string[]).slice(0, 2);
      const detailRows: [string, string][] = [];
      if (p.supplier) detailRows.push([s.supplier, p.supplier]);
      if (p.manufacturer) detailRows.push([s.manufacturer, p.manufacturer]);
      if (p.dimensions) detailRows.push([s.dimension, p.dimensions]);
      if (p.color) detailRows.push([s.color, p.color]);
      detailRows.push([s.qty, `${p.quantity} ${s.unit}`]);
      const variantLabelH = isVariant ? 4 : 0;
      const textH = 4 + variantLabelH + nameLines.length * 5.2 + detailRows.length * 4.2 + 4;
      const rowH = Math.max(IIMG, textH);

      ensureSpace(rowH + 4);

      const rowY = y;

      // Image
      doc.setFillColor(...BORDER);
      doc.rect(IML, rowY, IIMG, IIMG, "F");

      if (imgCache[p.id]) {
        try {
          doc.addImage(imgCache[p.id], "JPEG", IML, rowY, IIMG, IIMG);
        } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, IML + IIMG / 2, rowY + IIMG / 2 + 1, { align: "center" });
      }

      if (p.url) doc.link(IML, rowY, IIMG, IIMG, { url: p.url });

      // Text column
      let cy = rowY + 4;

      if (isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("wariant", ITEXT_X, cy - 0.5);
        cy += 4;
      }

      doc.setFont(FONT, "bold");
      doc.setFontSize(isVariant ? 8.5 : 9.5);
      doc.setTextColor(...DARK);
      doc.text(nameLines, ITEXT_X, cy);
      cy += nameLines.length * 5.2;

      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      for (const [label, value] of detailRows) {
        doc.setTextColor(...MUTED);
        doc.text(`${label}: `, ITEXT_X, cy);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setTextColor(...DARK);
        doc.text(value, ITEXT_X + labelW, cy, { maxWidth: ITEXT_W - labelW });
        cy += 4.2;
      }

      // Price column
      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });

        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(`${p.quantity} × ${fmt(unit)} ${cur}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      // External link icon
      if (p.url) {
        const ICO = 5;
        const PX = 32;
        const ix = PRICE_X - ICO;
        const iy = rowY + IIMG - ICO - 2;
        try {
          const cv = document.createElement("canvas");
          cv.width = PX;
          cv.height = PX;
          const ctx = cv.getContext("2d")!;
          const scale = PX / 24;
          ctx.scale(scale, scale);
          ctx.strokeStyle = `rgb(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]})`;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke(new Path2D("M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"));
          ctx.stroke(new Path2D("M15 3h6v6"));
          ctx.stroke(new Path2D("M10 14L21 3"));
          doc.addImage(cv.toDataURL("image/png"), "PNG", ix, iy, ICO, ICO);
        } catch { /* skip */ }
        doc.link(ix, iy, ICO, ICO, { url: p.url });
      }

      y = rowY + rowH + 5;

      if (!isLast) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(ITEXT_X, y, ML + CW, y);
        y += 2;
      }
    }

    for (let i = 0; i < topLevelProducts.length; i++) {
      const p = topLevelProducts[i];
      const variants = products.filter((v) => v.parentProductId === p.id);
      const isLastTopLevel = i === topLevelProducts.length - 1;
      renderPdfProduct(p, false, isLastTopLevel && variants.length === 0);
      for (let vi = 0; vi < variants.length; vi++) {
        renderPdfProduct(variants[vi], true, isLastTopLevel && vi === variants.length - 1);
      }
    }

    y += 9;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(13);
    doc.setFillColor(...ACCENT);
    doc.rect(ML, y, CW, 11, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(s.grandTotal, ML + 5, y + 7.5);
    doc.text(
      `${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`,
      ML + CW - 5,
      y + 7.5,
      { align: "right" }
    );
  }

  // ── Page numbers ───────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }
}

// ─── Editorial renderer ───────────────────────────────────────────────────────
async function renderEditorial(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  _allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";
  const BLACK: RGB = [17, 17, 17];
  const MUTED: RGB = [120, 120, 120];
  const BORDER: RGB = [225, 225, 225];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const MID = PAGE_W / 2;
  const IMG = 28;
  const PRICE_COL = 40;

  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 16) {
      doc.addPage();
      y = 14;
    }
  }

  function fmt(n: number) { return fmtNum(n, opts.lang); }

  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const COL_W = MID - ML - 8;

  // ── Top rule ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, PAGE_W, 2, "F");

  // ── Date (top-right) ──────────────────────────────────────────────────────
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(today.toUpperCase(), PAGE_W - MR, 8, { align: "right" });

  // ── Left column: designer ─────────────────────────────────────────────────
  let ly = 9;
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(s.preparedBy.toUpperCase(), ML, ly);
  ly += 5.5;

  let editorialNameX = ML;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", ML, ly, 12, 12);
      editorialNameX = ML + 14;
      doc.setFont(FONT, "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...BLACK);
      doc.text(opts.designerName ?? "Projektant", ML + 14, ly + 7);
      ly += 14;
    } catch {
      doc.setFont(FONT, "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...BLACK);
      doc.text(opts.designerName ?? "Projektant", ML, ly + 5.5);
      ly += 7.5;
    }
  } else {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...BLACK);
    doc.text(opts.designerName ?? "Projektant", ML, ly + 5.5);
    ly += 7.5;
  }

  if (opts.designerEmail) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(opts.designerEmail, editorialNameX, ly);
    ly += 5;
  }

  // ── Right column: client ──────────────────────────────────────────────────
  let ry = 9;
  const rx = MID + 4;
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(s.preparedFor.toUpperCase(), rx, ry);
  ry += 5.5;

  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...BLACK);
    const clientNameLines = doc.splitTextToSize(opts.list.project.clientName, COL_W) as string[];
    doc.text(clientNameLines, rx, ry + 5.5);
    ry += 5.5 + clientNameLines.length * 5.5 + 2;
  }

  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    for (const line of addressLines) {
      doc.text(line, rx, ry, { maxWidth: COL_W });
      ry += 4.5;
    }
  }

  // ── Hairline below header ─────────────────────────────────────────────────
  y = Math.max(ly, ry) + 8;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 10;

  // ── Title block ───────────────────────────────────────────────────────────
  if (opts.list.project?.title) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${s.project.toUpperCase()} · ${opts.list.project.title.toUpperCase()}`, ML, y);
    y += 7;
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLACK);
  const titleLines = doc.splitTextToSize(opts.list.name, CW * 0.72) as string[];
  doc.text(titleLines, ML, y);
  y += titleLines.length * 9 + 9;

  // ── Sections ──────────────────────────────────────────────────────────────
  let sectionIndex = 0;
  const PRICE_X = PAGE_W - MR;
  const TEXT_X = ML + IMG + 4;
  const TEXT_W = CW - IMG - 4 - PRICE_COL - 4;

  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;
    sectionIndex++;

    ensureSpace(18);

    const topLevelProducts = products.filter((p) => !p.parentProductId);
    const secTotal = topLevelProducts.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(topLevelProducts.find((p) => getCurrency(p.price))?.price ?? null);

    // Section header: Roman num | name | total
    const roman = toRoman(sectionIndex);
    doc.setFont(FONT, "normal");
    doc.setFontSize(17);
    doc.setTextColor(...BLACK);
    doc.text(roman, ML, y);
    const numW = doc.getTextWidth(roman);

    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(section.name.toUpperCase(), ML + numW + 3, y - 0.5, { maxWidth: CW - numW - 3 - 36 });

    if (secTotal > 0) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(12);
      doc.setTextColor(...BLACK);
      doc.text(`${fmt(secTotal)} ${secCur}`, PRICE_X, y, { align: "right" });
    }

    y += 2;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 5;

    // Products
    function renderEditorialProduct(p: Product, isVariant: boolean, isLast: boolean) {
      const IML = isVariant ? ML + 8 : ML;
      const IIMG = isVariant ? IMG - 4 : IMG;
      const ITEXT_X = IML + IIMG + 4;
      const ITEXT_W = CW - (IML - ML) - IIMG - 4 - PRICE_COL - 4;

      const nameLines = (doc.splitTextToSize(p.name, ITEXT_W) as string[]).slice(0, 2);
      const detailRows: [string, string][] = [];
      if (p.supplier) detailRows.push([s.supplier, p.supplier]);
      if (p.manufacturer) detailRows.push([s.manufacturer, p.manufacturer]);
      if (p.dimensions) detailRows.push([s.dimension, p.dimensions]);
      if (p.color) detailRows.push([s.color, p.color]);
      detailRows.push([s.qty, `${p.quantity} ${s.unit}`]);
      const variantLabelH = isVariant ? 4.5 : 0;
      const textH = 5 + variantLabelH + nameLines.length * 5.5 + detailRows.length * 4.2 + 4;
      const rowH = Math.max(IIMG, textH);

      ensureSpace(rowH + 6);
      const rowY = y;

      doc.setFillColor(240, 240, 238);
      doc.rect(IML, rowY, IIMG, IIMG, "F");
      if (imgCache[p.id]) {
        try { doc.addImage(imgCache[p.id], "JPEG", IML, rowY, IIMG, IIMG); } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, IML + IIMG / 2, rowY + IIMG / 2 + 1, { align: "center" });
      }
      if (p.url) doc.link(IML, rowY, IIMG, IIMG, { url: p.url });

      let cy = rowY + 5;

      if (isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("wariant", ITEXT_X, cy - 0.5);
        cy += 4.5;
      }

      doc.setFont(FONT, "bold");
      doc.setFontSize(isVariant ? 9 : 10.5);
      doc.setTextColor(...BLACK);
      doc.text(nameLines, ITEXT_X, cy);
      cy += nameLines.length * 5.5;

      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      for (const [label, value] of detailRows) {
        doc.setTextColor(...MUTED);
        doc.text(`${label}: `, ITEXT_X, cy);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setTextColor(...BLACK);
        doc.text(value, ITEXT_X + labelW, cy, { maxWidth: ITEXT_W - labelW });
        cy += 4.2;
      }

      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });
        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(`${p.quantity} × ${fmt(unit)} ${cur}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      y = rowY + rowH + 4;

      if (!isLast) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(ITEXT_X, y, PAGE_W - MR, y);
        y += 2;
      }
    }

    for (let i = 0; i < topLevelProducts.length; i++) {
      const p = topLevelProducts[i];
      const variants = products.filter((v) => v.parentProductId === p.id);
      const isLastTopLevel = i === topLevelProducts.length - 1;
      renderEditorialProduct(p, false, isLastTopLevel && variants.length === 0);
      for (let vi = 0; vi < variants.length; vi++) {
        renderEditorialProduct(variants[vi], true, isLastTopLevel && vi === variants.length - 1);
      }
    }

    y += 10;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(18);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.6);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 8;
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(s.grandTotal.toUpperCase(), ML, y);
    doc.setFont(FONT, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...BLACK);
    doc.text(`${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`, PRICE_X, y, { align: "right" });
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }
}

// ─── Atelier renderer ─────────────────────────────────────────────────────────
async function renderAtelier(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  _allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";
  const BG: RGB = [250, 247, 242];
  const BANNER_BG: RGB = [242, 235, 221];
  const DARK: RGB = [42, 37, 32];
  const BRONZE: RGB = [139, 97, 60];
  const MUTED: RGB = [107, 93, 77];
  const BORDER: RGB = [214, 201, 172];
  const PROD_BG: RGB = [237, 227, 205];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const MID = PAGE_W / 2;
  const IMG = 30;
  const PRICE_COL = 42;

  let y = 0;

  function fillBg() {
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  }

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 16) {
      doc.addPage();
      fillBg();
      y = 14;
    }
  }

  function fmt(n: number) { return fmtNum(n, opts.lang); }

  fillBg();

  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const COL_W = MID - ML - 8;

  // ── Banner ────────────────────────────────────────────────────────────────
  const leftLineCount = 1 + (opts.designerEmail ? 1 : 0);
  const rightLineCount = (opts.list.project?.clientName ? 1 : 0) + addressLines.length;
  const BANNER_H = Math.max(leftLineCount, rightLineCount) * 5.5 + 34;

  doc.setFillColor(...BANNER_BG);
  doc.rect(0, 0, PAGE_W, BANNER_H, "F");

  // Bronze bottom hairline (faded in center via two lines)
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(0.3);
  doc.line(ML + 10, BANNER_H, PAGE_W - MR - 10, BANNER_H);

  // Vertical divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MID, 8, MID, BANNER_H - 8);

  // Left: designer
  let ly = 9;
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRONZE);
  doc.text(s.preparedBy, ML, ly);
  ly += 5.5;

  let atelierNameX = ML;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", ML, ly, 12, 12);
      atelierNameX = ML + 14;
      doc.setFont(FONT, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...DARK);
      doc.text(opts.designerName ?? "Projektant", ML + 14, ly + 7);
      ly += 14;
    } catch {
      doc.setFont(FONT, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...DARK);
      doc.text(opts.designerName ?? "Projektant", ML, ly + 6);
      ly += 8.5;
    }
  } else {
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(opts.designerName ?? "Projektant", ML, ly + 6);
    ly += 8.5;
  }

  if (opts.designerEmail) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(opts.designerEmail, atelierNameX, ly);
  }

  // Right: date + client
  let ry = 9;
  const rx = MID + 5;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRONZE);
  doc.text(today.toUpperCase(), rx, ry);
  ry += 6.5;

  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRONZE);
  doc.text(s.preparedFor, rx, ry);
  ry += 5.5;

  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    const clientNameLines = doc.splitTextToSize(opts.list.project.clientName, COL_W) as string[];
    doc.text(clientNameLines, rx, ry + 6);
    ry += 6 + clientNameLines.length * 5.5 + 2;
  }

  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    for (const line of addressLines) {
      doc.text(line, rx, ry, { maxWidth: COL_W });
      ry += 4.5;
    }
  }

  // ── Title zone ────────────────────────────────────────────────────────────
  y = BANNER_H + 12;

  if (opts.list.project?.title) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text(opts.list.project.title.toUpperCase(), ML, y);
    y += 6;
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(opts.list.name, CW * 0.8) as string[];
  doc.text(titleLines, ML, y);
  y += titleLines.length * 9 + 8;

  // ── Sections ──────────────────────────────────────────────────────────────
  let sectionIndex = 0;
  const PRICE_X = PAGE_W - MR;
  const TEXT_X = ML + IMG + 4;
  const TEXT_W = CW - IMG - 4 - PRICE_COL - 4;

  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;
    sectionIndex++;

    ensureSpace(18);

    const topLevelProducts = products.filter((p) => !p.parentProductId);
    const secTotal = topLevelProducts.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(topLevelProducts.find((p) => getCurrency(p.price))?.price ?? null);

    // Section header: filled circle + name + line + bronze total
    const CIRC_R = 4;
    const CIRC_X = ML + CIRC_R;
    const CIRC_Y = y + CIRC_R;
    doc.setFillColor(...DARK);
    doc.circle(CIRC_X, CIRC_Y, CIRC_R, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(250, 247, 242);
    doc.text(String(sectionIndex), CIRC_X, CIRC_Y + 1, { align: "center" });

    const nameX = ML + CIRC_R * 2 + 4;
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(section.name, nameX, CIRC_Y + 3.5);
    const nameW = doc.getTextWidth(section.name);

    if (secTotal > 0) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BRONZE);
      const totalStr = `${fmt(secTotal)} ${secCur}`;
      doc.text(totalStr, PRICE_X, CIRC_Y + 3.5, { align: "right" });
      const totalW = doc.getTextWidth(totalStr);
      const lineX1 = nameX + nameW + 4;
      const lineX2 = PRICE_X - totalW - 4;
      if (lineX2 > lineX1 + 4) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(lineX1, CIRC_Y + 2, lineX2, CIRC_Y + 2);
      }
    } else {
      const lineX1 = nameX + nameW + 4;
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.line(lineX1, CIRC_Y + 2, PRICE_X, CIRC_Y + 2);
    }

    y = CIRC_Y + CIRC_R + 5;

    // Products
    function renderAtelierProduct(p: Product, isVariant: boolean, isLast: boolean) {
      const IML = isVariant ? ML + 8 : ML;
      const IIMG = isVariant ? IMG - 4 : IMG;
      const ITEXT_X = IML + IIMG + 4;
      const ITEXT_W = CW - (IML - ML) - IIMG - 4 - PRICE_COL - 4;

      const nameLines = (doc.splitTextToSize(p.name, ITEXT_W) as string[]).slice(0, 2);
      const detailRows: [string, string][] = [];
      if (p.supplier) detailRows.push([s.supplier, p.supplier]);
      if (p.manufacturer) detailRows.push([s.manufacturer, p.manufacturer]);
      if (p.dimensions) detailRows.push([s.dimension, p.dimensions]);
      if (p.color) detailRows.push([s.color, p.color]);
      detailRows.push([s.qty, `${p.quantity} ${s.unit}`]);
      const variantLabelH = isVariant ? 4.5 : 0;
      const textH = 5 + variantLabelH + nameLines.length * 5.2 + detailRows.length * 4.2 + 4;
      const rowH = Math.max(IIMG, textH);

      ensureSpace(rowH + 6);
      const rowY = y;

      doc.setFillColor(...PROD_BG);
      doc.roundedRect(IML, rowY, IIMG, IIMG, 2, 2, "F");
      if (imgCache[p.id]) {
        try { doc.addImage(imgCache[p.id], "JPEG", IML, rowY, IIMG, IIMG); } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, IML + IIMG / 2, rowY + IIMG / 2 + 1, { align: "center" });
      }
      if (p.url) doc.link(IML, rowY, IIMG, IIMG, { url: p.url });

      let cy = rowY + 5;

      if (isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("wariant", ITEXT_X, cy - 0.5);
        cy += 4.5;
      }

      doc.setFont(FONT, "bold");
      doc.setFontSize(isVariant ? 9 : 10);
      doc.setTextColor(...DARK);
      doc.text(nameLines, ITEXT_X, cy);
      cy += nameLines.length * 5.2;

      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      for (const [label, value] of detailRows) {
        doc.setTextColor(...MUTED);
        doc.text(`${label}: `, ITEXT_X, cy);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setTextColor(...DARK);
        doc.text(value, ITEXT_X + labelW, cy, { maxWidth: ITEXT_W - labelW });
        cy += 4.2;
      }

      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(12);
        doc.setTextColor(...DARK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });
        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...BRONZE);
          doc.text(`${p.quantity} × ${fmt(unit)} ${cur}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      y = rowY + rowH + 4;

      if (!isLast) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(ITEXT_X, y, PAGE_W - MR, y);
        y += 2;
      }
    }

    for (let i = 0; i < topLevelProducts.length; i++) {
      const p = topLevelProducts[i];
      const variants = products.filter((v) => v.parentProductId === p.id);
      const isLastTopLevel = i === topLevelProducts.length - 1;
      renderAtelierProduct(p, false, isLastTopLevel && variants.length === 0);
      for (let vi = 0; vi < variants.length; vi++) {
        renderAtelierProduct(variants[vi], true, isLastTopLevel && vi === variants.length - 1);
      }
    }

    y += 10;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(16);
    doc.setFillColor(...DARK);
    doc.roundedRect(ML, y, CW, 12, 4, 4, "F");
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(250, 247, 242);
    doc.text(s.grandTotal, ML + 7, y + 8);
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.text(`${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`, PAGE_W - MR - 7, y + 8, { align: "right" });
    y += 12;
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
  }
}

// ─── Architect renderer ───────────────────────────────────────────────────────
async function renderArchitect(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";
  const BLACK: RGB = [17, 17, 17];
  const MUTED: RGB = [153, 153, 153];
  const BORDER: RGB = [229, 229, 229];
  const DARK_MUTED: RGB = [85, 85, 85];
  const IMG_BG: RGB = [244, 244, 242];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const MID = PAGE_W / 2;
  const IMG = 26;
  const IDX_W = 14;
  const PRICE_COL = 40;

  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 16) {
      doc.addPage();
      y = 14;
    }
  }

  function fmt(n: number) { return fmtNum(n, opts.lang); }

  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const COL_W = MID - ML - 4;
  const docTypeLabel = opts.lang === "pl" ? "Lista zakupowa" : "Shopping list";

  // ── Topbar ────────────────────────────────────────────────────────────────
  const TOPBAR_H = 16;
  const CELL_W = CW / 3;

  doc.setFont(FONT, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("DOC / TYPE", ML, 7);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(docTypeLabel, ML, 12);

  const CELL2_X = ML + CELL_W;
  doc.setFont(FONT, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("REF. \u2116", CELL2_X, 7);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(opts.list.name.slice(0, 28), CELL2_X, 12);

  doc.setFont(FONT, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("DATE", PAGE_W - MR, 7, { align: "right" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(today, PAGE_W - MR, 12, { align: "right" });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(ML, TOPBAR_H, PAGE_W - MR, TOPBAR_H);
  y = TOPBAR_H;

  // ── Meta grid ─────────────────────────────────────────────────────────────
  const leftLines = 1 + (opts.designerEmail ? 1 : 0);
  const rightLines = (opts.list.project?.clientName ? 1 : 0) + addressLines.length;
  const META_H = Math.max(leftLines, rightLines) * 5.5 + 22;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(MID, y, MID, y + META_H);

  let ly = y + 8;
  doc.setFont(FONT, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("FROM / STUDIO", ML, ly);
  ly += 5.5;

  let architectNameX = ML;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", ML, ly, 12, 12);
      architectNameX = ML + 14;
      doc.setFont(FONT, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text(opts.designerName ?? "Projektant", ML + 14, ly + 7);
      ly += 14;
    } catch {
      doc.setFont(FONT, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      doc.text(opts.designerName ?? "Projektant", ML, ly + 5.5);
      ly += 7.5;
    }
  } else {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(opts.designerName ?? "Projektant", ML, ly + 5.5);
    ly += 7.5;
  }

  if (opts.designerEmail) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_MUTED);
    doc.text(opts.designerEmail, architectNameX, ly);
  }

  let ry = y + 8;
  const rx = MID + 5;
  doc.setFont(FONT, "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("FOR / CLIENT", rx, ry);
  ry += 5.5;

  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    const clientNameLines = doc.splitTextToSize(opts.list.project.clientName, COL_W) as string[];
    doc.text(clientNameLines, rx, ry + 5.5);
    ry += 5.5 + clientNameLines.length * 5.5 + 2;
  }

  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_MUTED);
    for (const line of addressLines) {
      doc.text(line, rx, ry, { maxWidth: COL_W });
      ry += 4.5;
    }
  }

  y += META_H;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PAGE_W - MR, y);

  // ── Title block ───────────────────────────────────────────────────────────
  y += 12;

  if (opts.list.project?.title) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`PROJECT · ${opts.list.project.title.toUpperCase()}`, ML, y);
    y += 7;
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  const titleLines = doc.splitTextToSize(opts.list.name, CW * 0.72) as string[];
  doc.text(titleLines, ML, y);

  // Item count (right) — top-level products only
  const topLevelCount = exportSections.reduce((sum, sec) => sum + sec.products.filter((p) => !p.hidden && !p.parentProductId).length, 0);
  const countLabel = opts.lang === "pl" ? "POZYCJI" : "ITEMS";
  doc.setFont(FONT, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(countLabel, PAGE_W - MR, y, { align: "right" });
  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BLACK);
  doc.text(String(topLevelCount).padStart(2, "0"), PAGE_W - MR, y + 9, { align: "right" });

  y += titleLines.length * 10 + 10;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PAGE_W - MR, y);
  y += 8;

  // ── Sections ──────────────────────────────────────────────────────────────
  let sectionIndex = 0;
  let productIndex = 0;
  const PRICE_X = PAGE_W - MR;
  const TEXT_X = ML + IDX_W + IMG + 4;
  const TEXT_W = CW - IDX_W - IMG - 4 - PRICE_COL - 4;

  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;
    sectionIndex++;

    ensureSpace(16);

    const topLevelProducts = products.filter((p) => !p.parentProductId);
    const secTotal = topLevelProducts.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(topLevelProducts.find((p) => getCurrency(p.price))?.price ?? null);

    // Section header: § 01 | NAME | TOTAL
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const secNum = `\u00a7 ${String(sectionIndex).padStart(2, "0")}`;
    doc.text(secNum, ML, y);
    const numW = doc.getTextWidth(secNum);

    doc.setFont(FONT, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(section.name.toUpperCase(), ML + numW + 5, y, { maxWidth: CW - numW - 5 - 36 });

    if (secTotal > 0) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(`${fmt(secTotal)} ${secCur}`, PRICE_X, y, { align: "right" });
    }

    y += 2;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 5;

    // Products
    const LABEL_COL = 18;

    function renderArchitectProduct(p: Product, isVariant: boolean, isLast: boolean) {
      const IOFFSET = isVariant ? 8 : 0;
      const IML_IMG = ML + IDX_W + IOFFSET;
      const IIMG = isVariant ? IMG - 4 : IMG;
      const ITEXT_X = IML_IMG + IIMG + 4;
      const ITEXT_W = CW - IDX_W - IOFFSET - IIMG - 4 - PRICE_COL - 4;

      const nameLines = (doc.splitTextToSize(p.name, ITEXT_W) as string[]).slice(0, 2);
      const metaRows: [string, string][] = [];
      if (p.supplier) metaRows.push(["supplier", p.supplier]);
      else if (p.manufacturer) metaRows.push(["producer", p.manufacturer]);
      if (p.dimensions) metaRows.push(["dim", p.dimensions]);
      if (p.color) metaRows.push(["finish", p.color]);
      metaRows.push(["qty", `${p.quantity} ${s.unit}`]);
      const variantLabelH = isVariant ? 4.5 : 0;
      const textH = 5 + variantLabelH + nameLines.length * 5.2 + metaRows.length * 4 + 4;
      const rowH = Math.max(IIMG, textH);

      ensureSpace(rowH + 6);
      const rowY = y;

      // Index (top-level only)
      if (!isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(String(productIndex).padStart(3, "0"), ML, rowY + 5);
      }

      // Image
      doc.setFillColor(...IMG_BG);
      doc.rect(IML_IMG, rowY, IIMG, IIMG, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.rect(IML_IMG, rowY, IIMG, IIMG, "S");
      if (imgCache[p.id]) {
        try { doc.addImage(imgCache[p.id], "JPEG", IML_IMG, rowY, IIMG, IIMG); } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, IML_IMG + IIMG / 2, rowY + IIMG / 2 + 1, { align: "center" });
      }
      if (p.url) doc.link(IML_IMG, rowY, IIMG, IIMG, { url: p.url });

      let cy = rowY + 5;

      if (isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("wariant", ITEXT_X, cy - 0.5);
        cy += 4.5;
      }

      doc.setFont(FONT, "bold");
      doc.setFontSize(isVariant ? 8.5 : 9.5);
      doc.setTextColor(...BLACK);
      doc.text(nameLines, ITEXT_X, cy);
      cy += nameLines.length * 5.2;

      doc.setFontSize(7.5);
      for (const [label, value] of metaRows) {
        doc.setFont(FONT, "bold");
        doc.setTextColor(...MUTED);
        doc.text(label.toUpperCase(), ITEXT_X, cy);
        doc.setFont(FONT, "normal");
        doc.setTextColor(...BLACK);
        doc.text(value, ITEXT_X + LABEL_COL, cy, { maxWidth: ITEXT_W - LABEL_COL });
        cy += 4;
      }

      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BLACK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });
        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...MUTED);
          doc.text(`${p.quantity} \u00d7 ${fmt(unit)}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      y = rowY + rowH + 4;

      if (!isLast) {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(ML + IDX_W, y, PAGE_W - MR, y);
        y += 2;
      }
    }

    for (let i = 0; i < topLevelProducts.length; i++) {
      const p = topLevelProducts[i];
      const variants = products.filter((v) => v.parentProductId === p.id);
      const isLastTopLevel = i === topLevelProducts.length - 1;
      productIndex++;
      renderArchitectProduct(p, false, isLastTopLevel && variants.length === 0);
      for (let vi = 0; vi < variants.length; vi++) {
        renderArchitectProduct(variants[vi], true, isLastTopLevel && vi === variants.length - 1);
      }
    }

    y += 9;
  }

  // ── Grand total (double border) ────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(18);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.6);
    doc.line(ML, y, PAGE_W - MR, y);
    y += 8;
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_MUTED);
    doc.text(s.grandTotal.toUpperCase(), ML, y);
    doc.setFont(FONT, "bold");
    doc.setFontSize(22);
    doc.setTextColor(...BLACK);
    doc.text(`${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`, PRICE_X, y, { align: "right" });
    y += 8;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.6);
    doc.line(ML, y, PAGE_W - MR, y);
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }
}

// ─── Linen renderer ───────────────────────────────────────────────────────────
async function renderLinen(
  doc: import("jspdf").jsPDF,
  opts: GeneratePdfOptions,
  exportSections: Section[],
  _allVisible: Product[],
  imgCache: Record<string, string>,
  logoDataUrl: string | null
) {
  const s = STR[opts.lang];
  const FONT = "Geist";
  const BG: RGB = [245, 242, 236];
  const DARK: RGB = [43, 39, 34];
  const BRONZE: RGB = [139, 97, 60];
  const MUTED: RGB = [107, 93, 77];
  const STONE: RGB = [150, 139, 122];
  const BORDER: RGB = [232, 224, 208];
  const SEC_BORDER: RGB = [241, 234, 220];
  const WHITE: RGB = [255, 255, 255];
  const PROD_BG: RGB = [245, 240, 228];

  const PAGE_W = 210;
  const PAGE_H = 297;
  const ML = 14;
  const MR = 14;
  const CW = PAGE_W - ML - MR;
  const MID = PAGE_W / 2;
  const IMG = 27;
  const PRICE_COL = 40;
  const CARD_PAD = 6;

  let y = 0;

  function fillBg() {
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  }

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 16) {
      doc.addPage();
      fillBg();
      y = 14;
    }
  }

  function fmt(n: number) { return fmtNum(n, opts.lang); }

  fillBg();

  const today = fmtDate(opts.lang);
  const addressLines = buildAddressLines(opts.list.project);
  const COL_W = MID - ML - 10;

  // ── Head ──────────────────────────────────────────────────────────────────
  y = 10;

  // Date pill (right side)
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  const pillW = doc.getTextWidth(today) + 10;
  const pillH = 6;
  const pillX = PAGE_W - MR - pillW;
  doc.setFillColor(...WHITE);
  doc.roundedRect(pillX, y, pillW, pillH, pillH / 2, pillH / 2, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(pillX, y, pillW, pillH, pillH / 2, pillH / 2, "S");
  doc.setTextColor(...MUTED);
  doc.text(today, pillX + 5, y + 4.2);

  // Designer name / logo (left)
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", ML, y, 12, 12);
      doc.text(opts.designerName ?? "Studio", ML + 14, y + 7);
    } catch {
      doc.text(opts.designerName ?? "Studio", ML, y + 5);
    }
  } else {
    doc.text(opts.designerName ?? "Studio", ML, y + 5);
  }

  y += 12;

  // White rounded head-grid card
  const leftContentLines = 1 + (opts.designerEmail ? 1 : 0);
  const rightContentLines = (opts.list.project?.clientName ? 1 : 0) + addressLines.length;
  const HEAD_CARD_H = Math.max(leftContentLines, rightContentLines) * 5.5 + 20;

  doc.setFillColor(...WHITE);
  doc.roundedRect(ML, y, CW, HEAD_CARD_H, 5, 5, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(ML, y, CW, HEAD_CARD_H, 5, 5, "S");

  const cardML = ML + 8;
  let cardY = y + 7;
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...STONE);
  doc.text(s.preparedBy.toUpperCase(), cardML, cardY);
  cardY += 5;
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(opts.designerName ?? "Projektant", cardML, cardY + 4, { maxWidth: COL_W });
  cardY += 6.5;
  if (opts.designerEmail) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(opts.designerEmail, cardML, cardY, { maxWidth: COL_W });
  }

  const cardRX = MID + 4;
  let cardRY = y + 7;
  doc.setFont(FONT, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...STONE);
  doc.text(s.preparedFor.toUpperCase(), cardRX, cardRY);
  cardRY += 5;
  if (opts.list.project?.clientName) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    const clientNameLines = doc.splitTextToSize(opts.list.project.clientName, COL_W) as string[];
    doc.text(clientNameLines, cardRX, cardRY + 4);
    cardRY += 4 + clientNameLines.length * 5.5 + 2;
  }
  if (addressLines.length > 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    for (const line of addressLines) {
      doc.text(line, cardRX, cardRY, { maxWidth: COL_W });
      cardRY += 4.5;
    }
  }

  y += HEAD_CARD_H + 10;

  // ── Title zone ────────────────────────────────────────────────────────────
  if (opts.list.project?.title) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...STONE);
    doc.text(opts.list.project.title.toUpperCase(), ML, y);
    y += 6;
  }

  doc.setFont(FONT, "bold");
  doc.setFontSize(19);
  doc.setTextColor(...DARK);
  const titleLines = doc.splitTextToSize(opts.list.name, CW * 0.75) as string[];
  doc.text(titleLines, ML, y);
  y += titleLines.length * 8.5 + 9;

  // ── Sections (white rounded cards) ────────────────────────────────────────
  const PRICE_X = PAGE_W - MR - CARD_PAD;

  for (const section of exportSections) {
    const products = section.products.filter((p) => !p.hidden);
    if (products.length === 0) continue;

    const topLevelProducts = products.filter((p) => !p.parentProductId);
    const secTotal = topLevelProducts.reduce((sum, p) => {
      const n = parsePrice(p.price);
      return n !== null ? sum + n * p.quantity : sum;
    }, 0);
    const secCur = getCurrency(topLevelProducts.find((p) => getCurrency(p.price))?.price ?? null);

    const cardInnerML = ML + CARD_PAD;
    const cardCW = CW - CARD_PAD * 2;
    const TEXT_X = cardInnerML + IMG + 4;
    const TEXT_W = cardCW - IMG - 4 - PRICE_COL;

    // Pre-calculate per-product row heights (variants included, with label offset)
    const rowHeightMap = new Map(products.map((p) => {
      const isVar = !!p.parentProductId;
      const nl = (doc.splitTextToSize(p.name, TEXT_W) as string[]).slice(0, 2);
      const dr: unknown[] = [];
      if (p.supplier) dr.push(null);
      if (p.manufacturer) dr.push(null);
      if (p.dimensions) dr.push(null);
      if (p.color) dr.push(null);
      dr.push(null); // qty
      const textH = 5 + (isVar ? 4.5 : 0) + nl.length * 5.2 + dr.length * 4 + 4;
      return [p.id, Math.max(IMG, textH)] as [string, number];
    }));
    const totalRowH = Array.from(rowHeightMap.values()).reduce((s, h) => s + h + 4, 0) + (products.length - 1) * 2;
    const estCardH = 14 + totalRowH + CARD_PAD * 2 + 4;
    const maxCardH = PAGE_H - 28;
    const drawCard = estCardH <= maxCardH;

    if (drawCard) {
      ensureSpace(estCardH + 4);
    } else {
      ensureSpace(22);
    }

    const cardStartY = y;

    if (drawCard) {
      doc.setFillColor(...WHITE);
      doc.roundedRect(ML, cardStartY, CW, estCardH, 5, 5, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(ML, cardStartY, CW, estCardH, 5, 5, "S");
    }

    y = cardStartY + CARD_PAD;

    // Section header: dot + name + total
    const DOT_R = 2;
    doc.setFillColor(...BRONZE);
    doc.circle(cardInnerML + DOT_R, y + 4, DOT_R, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(section.name.toUpperCase(), cardInnerML + DOT_R * 2 + 3, y + 5.5);

    if (secTotal > 0) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(`${fmt(secTotal)} ${secCur}`, PRICE_X, y + 5.5, { align: "right" });
    }

    y += DOT_R * 2 + 6;
    doc.setDrawColor(...SEC_BORDER);
    doc.setLineWidth(0.2);
    doc.line(cardInnerML, y, ML + CW - CARD_PAD, y);
    y += 4;

    // Products
    function renderLinenProduct(p: Product, isVariant: boolean, isLast: boolean) {
      const IOFFSET = isVariant ? 8 : 0;
      const IML_IMG = cardInnerML + IOFFSET;
      const IIMG = isVariant ? IMG - 4 : IMG;
      const ITEXT_X = IML_IMG + IIMG + 4;
      const ITEXT_W = cardCW - IOFFSET - IIMG - 4 - PRICE_COL;
      const rowH = rowHeightMap.get(p.id) ?? IMG;

      const rowY = y;
      doc.setFillColor(...PROD_BG);
      doc.roundedRect(IML_IMG, rowY, IIMG, IIMG, 3, 3, "F");
      if (imgCache[p.id]) {
        try { doc.addImage(imgCache[p.id], "JPEG", IML_IMG, rowY, IIMG, IIMG); } catch { /* skip */ }
      } else {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(s.noImage, IML_IMG + IIMG / 2, rowY + IIMG / 2 + 1, { align: "center" });
      }
      if (p.url) doc.link(IML_IMG, rowY, IIMG, IIMG, { url: p.url });

      let cy = rowY + 5;

      if (isVariant) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("wariant", ITEXT_X, cy - 0.5);
        cy += 4.5;
      }

      doc.setFont(FONT, "bold");
      doc.setFontSize(isVariant ? 9 : 10);
      doc.setTextColor(...DARK);
      const nameLines = (doc.splitTextToSize(p.name, ITEXT_W) as string[]).slice(0, 2);
      doc.text(nameLines, ITEXT_X, cy);
      cy += nameLines.length * 5.2;

      const detailRows: [string, string][] = [];
      if (p.supplier) detailRows.push([s.supplier, p.supplier]);
      if (p.manufacturer) detailRows.push([s.manufacturer, p.manufacturer]);
      if (p.dimensions) detailRows.push([s.dimension, p.dimensions]);
      if (p.color) detailRows.push([s.color, p.color]);
      detailRows.push([s.qty, `${p.quantity} ${s.unit}`]);

      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      for (const [label, value] of detailRows) {
        doc.setTextColor(...MUTED);
        doc.text(`${label}: `, ITEXT_X, cy);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setTextColor(...DARK);
        doc.text(value, ITEXT_X + labelW, cy, { maxWidth: ITEXT_W - labelW });
        cy += 4;
      }

      const unit = parsePrice(p.price);
      const cur = getCurrency(p.price);
      if (unit !== null) {
        const total = unit * p.quantity;
        doc.setFont(FONT, "bold");
        doc.setFontSize(11);
        doc.setTextColor(...DARK);
        doc.text(`${fmt(total)} ${cur}`, PRICE_X, rowY + 6, { align: "right" });
        if (p.quantity > 1) {
          doc.setFont(FONT, "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...STONE);
          doc.text(`${p.quantity} \u00d7 ${fmt(unit)} ${cur}`, PRICE_X, rowY + 11.5, { align: "right" });
        }
      } else if (p.quantity > 1) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...STONE);
        doc.text(`${p.quantity} ${s.unit}`, PRICE_X, rowY + 6, { align: "right" });
      }

      y = rowY + rowH + 4;

      if (!isLast) {
        doc.setDrawColor(...SEC_BORDER);
        doc.setLineWidth(0.2);
        doc.line(ITEXT_X, y, ML + CW - CARD_PAD, y);
        y += 2;
      }
    }

    for (let i = 0; i < topLevelProducts.length; i++) {
      const p = topLevelProducts[i];
      const variants = products.filter((v) => v.parentProductId === p.id);
      const isLastTopLevel = i === topLevelProducts.length - 1;
      renderLinenProduct(p, false, isLastTopLevel && variants.length === 0);
      for (let vi = 0; vi < variants.length; vi++) {
        renderLinenProduct(variants[vi], true, isLastTopLevel && vi === variants.length - 1);
      }
    }

    y += CARD_PAD + 6;
  }

  // ── Grand total ────────────────────────────────────────────────────────────
  if (opts.hasTotal) {
    ensureSpace(14);
    doc.setFillColor(...DARK);
    doc.roundedRect(ML, y, CW, 12, 5, 5, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(245, 242, 236);
    doc.text(s.grandTotal.toUpperCase(), ML + 8, y + 8);
    doc.setFont(FONT, "bold");
    doc.setFontSize(13);
    doc.text(`${fmtNum(opts.grandTotal, opts.lang)} ${opts.grandCurrency}`, PAGE_W - MR - 8, y + 8, { align: "right" });
    y += 12;
  }

  // ── Page numbers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...STONE);
    doc.text(`${pg} / ${totalPages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }
}
