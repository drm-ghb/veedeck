"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, ChevronRight, ChevronDown, Search, AlertCircle, CheckCircle, Image, X, Check, Download } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { parseImportFile, type FieldMapping, type ParsedRow, type ParseResult } from "@/lib/list-import-parser";
import { useUploadThing } from "@/lib/uploadthing-client";

// ---------------------------------------------------------------------------
// MappingSelect — custom select using app's DropdownMenu
// ---------------------------------------------------------------------------

function MappingSelect({
  value,
  onChange,
  headers,
  isRequired = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  headers: string[];
  isRequired?: boolean;
}) {
  const isMapped = !!value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border rounded-lg bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
              isRequired && !isMapped
                ? "border-destructive/40 bg-destructive/5"
                : isMapped
                ? "border-green-400/60 bg-green-50/60 dark:bg-green-950/20"
                : "border-border hover:border-primary/30"
            )}
          />
        }
      >
        <span className={cn("truncate text-left flex-1 min-w-0", isMapped ? "text-foreground" : "text-muted-foreground")}>
          {value || "(nie importuj)"}
        </span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange(null)}>
          <span className="text-muted-foreground">(nie importuj)</span>
          {!isMapped && <Check size={13} className="ml-auto text-muted-foreground shrink-0" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {headers.map((h) => (
          <DropdownMenuItem key={h} onClick={() => onChange(h)}>
            <span className="truncate flex-1 min-w-0">{h}</span>
            {value === h && <Check size={13} className="ml-auto text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "upload" | "mapping" | "sections" | "client" | "importing";

interface DetectedSection {
  originalName: string;
  displayName: string;
  count: number;
}

interface ClientItem {
  id: string;
  name: string;
  projects: { id: string; title: string; slug: string | null }[];
}

const VEEDECK_FIELDS: Array<{ key: keyof FieldMapping; label: string; required?: boolean }> = [
  { key: "name", label: "Nazwa produktu", required: true },
  { key: "section", label: "Sekcja / Pokój" },
  { key: "manufacturer", label: "Producent / Marka" },
  { key: "color", label: "Kolor / Wykończenie" },
  { key: "dimensions", label: "Wymiary" },
  { key: "price", label: "Cena jednostkowa" },
  { key: "quantity", label: "Ilość" },
  { key: "unit", label: "Jednostka miary" },
  { key: "deliveryTime", label: "Czas dostawy" },
  { key: "catalogNumber", label: "Nr katalogowy / Symbol" },
  { key: "supplier", label: "Dostawca / Sklep" },
  { key: "category", label: "Kategoria" },
  { key: "url", label: "URL / Link do produktu" },
  { key: "description", label: "Opis" },
  { key: "note", label: "Notatka / Uwagi" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyMapping(
  rows: ParsedRow[],
  mapping: Partial<FieldMapping>
): { sections: Record<string, Array<Record<string, string | number | undefined>>>; imageBlobs: Map<number, Blob> } {
  const sections: Record<string, Array<Record<string, string | number | undefined>>> = {};
  const imageBlobs = new Map<number, Blob>();
  let globalIndex = 0;

  for (const row of rows) {
    // Mapped section column takes priority when it has a value.
    // inferredSection (from single-cell separator rows) is used as fallback
    // when the mapped column is empty or no column is mapped.
    const mappedSection = mapping.section ? row.cells[mapping.section] : "";
    const sectionName =
      mappedSection ||
      row.inferredSection ||
      "Produkty";
    if (!sections[sectionName]) sections[sectionName] = [];

    const productIndex = globalIndex++;

    const product: Record<string, string | number | undefined> = {};
    for (const { key } of VEEDECK_FIELDS) {
      const col = mapping[key];
      if (col && row.cells[col] !== undefined) {
        if (key === "quantity") {
          const n = parseFloat(row.cells[col].replace(",", "."));
          product[key] = isNaN(n) ? 1 : Math.max(1, Math.round(n));
        } else {
          product[key] = row.cells[col] || undefined;
        }
      }
    }

    if (row.imageBlob) {
      imageBlobs.set(productIndex, row.imageBlob);
    }

    sections[sectionName].push(product);
  }

  return { sections, imageBlobs };
}

function countMappedProducts(rows: ParsedRow[], mapping: Partial<FieldMapping>): number {
  if (!mapping.name) return 0;
  return rows.filter((r) => r.cells[mapping.name!]?.trim()).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ImportListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportListDialog({ open, onOpenChange }: ImportListDialogProps) {
  const router = useRouter();
  const { startUpload } = useUploadThing("listImportImageUploader");

  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Partial<FieldMapping>>({});
  const [listName, setListName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // Client selection
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  // Sections editing
  const [detectedSections, setDetectedSections] = useState<DetectedSection[]>([]);

  // Import progress
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("upload");
        setParseResult(null);
        setMapping({});
        setListName("");
        setParseError("");
        setSelectedClient(null);
        setClientSearch("");
        setDetectedSections([]);
        setImportProgress({ current: 0, total: 0, phase: "" });
      }, 300);
    }
  }, [open]);

  // Load clients when reaching client step
  useEffect(() => {
    if (step === "client" && clients.length === 0 && !loadingClients) {
      setLoadingClients(true);
      fetch("/api/clients")
        .then((r) => r.ok ? r.json() : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((data: any[]) => setClients(data.map((c) => ({ id: c.id, name: c.name, projects: c.projects ?? [] }))))
        .catch(() => {})
        .finally(() => setLoadingClients(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "csv"].includes(ext)) {
      setParseError("Obsługujemy tylko pliki .xlsx i .csv");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setParseError("Plik jest za duży — maksymalnie 20 MB");
      return;
    }

    setParseError("");
    setIsParsing(true);
    try {
      const result = await parseImportFile(file);
      if (result.rows.length === 0) {
        setParseError("W pliku nie znaleziono żadnych produktów");
        return;
      }
      setParseResult(result);
      setMapping(result.suggestedMappings);
      setListName(result.suggestedListName);
      setStep("mapping");
    } catch (e) {
      console.error(e);
      setParseError("Nie udało się odczytać pliku. Upewnij się, że to prawidłowy plik .xlsx lub .csv");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // ---------------------------------------------------------------------------
  // Mapping → Sections
  // ---------------------------------------------------------------------------

  function handleProceedToSections() {
    if (!parseResult || !mapping.name) return;
    const { sections } = applyMapping(parseResult.rows, mapping);
    const sectionList: DetectedSection[] = Object.entries(sections)
      .map(([name, products]) => ({
        originalName: name,
        displayName: name,
        count: products.filter((p) => (p.name as string)?.trim()).length,
      }))
      .filter((s) => s.count > 0);

    // Skip sections step if only one section — nothing to rename
    if (sectionList.length <= 1) {
      setDetectedSections(sectionList);
      setStep("client");
    } else {
      setDetectedSections(sectionList);
      setStep("sections");
    }
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  async function handleImport() {
    if (!parseResult || !mapping.name) return;

    setStep("importing");
    setImportProgress({ current: 0, total: 0, phase: "Przygotowuję dane..." });

    try {
      const { sections, imageBlobs } = applyMapping(parseResult.rows, mapping);

      // Apply section renames from the sections step
      const renameMap = Object.fromEntries(
        detectedSections.map((s) => [s.originalName, s.displayName.trim() || s.originalName])
      );

      // Build sections array
      const sectionsArr = Object.entries(sections).map(([name, products]) => ({
        name: renameMap[name] ?? name,
        products: products.filter((p) => (p.name as string)?.trim()),
      }));

      // Upload images if any
      const imageUrlMap = new Map<number, string>();

      if (imageBlobs.size > 0) {
        const imageEntries = Array.from(imageBlobs.entries());
        setImportProgress({ current: 0, total: imageEntries.length, phase: "Przesyłam zdjęcia..." });

        // Convert blobs to Files
        const imageFiles = imageEntries.map(([, blob], i) => {
          const ext = blob.type.split("/")[1] || "jpg";
          return new File([blob], `import-image-${i}.${ext}`, { type: blob.type || "image/jpeg" });
        });

        const uploaded = await startUpload(imageFiles);

        if (uploaded) {
          for (let i = 0; i < uploaded.length; i++) {
            const originalIndex = imageEntries[i][0];
            imageUrlMap.set(originalIndex, uploaded[i].url);
            setImportProgress({ current: i + 1, total: imageEntries.length, phase: "Przesyłam zdjęcia..." });
          }
        }
      }

      // Inject imageUrls into products
      if (imageUrlMap.size > 0) {
        let globalIdx = 0;
        for (const section of sectionsArr) {
          for (const product of section.products) {
            const url = imageUrlMap.get(globalIdx);
            if (url) product.imageUrl = url;
            globalIdx++;
          }
        }
      }

      setImportProgress({ current: 0, total: 0, phase: "Tworzę listę..." });

      // Determine projectId/clientId
      let projectId: string | null = null;
      let clientId: string | null = null;
      if (selectedClient) {
        if (selectedClient.projects.length > 0) {
          projectId = selectedClient.projects[0].id;
        } else {
          clientId = selectedClient.id;
        }
      }

      const res = await fetch("/api/lists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listName.trim(),
          projectId,
          clientId,
          sections: sectionsArr,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Błąd importu");
      }

      const { slug, listId } = await res.json();
      toast.success(`Lista zaimportowana — ${parseResult.rows.length} produktów`);
      onOpenChange(false);
      router.push(`/listy-zakupowe/${slug ?? listId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił błąd — spróbuj ponownie");
      setStep("client");
    }
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  async function downloadTemplate() {
    const XLSX = await import("xlsx");

    // Column names match FIELD_SYNONYMS exactly → auto-mapping works when re-imported
    const headers = [
      "Nazwa", "Sekcja", "Producent", "Kolor", "Wymiary",
      "Cena", "Ilość", "Jednostka", "Czas dostawy", "Nr kat.",
      "Dostawca", "Kategoria", "URL", "Opis", "Notatka",
    ];

    const examples = [
      [
        "Sofa modułowa Alba 3-osobowa", "Salon", "Sits", "Szary jasny, tkanina Poso", "280×90×85 cm",
        "4290", "1", "szt.", "4–6 tygodni", "ALB-3-POS-SJ",
        "Sits Warszawa", "Sofy", "https://sits.pl/sofa-alba", "Nogi metalowe, kolor czarny", "",
      ],
      [
        "Lampa podłogowa Arco", "Sypialnia", "Flos", "Biały, stal", "wys. 235 cm",
        "3800", "2", "szt.", "2–3 tygodnie", "FLS-ARC-WH",
        "Flos Polska", "Oświetlenie", "https://flos.com/arco", "", "Sprawdzić dostępność koloru",
      ],
      [
        "Dywan wełniany Beni Ourain", "Salon", "Ethnicraft", "Krem / beż", "200×300 cm",
        "2100", "1", "szt.", "3–5 tygodni", "ETH-DYW-200300",
        "Ethnicraft Polska", "Dywany", "", "", "",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);

    // Column widths
    ws["!cols"] = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...examples.map((r) => String(r[i] ?? "").length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 42) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista zakupowa");
    XLSX.writeFile(wb, "szablon-lista-zakupowa.xlsx");
  }

  const mappedCount = parseResult ? countMappedProducts(parseResult.rows, mapping) : 0;
  const canProceedMapping = !!mapping.name && mappedCount > 0 && listName.trim().length > 0;
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} />
            Importuj listę zakupową
          </DialogTitle>
        </DialogHeader>

        {/* ------------------------------------------------------------------ */}
        {/* STEP: UPLOAD                                                         */}
        {/* ------------------------------------------------------------------ */}
        {step === "upload" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Wgraj plik z listą zakupową z innego programu lub z wcześniejszego eksportu Veedeck.
              Obsługujemy formaty <strong>.xlsx</strong> i <strong>.csv</strong>. Jeśli plik zawiera zdjęcia wklejone w komórki, zostaną one automatycznie zaimportowane.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              {isParsing ? (
                <>
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-base text-muted-foreground">Analizuję plik...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload size={28} className="text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-base font-medium text-foreground">
                      Przeciągnij plik tutaj lub kliknij, żeby wybrać
                    </p>
                    <p className="text-sm text-muted-foreground">.xlsx lub .csv · maksymalnie 20 MB</p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={onFileInput}
            />

            {parseError && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {parseError}
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Download size={14} className="shrink-0" />
              <span>Nie masz jeszcze pliku?</span>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-primary font-medium hover:underline underline-offset-2"
              >
                Pobierz szablon .xlsx
              </button>
              <span>i uzupełnij według wzorca</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP: MAPPING                                                        */}
        {/* ------------------------------------------------------------------ */}
        {step === "mapping" && parseResult && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted">
              <CheckCircle size={18} className="text-green-600 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Znaleziono{" "}
                <strong className="text-foreground">{parseResult.rows.length} wierszy</strong>,{" "}
                <strong className="text-foreground">{parseResult.headers.length} kolumn</strong>
                {parseResult.format === "veedeck" && " · Format Veedeck"}
              </p>
              {parseResult.hasImages && (
                <div className="ml-auto flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-3 py-1.5 rounded-lg font-medium">
                  <Image size={14} />
                  {parseResult.imageCount} zdjęć znalezionych
                </div>
              )}
            </div>

            {/* List name */}
            <div className="space-y-2">
              <Label htmlFor="import-list-name" className="text-sm font-semibold">
                Nazwa listy <span className="text-destructive">*</span>
              </Label>
              <Input
                id="import-list-name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="np. Lista do salonu Kowalski"
                className="text-base h-10"
              />
            </div>

            {/* Field mapping */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Dopasowanie kolumn</Label>
                <p className="text-xs text-muted-foreground">
                  Prawa kolumna = kolumna z Twojego pliku
                </p>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-2 bg-muted px-5 py-3 text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wide">
                  <span>Pole w Veedeck</span>
                  <span>Kolumna z pliku</span>
                </div>

                <div className="divide-y divide-border">
                  {VEEDECK_FIELDS.map(({ key, label, required }) => (
                    <div
                      key={key}
                      className="grid grid-cols-2 items-center px-5 py-3.5 gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        {required && (
                          <span className="text-[10px] font-bold text-white bg-destructive px-1.5 py-0.5 rounded uppercase tracking-wider">
                            wymagane
                          </span>
                        )}
                      </div>

                      <MappingSelect
                        value={mapping[key] ?? null}
                        onChange={(v) => setMapping((prev) => ({ ...prev, [key]: v }))}
                        headers={parseResult.headers}
                        isRequired={required}
                      />
                    </div>
                  ))}

                  {/* Images — read-only row */}
                  <div className="grid grid-cols-2 items-center px-5 py-3.5 gap-4 bg-muted/20">
                    <span className="text-sm font-medium text-foreground">Zdjęcie produktu</span>
                    {parseResult.hasImages ? (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                        <CheckCircle size={15} />
                        {parseResult.imageCount} zdjęć — wykryte automatycznie
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Brak zdjęć w pliku</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                {mapping.name ? (
                  <>
                    Gotowych do importu:{" "}
                    <strong className="text-foreground text-base">{mappedCount} produktów</strong>
                  </>
                ) : (
                  <span className="text-destructive text-sm">
                    ← Wybierz kolumnę &quot;Nazwa produktu&quot;, żeby kontynuować
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setStep("upload")}>
                  Wróć
                </Button>
                <Button size="lg" onClick={handleProceedToSections} disabled={!canProceedMapping}>
                  Dalej
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP: SECTIONS                                                       */}
        {/* ------------------------------------------------------------------ */}
        {step === "sections" && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Nazwy sekcji / pokoi</p>
              <p className="text-sm text-muted-foreground">
                Wykryto {detectedSections.length} sekcji. Zmień nazwy jeśli plik zapisał je niepoprawnie (np. jako nazwę produktu zamiast pokoju).
              </p>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] bg-muted px-5 py-3 text-xs font-semibold text-muted-foreground border-b border-border uppercase tracking-wide gap-4">
                <span>Wykryta nazwa</span>
                <span>Nazwa po imporcie</span>
                <span>Prod.</span>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {detectedSections.map((section, i) => (
                  <div key={section.originalName} className="grid grid-cols-[1fr_1fr_auto] items-center px-5 py-3 gap-4 hover:bg-muted/20 transition-colors">
                    <p className="text-sm text-muted-foreground truncate" title={section.originalName}>
                      {section.originalName}
                    </p>
                    <Input
                      value={section.displayName}
                      onChange={(e) => {
                        const updated = [...detectedSections];
                        updated[i] = { ...updated[i], displayName: e.target.value };
                        setDetectedSections(updated);
                      }}
                      className="h-9 text-sm"
                    />
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right shrink-0">
                      {section.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="lg" onClick={() => setStep("mapping")}>
                Wróć
              </Button>
              <Button size="lg" onClick={() => setStep("client")}>
                Dalej
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP: CLIENT                                                         */}
        {/* ------------------------------------------------------------------ */}
        {step === "client" && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Przypisz do klienta</p>
              <p className="text-sm text-muted-foreground">
                Opcjonalne — możesz pominąć i przypisać klienta później z poziomu listy.
              </p>
            </div>

            {selectedClient ? (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-muted border border-border">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{selectedClient.name}</p>
                  {selectedClient.projects[0] && (
                    <p className="text-sm text-muted-foreground truncate">{selectedClient.projects[0].title}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-muted-foreground hover:text-foreground ml-3 shrink-0 p-1 rounded hover:bg-muted transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Szukaj klienta..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10 h-10 text-sm"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                  {loadingClients ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Ładowanie...</p>
                  ) : filteredClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {clientSearch ? "Brak wyników" : "Brak klientów"}
                    </p>
                  ) : (
                    filteredClients.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClient(c)}
                        className={`w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/50 transition-colors ${
                          i !== filteredClients.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                          {c.projects[0] && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{c.projects[0].title}</p>
                          )}
                        </div>
                        <ChevronRight size={15} className="text-muted-foreground ml-3 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Summary before import */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Podsumowanie importu</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nazwa listy</span>
                <span className="text-sm font-semibold truncate max-w-[250px]">{listName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Produktów</span>
                <span className="text-sm font-semibold">{mappedCount}</span>
              </div>
              {parseResult?.hasImages && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Zdjęcia</span>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {parseResult.imageCount} szt.
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Klient</span>
                <span className="text-sm font-semibold">{selectedClient?.name ?? "—"}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-between pt-1">
              <Button variant="outline" size="lg" onClick={() => setStep(detectedSections.length > 1 ? "sections" : "mapping")}>
                Wróć
              </Button>
              <div className="flex gap-3">
                {!selectedClient && (
                  <Button variant="ghost" size="lg" onClick={handleImport}>
                    Pomiń i importuj
                  </Button>
                )}
                <Button size="lg" onClick={handleImport}>
                  {parseResult?.hasImages
                    ? `Importuj ${mappedCount} produktów + ${parseResult.imageCount} zdjęć`
                    : `Importuj ${mappedCount} produktów`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP: IMPORTING (loading)                                            */}
        {/* ------------------------------------------------------------------ */}
        {step === "importing" && (
          <div className="py-16 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-foreground">{importProgress.phase}</p>
              {importProgress.total > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {importProgress.current} / {importProgress.total} zdjęć
                  </p>
                  <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mt-3 mx-auto">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Nie zamykaj tego okna — trwa import</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
