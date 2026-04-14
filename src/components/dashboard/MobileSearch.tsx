"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, Briefcase, DoorOpen, Image as LucideImage, ShoppingCart, User, Package } from "lucide-react";
import { useT } from "@/lib/i18n";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

interface SearchResults {
  projects: SearchResult[];
  rooms: SearchResult[];
  renders: SearchResult[];
  lists: SearchResult[];
  clients: SearchResult[];
  products: SearchResult[];
}

export default function MobileSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const CATEGORIES: { key: keyof SearchResults; label: string; icon: React.ReactNode }[] = [
    { key: "projects", label: t.dashboard.searchProjects, icon: <Briefcase size={13} /> },
    { key: "rooms", label: t.dashboard.searchRooms, icon: <DoorOpen size={13} /> },
    { key: "renders", label: t.dashboard.searchRenders, icon: <LucideImage size={13} /> },
    { key: "lists", label: t.dashboard.searchLists, icon: <ShoppingCart size={13} /> },
    { key: "clients", label: t.dashboard.searchClients, icon: <User size={13} /> },
    { key: "products", label: t.dashboard.searchProducts, icon: <Package size={13} /> },
  ];

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults((await res.json()).results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchResults]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { close(); }, [pathname]);

  function close() { setOpen(false); setQuery(""); setResults(null); }

  function handleSelect(href: string) {
    close();
    if (href.includes("#")) window.location.href = href;
    else router.push(href);
  }

  const hasResults = results && CATEGORIES.some((c) => results[c.key].length > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-muted transition-colors"
        aria-label="Szukaj"
      >
        <Search size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              placeholder={t.dashboard.search}
              className="flex-1 text-base bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={close}
              className="p-1.5 rounded-md text-gray-500 hover:bg-muted transition-colors shrink-0"
              aria-label="Zamknij"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="px-4 py-4 text-sm text-muted-foreground">{t.dashboard.searching}</div>
            )}
            {!loading && query.length >= 2 && !hasResults && (
              <div className="px-4 py-4 text-sm text-muted-foreground">{t.dashboard.noResultsFor} „{query}"</div>
            )}
            {!loading && hasResults && CATEGORIES.map((cat) => {
              const items = results![cat.key];
              if (items.length === 0) return null;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-1.5 px-4 pt-4 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {cat.icon}
                    {cat.label}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted" />
                      )}
                      <span className="font-medium truncate flex-1">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground shrink-0">{item.subtitle}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            {!loading && query.length < 2 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Wpisz co najmniej 2 znaki, aby wyszukać
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
