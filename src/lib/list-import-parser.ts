/**
 * Parser for shopping list import (xlsx/csv).
 * Supports two formats:
 *   - "flat": first row = headers, subsequent rows = products (external apps)
 *   - "veedeck": structured export with meta rows, section headers, product rows
 */

export interface FieldMapping {
  name: string | null;
  section: string | null;
  url: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: string | null;
  unit: string | null;
  catalogNumber: string | null;
  supplier: string | null;
  category: string | null;
  note: string | null;
}

export interface ParsedRow {
  cells: Record<string, string>;
  imageBlob?: Blob;
  /** Section name inferred from a separator row (single-cell row before this product row). Overrides the mapped section column. */
  inferredSection?: string;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  suggestedListName: string;
  suggestedMappings: Partial<FieldMapping>;
  hasImages: boolean;
  imageCount: number;
  format: "flat" | "veedeck";
}

// Synonyms for auto-matching column names → Veedeck fields
const FIELD_SYNONYMS: Record<keyof FieldMapping, string[]> = {
  name: ["nazwa", "name", "produkt", "product", "item", "opis produktu", "nazwa produktu", "artykuł"],
  section: ["sekcja", "section", "pokój", "pomieszczenie", "room", "strefa", "zone", "obszar"],
  url: ["url", "link", "sklep", "źródło", "strona", "shop", "website", "adres url", "adres www"],
  price: ["cena", "price", "cena jedn.", "unit price", "cena netto", "cena brutto", "cena jednostkowa"],
  manufacturer: ["producent", "manufacturer", "marka", "brand", "firma", "wytwórca"],
  color: ["kolor", "color", "wykończenie", "finish", "barwa", "kolor/wykończenie"],
  dimensions: ["wymiary", "wymiar", "dimensions", "rozmiar", "size", "gabaryty", "format"],
  description: ["opis", "description", "szczegóły", "details", "informacje", "specyfikacja"],
  deliveryTime: ["czas dostawy", "delivery", "delivery time", "termin dostawy", "czas realizacji", "dostawa"],
  quantity: ["ilość", "qty", "quantity", "szt.", "count", "liczba", "ilosc", "sztuki"],
  unit: ["jednostka", "unit", "jm.", "j.m.", "jednostka miary", "miara"],
  catalogNumber: ["nr kat.", "nr katalogowy", "symbol", "indeks", "sku", "kod", "numer katalogowy", "catalog", "ref.", "ref", "numer"],
  supplier: ["dostawca", "sklep", "supplier", "store", "vendor", "źródło zakupu", "gdzie kupić"],
  category: ["kategoria", "category", "typ", "type", "rodzaj", "cat"],
  note: ["notatka", "uwagi", "note", "notes", "komentarz", "informacja", "info"],
};

// Column names that indicate it's a Veedeck export header row
const VEEDECK_HEADER_SIGNALS = new Set(["lp.", "lp", "no.", "no"]);

function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ");
}

function suggestMappings(headers: string[]): Partial<FieldMapping> {
  const mapping: Partial<FieldMapping> = {};
  const fields = Object.keys(FIELD_SYNONYMS) as (keyof FieldMapping)[];

  for (const header of headers) {
    const n = normalize(header);
    for (const field of fields) {
      if (!mapping[field]) {
        if (FIELD_SYNONYMS[field].some((syn) => n === syn || n.startsWith(syn + " ") || n.endsWith(" " + syn))) {
          mapping[field] = header;
          break;
        }
      }
    }
  }
  return mapping;
}

function isVeeDeckFormat(rows: string[][]): boolean {
  // Veedeck export: row 0 is the list name (single non-empty cell)
  if (rows.length < 5) return false;
  const row0 = rows[0].filter((c) => String(c).trim());
  if (row0.length !== 1) return false;
  // One of the first 6 rows should have Veedeck header signals (Lp., Nazwa)
  for (let i = 1; i < Math.min(rows.length, 8); i++) {
    const row = rows[i].map(normalize);
    if (row.some((c) => VEEDECK_HEADER_SIGNALS.has(c)) && row.some((c) => c === "nazwa" || c === "name")) {
      return true;
    }
  }
  return false;
}

/**
 * Main entry point. Parse a .xlsx or .csv File into a ParseResult.
 */
export async function parseImportFile(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellText: true, cellNF: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Get all rows as string arrays
  const allRows: string[][] = (XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][]).map((row) => (row as unknown[]).map((c) => String(c ?? "")));

  const format = isVeeDeckFormat(allRows) ? "veedeck" : "flat";

  if (format === "veedeck") {
    return parseVeeDeckFormat(allRows, file.name);
  }
  return parseFlatFormat(allRows, file);
}

// ---------------------------------------------------------------------------
// Flat format (external apps): row 0 = headers, rows 1+ = products
// ---------------------------------------------------------------------------

async function parseFlatFormat(allRows: string[][], file: File): Promise<ParseResult> {
  if (allRows.length < 2) {
    return {
      headers: [],
      rows: [],
      suggestedListName: cleanFilename(file.name),
      suggestedMappings: {},
      hasImages: false,
      imageCount: 0,
      format: "flat",
    };
  }

  const rawHeaders = allRows[0].map((h) => String(h).trim());
  // Filter out empty columns — but keep track of original column indices
  const headerMap: Array<{ label: string; colIdx: number }> = rawHeaders
    .map((h, i) => ({ label: h, colIdx: i }))
    .filter((h) => h.label !== "");

  const headers = headerMap.map((h) => h.label);

  // Pre-compute suggested mappings so we know which column is "name"
  // (needed to detect section-separator rows before product rows)
  const suggestedMappings = suggestMappings(headers);
  const nameColIdx = suggestedMappings.name
    ? (headerMap.find((h) => h.label === suggestedMappings.name)?.colIdx ?? -1)
    : -1;

  // Parse data rows, tracking original row index for image matching
  type RowWithIndex = ParsedRow & { _rowIndex: number };
  const rawRows: RowWithIndex[] = [];
  let currentSection = "";

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const nonEmpty = row.filter((c) => c.trim());
    if (nonEmpty.length === 0) continue;

    const nameValue = nameColIdx >= 0 ? String(row[nameColIdx] ?? "").trim() : "";

    // Detect section-separator rows: ≤2 non-empty cells and no product name.
    // These rows act as room/section headers in apps that embed them between groups.
    if (nonEmpty.length <= 2 && !nameValue) {
      // Pick the non-numeric cell as the section name; fall back to first cell.
      const sectionCandidate =
        nonEmpty.find((v) => !/^\d+\.?$/.test(v.trim())) ?? nonEmpty[0];
      currentSection = sectionCandidate.trim();
      continue; // Not a product row — don't add to rawRows
    }

    const cells: Record<string, string> = {};
    for (const { label, colIdx } of headerMap) {
      cells[label] = String(row[colIdx] ?? "").trim();
    }
    const parsedRow: RowWithIndex = { cells, _rowIndex: i };
    if (currentSection) {
      parsedRow.inferredSection = currentSection;
    }
    rawRows.push(parsedRow);
  }

  // Extract embedded images from xlsx (silent fail if not possible)
  let hasImages = false;
  let imageCount = 0;

  if (file.name.toLowerCase().endsWith(".xlsx")) {
    try {
      const imageMap = await extractEmbeddedImages(file);
      for (const row of rawRows) {
        const blob = imageMap.get(row._rowIndex);
        if (blob) {
          row.imageBlob = blob;
          hasImages = true;
          imageCount++;
        }
      }
    } catch {
      // Silently continue — images just won't be imported
    }
  }

  // Strip internal _rowIndex
  const rows: ParsedRow[] = rawRows.map(({ _rowIndex: _ri, ...r }) => r);

  return {
    headers,
    rows,
    suggestedListName: cleanFilename(file.name),
    suggestedMappings,
    hasImages,
    imageCount,
    format: "flat",
  };
}

// ---------------------------------------------------------------------------
// Veedeck structured format
// ---------------------------------------------------------------------------

function parseVeeDeckFormat(allRows: string[][], filename: string): ParseResult {
  const suggestedListName = allRows[0]?.[0]?.trim() || cleanFilename(filename);

  // Normalize: add a "Sekcja" virtual column to every product row
  const rows: ParsedRow[] = [];
  let productHeaders: string[] = [];
  let currentSection = "Produkty";

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const nonEmpty = row.map((c) => c.trim()).filter(Boolean);

    // Skip first 3 metadata rows
    if (i < 3) continue;

    // Skip completely empty rows
    if (nonEmpty.length === 0) continue;

    // Detect header row (contains Lp. and Nazwa)
    const rowNorm = row.map(normalize);
    const isHeaderRow =
      rowNorm.some((c) => VEEDECK_HEADER_SIGNALS.has(c)) &&
      rowNorm.some((c) => c === "nazwa" || c === "name");

    if (isHeaderRow) {
      // Check if previous row was a section name
      const prevNonEmpty = (allRows[i - 1] ?? []).map((c) => c.trim()).filter(Boolean);
      if (prevNonEmpty.length === 1) {
        currentSection = prevNonEmpty[0];
      }
      productHeaders = row.map((c) => c.trim()).filter(Boolean);
      continue;
    }

    // Skip total/summary rows
    if (nonEmpty.some((c) => c.toLowerCase().startsWith("razem") || c.toLowerCase().startsWith("total"))) {
      continue;
    }

    // Try to parse as product row
    if (productHeaders.length > 0 && nonEmpty.length >= 2) {
      const cells: Record<string, string> = { Sekcja: currentSection };
      for (let col = 0; col < row.length; col++) {
        const header = productHeaders[col];
        if (!header) continue;
        const hNorm = normalize(header);
        // Skip Lp. column
        if (VEEDECK_HEADER_SIGNALS.has(hNorm)) continue;
        cells[header] = String(row[col] ?? "").trim();
      }
      rows.push({ cells });
    }
  }

  // Build final headers: Sekcja + product columns (minus Lp.)
  const finalHeaders = [
    "Sekcja",
    ...productHeaders.filter((h) => !VEEDECK_HEADER_SIGNALS.has(normalize(h))),
  ];

  const suggestedMappings = suggestMappings(finalHeaders);
  if (!suggestedMappings.section) suggestedMappings.section = "Sekcja";

  return {
    headers: finalHeaders,
    rows,
    suggestedListName,
    suggestedMappings,
    hasImages: false,
    imageCount: 0,
    format: "veedeck",
  };
}

// ---------------------------------------------------------------------------
// Embedded image extraction via JSZip
// ---------------------------------------------------------------------------

async function extractEmbeddedImages(file: File): Promise<Map<number, Blob>> {
  const JSZip = (await import("jszip")).default;
  const imageMap = new Map<number, Blob>();

  const zip = await JSZip.loadAsync(file);

  // Find the first drawing file
  const drawingFiles = zip.file(/^xl\/drawings\/drawing\d+\.xml$/);
  if (drawingFiles.length === 0) return imageMap;

  const drawingFile = drawingFiles[0];
  const drawingPath = drawingFile.name; // e.g. "xl/drawings/drawing1.xml"
  const drawingName = drawingPath.split("/").pop()!; // "drawing1.xml"
  const relsPath = `xl/drawings/_rels/${drawingName}.rels`;

  const relsFile = zip.file(relsPath);
  if (!relsFile) return imageMap;

  const [drawingXml, relsXml] = await Promise.all([
    drawingFile.async("string"),
    relsFile.async("string"),
  ]);

  // rId → media filename
  const rIdToFile = parseRels(relsXml);

  // rId → spreadsheet row index (0-based)
  const rIdToRow = parseDrawing(drawingXml);

  for (const [rId, rowIndex] of rIdToRow.entries()) {
    const filename = rIdToFile.get(rId);
    if (!filename) continue;

    const mediaFile = zip.file(`xl/media/${filename}`);
    if (!mediaFile) continue;

    const blob = await mediaFile.async("blob");
    imageMap.set(rowIndex, blob);
  }

  return imageMap;
}

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  // Match image relationships only
  const regex = /Id="([^"]+)"[^>]*Target="([^"]*\.(?:png|jpg|jpeg|gif|webp|bmp|tiff?|svg))"/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    const filename = m[2].split("/").pop();
    if (filename) map.set(m[1], filename);
  }
  return map;
}

function parseDrawing(xml: string): Map<string, number> {
  const map = new Map<string, number>();

  // Match each anchor block
  const anchorPattern = /<[^:>\s]+:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/[^:>\s]+:(?:twoCellAnchor|oneCellAnchor)>/g;
  let m: RegExpExecArray | null;

  while ((m = anchorPattern.exec(xml)) !== null) {
    const block = m[1];

    // Row index from <xdr:from>...<xdr:row>N</xdr:row>
    const fromMatch = /<[^:>\s]+:from>([\s\S]*?)<\/[^:>\s]+:from>/.exec(block);
    if (!fromMatch) continue;
    const rowMatch = /<[^:>\s]+:row>(\d+)<\/[^:>\s]+:row>/.exec(fromMatch[1]);
    if (!rowMatch) continue;
    const rowIndex = parseInt(rowMatch[1], 10);

    // r:embed from blip element
    const rIdMatch = /r:embed="([^"]+)"/.exec(block);
    if (!rIdMatch) continue;

    map.set(rIdMatch[1], rowIndex);
  }

  return map;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")        // remove extension
    .replace(/[_-]+/g, " ")          // underscores/dashes → spaces
    .replace(/\s+/g, " ")
    .trim();
}
