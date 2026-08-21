/**
 * Regression test for SheetJS <si/> self-closing tag bug.
 *
 * SheetJS ^0.18.5 skips self-closing <si/> entries in xl/sharedStrings.xml,
 * causing every subsequent shared-string index to be off by 1. The fix in
 * sanitizeXlsxSharedStrings() replaces <si/> with explicit empty entries
 * before handing the buffer to XLSX.read().
 */

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseImportFile } from "@/lib/list-import-parser";

/**
 * Build a minimal valid .xlsx buffer whose sharedStrings.xml contains a
 * self-closing <si/> at index 0.
 *
 * sharedStrings layout (5 entries):
 *   0 → <si/>          ← the bug trigger
 *   1 → "Nazwa"        ← header col A
 *   2 → "Sekcja"       ← header col B
 *   3 → "Produkt A"    ← data col A
 *   4 → "Salon"        ← data col B
 *
 * The worksheet references indices 1,2 in row 1 (headers) and 3,4 in row 2
 * (data). Without the fix, indices are off by 1, so headers would read
 * ["Sekcja", "Produkt A"] instead of ["Nazwa", "Sekcja"].
 */
async function buildBuggyXlsx(): Promise<ArrayBuffer> {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
  );

  // sharedStrings with the bug: index 0 is a self-closing <si/>
  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5">
  <si/>
  <si><t>Nazwa</t></si>
  <si><t>Sekcja</t></si>
  <si><t>Produkt A</t></si>
  <si><t>Salon</t></si>
</sst>`,
  );

  // Row 1: headers at shared-string indices 1 ("Nazwa") and 2 ("Sekcja")
  // Row 2: data at shared-string indices 3 ("Produkt A") and 4 ("Salon")
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>1</v></c>
      <c r="B1" t="s"><v>2</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>3</v></c>
      <c r="B2" t="s"><v>4</v></c>
    </row>
  </sheetData>
</worksheet>`,
  );

  return zip.generateAsync({ type: "arraybuffer" });
}

describe("list-import-parser — sharedStrings <si/> sanitization", () => {
  it("parses correct headers when sharedStrings.xml has a self-closing <si/> at index 0", async () => {
    const buffer = await buildBuggyXlsx();

    // Mock File: only needs .name and .arrayBuffer() for parseImportFile
    const file = {
      name: "test.xlsx",
      arrayBuffer: async () => buffer,
    } as unknown as File;

    const result = await parseImportFile(file);

    // Bug: without the fix these would be ["Sekcja", "Produkt A"] (shifted by 1)
    expect(result.headers).toEqual(["Nazwa", "Sekcja"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cells["Nazwa"]).toBe("Produkt A");
    expect(result.rows[0].cells["Sekcja"]).toBe("Salon");
  });

  it("leaves a clean xlsx (no <si/>) unchanged", async () => {
    const zip = new JSZip();

    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    );
    zip.file(
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
    );
    // Clean sharedStrings — no self-closing tags
    zip.file(
      "xl/sharedStrings.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" uniqueCount="2">
  <si><t>Nazwa</t></si>
  <si><t>Produkt B</t></si>
</sst>`,
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
    <row r="2"><c r="A2" t="s"><v>1</v></c></row>
  </sheetData>
</worksheet>`,
    );

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const file = {
      name: "clean.xlsx",
      arrayBuffer: async () => buffer,
    } as unknown as File;

    const result = await parseImportFile(file);

    expect(result.headers).toEqual(["Nazwa"]);
    expect(result.rows[0].cells["Nazwa"]).toBe("Produkt B");
  });
});
