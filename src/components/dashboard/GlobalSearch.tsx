"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, DoorOpen, Image, ScrollText, User, Package } from "lucide-react";
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

export default function GlobalSearch() {
  const t = useT();
  const router = useRouter();

  const CATEGORIES: { key: keyof SearchResults; label: string; icon: React.ReactNode }[] = [
    { key: "projects", label: t.dashboard.searchProjects, icon: <Users size={13} /> },
    { key: "rooms", label: t.dashboard.searchRooms, icon: <DoorOpen size={13} /> },
    { key: "renders", label: t.dashboard.searchRenders, icon: <Image size={13} /> },
    { key: "lists", label: t.dashboard.searchLists, icon: <ScrollText size={13} /> },
    { key: "clients", label: t.dashboard.searchClients, icon: <User size={13} /> },
    { key: "products", label: t.dashboard.searchProducts, icon: <Package size={13} /> },
  ];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    if (href.includes("#")) {
      window.location.href = href;
    } else {
      router.push(href);
    }
  }

  const hasResults = results && CATEGORIES.some((c) => results[c.key].length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results && query.length >= 2) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={t.dashboard.search}
        className="w-full pl-8 pr-4 py-1.5 text-sm bg-background rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
      />

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t.dashboard.searching}</div>
          )}
          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-muted-foreground">{t.dashboard.noResultsFor} „{query}"</div>
          )}
          {!loading && hasResults && CATEGORIES.map((cat) => {
            const items = results![cat.key];
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {cat.icon}
                  {cat.label}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.href)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.title} className="w-8 h-8 rounded object-cover shrink-0 bg-muted" />
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
        </div>
      )}
    </div>
  );
}
