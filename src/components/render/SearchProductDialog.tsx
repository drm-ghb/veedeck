"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, Package, SlidersHorizontal, ChevronDown, ChevronRight, ChevronLeft, Loader2, LocalMall } from "@/components/ui/icons";
import { useProductSearch } from "@/components/produkty/useProductSearch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  url: string | null;
  price: string | null;
  manufacturer: string | null;
  sectionIds?: string[];
}

interface Section {
  id: string;
  name: string;
}

interface ShoppingList {
  id: string;
  name: string;
  projectTitle: string | null;
  projectId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  projectId?: string;
  renderId?: string;
}

interface SavedPickerState {
  tab: Tab;
  listId: string | null;
  sectionId: string | null;
}

type Tab = "list" | "recent" | "all";

function ProductList({ products, onSelect }: { products: Product[]; onSelect: (p: Product) => void }) {
  return (
    <div className="divide-y divide-border">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
        >
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0 border border-border"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-muted-foreground opacity-40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
            {p.manufacturer && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.manufacturer}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function SearchProductDialog({ open, onClose, onSelect, projectId, renderId }: Props) {
  const search = useProductSearch();

  // Per-render state memory: remembers tab/list/section as long as same render is active
  const activeRenderIdRef = useRef<string | null>(null);
  const savedStateRef = useRef<SavedPickerState | null>(null);
  const pendingSectionRestore = useRef<string | null>(null);
  const selectedListIdRef = useRef<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    categories: true,
    manufacturers: true,
    colors: true,
  });
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({
    categories: "",
    manufacturers: "",
    colors: "",
  });
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [localQuery, setLocalQuery] = useState("");
  const [listProducts, setListProducts] = useState<Product[]>([]);
  const [listSections, setListSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  useEffect(() => { selectedListIdRef.current = selectedListId; }, [selectedListId]);
  const [allLists, setAllLists] = useState<ShoppingList[]>([]);
  const sectionScrollRef = useRef<HTMLDivElement>(null);
  const [sectionScrolled, setSectionScrolled] = useState(false);

  function handleSectionScroll() {
    const el = sectionScrollRef.current;
    if (!el) return;
    setSectionScrolled(el.scrollLeft > 2);
  }

  useEffect(() => { setSectionScrolled(false); }, [listSections]);

  useEffect(() => {
    const el = sectionScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already horizontal scroll
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      el.scrollLeft = startScrollLeft - (e.pageX - startX);
    };
    const onMouseUp = () => {
      isDragging = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [listSections, listLoading]);

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectDropdownPos, setProjectDropdownPos] = useState({ top: 0, left: 0 });
  const [projectSearch, setProjectSearch] = useState("");

  // On open: restore state if same render, otherwise full reset
  useEffect(() => {
    if (!open) return;

    const sameRender = renderId != null && renderId === activeRenderIdRef.current;

    if (sameRender && savedStateRef.current) {
      const saved = savedStateRef.current;
      setActiveTab(saved.tab);
      setSelectedListId(saved.listId);
      pendingSectionRestore.current = saved.sectionId;
      setProjectDropdownOpen(false);
      setProjectSearch("");
    } else {
      setActiveTab("all");
      setLocalQuery("");
      setSelectedListId(null);
      setAllLists([]);
      setProjectDropdownOpen(false);
      setProjectSearch("");
      savedStateRef.current = null;
      pendingSectionRestore.current = null;
      if (renderId != null) activeRenderIdRef.current = renderId;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset local query on tab change
  useEffect(() => {
    setLocalQuery("");
  }, [activeTab]);

  // Fetch all shopping lists when list tab is opened
  useEffect(() => {
    if (!open || activeTab !== "list") return;
    fetch("/api/lists")
      .then((r) => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data) => {
        const lists: ShoppingList[] = Array.isArray(data)
          ? data
              .filter((l: any) => !l.archived)
              .map((l: any) => ({ id: l.id, name: l.name, projectTitle: l.project?.title ?? null, projectId: l.project?.id ?? null }))
          : [];
        setAllLists(lists);
        // Auto-select the first list linked to the current project — only when no list is already selected (fresh open, not restore)
        if (projectId && lists.length > 0 && selectedListIdRef.current === null) {
          const match = (data as any[]).find((l: any) => !l.archived && l.project?.id === projectId);
          setSelectedListId(match ? match.id : null);
        }
      })
      .catch(() => setAllLists([]));
  }, [open, activeTab, projectId]);

  // Fetch products whenever selected list changes
  useEffect(() => {
    if (!open || !selectedListId || activeTab !== "list") return;
    setListLoading(true);
    setSelectedSectionId(null);
    fetch(`/api/list-products?listId=${selectedListId}`)
      .then((r) => r.json())
      .then((data) => { setListProducts(data.products ?? []); setListSections(data.sections ?? []); })
      .catch(() => { setListProducts([]); setListSections([]); })
      .finally(() => {
        setListLoading(false);
        if (pendingSectionRestore.current) {
          setSelectedSectionId(pendingSectionRestore.current);
          pendingSectionRestore.current = null;
        }
      });
  }, [open, selectedListId, activeTab]);

  // Fetch recent pin products for this project
  useEffect(() => {
    if (!open || activeTab !== "recent" || !projectId) return;
    setRecentLoading(true);
    fetch(`/api/projects/${projectId}/recent-pin-products`)
      .then((r) => r.json())
      .then((data) => setRecentProducts(data.products ?? []))
      .catch(() => setRecentProducts([]))
      .finally(() => setRecentLoading(false));
  }, [open, activeTab, projectId]);

  const toggleSection = (key: string) =>
    setExpandedFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const getActiveCount = (key: keyof typeof search.filters) =>
    search.filters[key].length;

  const totalActiveFilters =
    getActiveCount("categories") + getActiveCount("manufacturers") + getActiveCount("colors");

  function handleClose() {
    if (renderId != null && renderId === activeRenderIdRef.current) {
      savedStateRef.current = { tab: activeTab, listId: selectedListId, sectionId: selectedSectionId };
    }
    search.resetFilters();
    setFilterSearch({ categories: "", manufacturers: "", colors: "" });
    setLocalQuery("");
    onClose();
  }

  function handleSelect(product: Product) {
    onSelect(product);
    handleClose();
  }

  if (!open) return null;

  const tabs: { key: Tab; label: string }[] = projectId
    ? [
        { key: "all", label: "Wszystkie produkty" },
        { key: "list", label: "Produkty z listy" },
        { key: "recent", label: "Ostatnio dodane" },
      ]
    : [
        { key: "all", label: "Wszystkie produkty" },
      ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative w-full sm:max-w-3xl bg-background rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden h-full sm:h-[85vh]">
        {/* Header — tabs */}
        <div className="flex items-center gap-2 px-4 border-b border-border flex-shrink-0">
          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Tab: Produkty z listy */}
          {activeTab === "list" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <Input
                  autoFocus
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="Szukaj produktu..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-sm bg-transparent"
                />
                {localQuery && (
                  <button type="button" onClick={() => setLocalQuery("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Project selector + section filters — always visible in list tab */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 min-w-0">
                {/* Project selector pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setProjectDropdownPos({ top: r.bottom + 4, left: r.left });
                    setProjectSearch("");
                    setProjectDropdownOpen((v) => !v);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted hover:bg-muted/70 transition-colors whitespace-nowrap flex-shrink-0 max-w-[160px]"
                >
                  <LocalMall size={11} className="text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {allLists.find((l) => l.id === selectedListId)?.name ?? "Wybierz listę"}
                  </span>
                  <ChevronDown size={11} className="text-muted-foreground shrink-0" />
                </button>

                {/* Separator + section filters */}
                {!listLoading && listSections.length > 1 && (
                  <>
                    <div className="w-px h-4 bg-border flex-shrink-0" />
                    {sectionScrolled && (
                      <button
                        type="button"
                        onClick={() => { sectionScrollRef.current?.scrollBy({ left: -150, behavior: "smooth" }); }}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    <div className="flex items-center flex-1 min-w-0" style={{ overflow: 'hidden' }}>
                    <div ref={sectionScrollRef} onScroll={handleSectionScroll} className="no-scrollbar cursor-grab" style={{ overflowX: 'scroll', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', width: 'max-content' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSectionId(null)}
                          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                            selectedSectionId === null
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Wszystkie
                        </button>
                        {listSections.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSectionId(s.id === selectedSectionId ? null : s.id)}
                            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                              selectedSectionId === s.id
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { sectionScrollRef.current?.scrollBy({ left: 150, behavior: "smooth" }); }}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                    </div>
                  </>
                )}
              </div>

              {/* Project dropdown portal */}
              {projectDropdownOpen && createPortal(
                <>
                  <div className="fixed inset-0 z-[250]" onClick={() => setProjectDropdownOpen(false)} />
                  <div
                    className="fixed z-[251] bg-popover border border-border rounded-lg shadow-lg w-64 overflow-hidden"
                    style={{ top: projectDropdownPos.top, left: projectDropdownPos.left }}
                  >
                    <div className="p-2 border-b border-border">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted">
                        <Search size={13} className="text-muted-foreground shrink-0" />
                        <input
                          autoFocus
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Szukaj projektu..."
                          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                      {allLists
                        .filter((l) => {
                          const q = projectSearch.toLowerCase();
                          return l.name.toLowerCase().includes(q) || (l.projectTitle ?? "").toLowerCase().includes(q);
                        })
                        .sort((a, b) => {
                          const aMatch = a.projectId === projectId ? -1 : 0;
                          const bMatch = b.projectId === projectId ? -1 : 0;
                          return aMatch - bMatch;
                        })
                        .map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => { setSelectedListId(l.id); setProjectDropdownOpen(false); }}
                            className={`w-full flex flex-col items-start px-3 py-2 text-left transition-colors hover:bg-muted ${
                              l.id === selectedListId ? "bg-muted/60" : ""
                            }`}
                          >
                            <span className={`text-xs font-medium truncate w-full ${l.id === selectedListId ? "text-primary" : "text-foreground"}`}>
                              {l.name}
                            </span>
                            {l.projectTitle && (
                              <span className="text-[10px] text-muted-foreground truncate w-full">{l.projectTitle}</span>
                            )}
                          </button>
                        ))}
                      {allLists.filter((l) => {
                        const q = projectSearch.toLowerCase();
                        return l.name.toLowerCase().includes(q) || (l.projectTitle ?? "").toLowerCase().includes(q);
                      }).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Brak wyników</p>
                      )}
                    </div>
                  </div>
                </>,
                document.body
              )}
              <div className="flex-1 overflow-y-auto">
                {listLoading && (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {!listLoading && listProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground px-6 text-center">
                    <Package size={28} className="opacity-30" />
                    <p className="text-sm">
                      {selectedListId
                        ? `Lista „${allLists.find((l) => l.id === selectedListId)?.name ?? ""}" nie ma produktów`
                        : "Wybierz listę zakupową z menu powyżej"}
                    </p>
                    <Link href="/listy" onClick={handleClose} className="text-xs text-primary hover:underline">
                      Przejdź do modułu Listy →
                    </Link>
                  </div>
                )}
                {!listLoading && listProducts.length > 0 && (() => {
                  const filtered = listProducts.filter((p) => {
                    const matchesSection = selectedSectionId === null || (p.sectionIds ?? []).includes(selectedSectionId);
                    const matchesQuery =
                      p.name.toLowerCase().includes(localQuery.toLowerCase()) ||
                      (p.manufacturer ?? "").toLowerCase().includes(localQuery.toLowerCase());
                    return matchesSection && matchesQuery;
                  });
                  return filtered.length > 0 ? (
                    <ProductList products={filtered} onSelect={handleSelect} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Package size={28} className="opacity-30" />
                      <p className="text-sm">Brak wyników</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab: Ostatnio dodane */}
          {activeTab === "recent" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <Input
                  autoFocus
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="Szukaj produktu..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-sm bg-transparent"
                />
                {localQuery && (
                  <button type="button" onClick={() => setLocalQuery("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {recentLoading && (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {!recentLoading && recentProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Package size={28} className="opacity-30" />
                    <p className="text-sm">Brak przypiętych produktów w tym projekcie</p>
                  </div>
                )}
                {!recentLoading && recentProducts.length > 0 && (() => {
                  const filtered = recentProducts.filter((p) =>
                    p.name.toLowerCase().includes(localQuery.toLowerCase()) ||
                    (p.manufacturer ?? "").toLowerCase().includes(localQuery.toLowerCase())
                  );
                  return filtered.length > 0 ? (
                    <ProductList products={filtered} onSelect={handleSelect} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Package size={28} className="opacity-30" />
                      <p className="text-sm">Brak wyników</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab: Wszystkie produkty */}
          {activeTab === "all" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <Input
                  autoFocus
                  value={search.query}
                  onChange={(e) => search.handleQueryChange(e.target.value)}
                  placeholder="Szukaj produktu..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-sm bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  title="Filtry zaawansowane"
                  className={`relative flex-shrink-0 transition-colors ${
                    showFilters || totalActiveFilters > 0
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal size={16} />
                  {totalActiveFilters > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[9px] font-bold flex items-center justify-center">
                      {totalActiveFilters}
                    </span>
                  )}
                </button>
              </div>

              {/* Results area */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Left sidebar — filters */}
                {showFilters && search.availableFilters && (
                  <div className="w-56 border-r border-border overflow-y-auto flex-shrink-0">
                    <div className="p-4 space-y-4">
                      {/* Kategorie */}
                      {search.availableFilters.categories.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSection("categories")}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Kategorie</span>
                              {getActiveCount("categories") > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {getActiveCount("categories")}
                                </Badge>
                              )}
                            </div>
                            {expandedFilters.categories ? (
                              <ChevronDown size={14} className="text-muted-foreground" />
                            ) : (
                              <ChevronRight size={14} className="text-muted-foreground" />
                            )}
                          </button>
                          {expandedFilters.categories && (
                            <div className="space-y-2 ml-1">
                              {search.availableFilters.categories.length > 5 && (
                                <Input
                                  placeholder="Szukaj..."
                                  value={filterSearch.categories}
                                  onChange={(e) =>
                                    setFilterSearch((p) => ({ ...p, categories: e.target.value }))
                                  }
                                  className="h-7 text-xs"
                                />
                              )}
                              {search.availableFilters.categories
                                .filter((v) =>
                                  v.toLowerCase().includes(filterSearch.categories.toLowerCase())
                                )
                                .map((v) => (
                                  <div key={v} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`cat-${v}`}
                                      checked={search.filters.categories.includes(v)}
                                      onCheckedChange={() =>
                                        search.handleFilterChange("categories", v)
                                      }
                                    />
                                    <label
                                      htmlFor={`cat-${v}`}
                                      className="text-sm cursor-pointer flex-1 truncate"
                                    >
                                      {v}
                                    </label>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Producenci */}
                      {search.availableFilters.manufacturers.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSection("manufacturers")}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Producenci</span>
                              {getActiveCount("manufacturers") > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {getActiveCount("manufacturers")}
                                </Badge>
                              )}
                            </div>
                            {expandedFilters.manufacturers ? (
                              <ChevronDown size={14} className="text-muted-foreground" />
                            ) : (
                              <ChevronRight size={14} className="text-muted-foreground" />
                            )}
                          </button>
                          {expandedFilters.manufacturers && (
                            <div className="space-y-2 ml-1">
                              {search.availableFilters.manufacturers.length > 5 && (
                                <Input
                                  placeholder="Szukaj..."
                                  value={filterSearch.manufacturers}
                                  onChange={(e) =>
                                    setFilterSearch((p) => ({ ...p, manufacturers: e.target.value }))
                                  }
                                  className="h-7 text-xs"
                                />
                              )}
                              <div className="max-h-40 overflow-y-auto space-y-2">
                                {search.availableFilters.manufacturers
                                  .filter((v) =>
                                    v.toLowerCase().includes(filterSearch.manufacturers.toLowerCase())
                                  )
                                  .map((v) => (
                                    <div key={v} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`mfr-${v}`}
                                        checked={search.filters.manufacturers.includes(v)}
                                        onCheckedChange={() =>
                                          search.handleFilterChange("manufacturers", v)
                                        }
                                      />
                                      <label
                                        htmlFor={`mfr-${v}`}
                                        className="text-sm cursor-pointer flex-1 truncate"
                                      >
                                        {v}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kolory */}
                      {search.availableFilters.colors.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleSection("colors")}
                            className="flex items-center justify-between w-full mb-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Kolory</span>
                              {getActiveCount("colors") > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {getActiveCount("colors")}
                                </Badge>
                              )}
                            </div>
                            {expandedFilters.colors ? (
                              <ChevronDown size={14} className="text-muted-foreground" />
                            ) : (
                              <ChevronRight size={14} className="text-muted-foreground" />
                            )}
                          </button>
                          {expandedFilters.colors && (
                            <div className="space-y-2 ml-1">
                              {search.availableFilters.colors.length > 5 && (
                                <Input
                                  placeholder="Szukaj..."
                                  value={filterSearch.colors}
                                  onChange={(e) =>
                                    setFilterSearch((p) => ({ ...p, colors: e.target.value }))
                                  }
                                  className="h-7 text-xs"
                                />
                              )}
                              <div className="max-h-40 overflow-y-auto space-y-2">
                                {search.availableFilters.colors
                                  .filter((v) =>
                                    v.toLowerCase().includes(filterSearch.colors.toLowerCase())
                                  )
                                  .map((v) => (
                                    <div key={v} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`color-${v}`}
                                        checked={search.filters.colors.includes(v)}
                                        onCheckedChange={() =>
                                          search.handleFilterChange("colors", v)
                                        }
                                      />
                                      <label
                                        htmlFor={`color-${v}`}
                                        className="text-sm cursor-pointer flex-1 truncate"
                                      >
                                        {v}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {totalActiveFilters > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            search.resetFilters();
                            setFilterSearch({ categories: "", manufacturers: "", colors: "" });
                          }}
                          className="w-full"
                        >
                          Wyczyść filtry
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Right panel — results */}
                <div className="flex-1 overflow-y-auto min-w-0">
                  {search.loading && (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!search.loading && search.products.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Package size={28} className="opacity-30" />
                      <p className="text-sm">
                        {search.query || totalActiveFilters > 0
                          ? "Brak wyników"
                          : "Zacznij wpisywać nazwę produktu"}
                      </p>
                    </div>
                  )}
                  {!search.loading && search.products.length > 0 && (
                    <ProductList products={search.products as Product[]} onSelect={handleSelect} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
