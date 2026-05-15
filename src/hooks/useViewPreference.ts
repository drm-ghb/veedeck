"use client";

import { useState, useEffect, useCallback } from "react";

// Module-level cache to avoid multiple fetches per page load
let cache: Record<string, string> | null = null;
let cachePromise: Promise<Record<string, string>> | null = null;

function fetchPreferences(): Promise<Record<string, string>> {
  if (cache !== null) return Promise.resolve(cache);
  if (cachePromise) return cachePromise;
  cachePromise = fetch("/api/user/preferences")
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      cache = data;
      cachePromise = null;
      return data;
    })
    .catch(() => {
      cachePromise = null;
      return {};
    });
  return cachePromise;
}

export function useViewPreference(
  key: string,
  defaultValue: "grid" | "list"
): ["grid" | "list", (v: "grid" | "list") => void] {
  const localKey = `view-pref-${key}`;

  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return defaultValue;
    const saved = localStorage.getItem(localKey);
    return saved === "grid" || saved === "list" ? saved : defaultValue;
  });

  // Sync from server on mount (overwrites localStorage if server has a different value)
  useEffect(() => {
    fetchPreferences().then((prefs) => {
      const serverVal = prefs[key];
      if (serverVal === "grid" || serverVal === "list") {
        localStorage.setItem(localKey, serverVal);
        setView(serverVal);
      }
    });
  }, [key, localKey]);

  const updateView = useCallback(
    (newView: "grid" | "list") => {
      setView(newView);
      localStorage.setItem(localKey, newView);
      // Update cache optimistically
      if (cache) cache[key] = newView;
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newView }),
      }).catch(() => {});
    },
    [key, localKey]
  );

  return [view, updateView];
}

export function useGridCols(key: string): [3 | 4 | 5, (n: 3 | 4 | 5) => void] {
  const localKey = `grid-cols-${key}`;
  const [cols, setCols] = useState<3 | 4 | 5>(() => {
    if (typeof window === "undefined") return 3;
    const saved = parseInt(localStorage.getItem(localKey) ?? "3");
    return [3, 4, 5].includes(saved) ? (saved as 3 | 4 | 5) : 3;
  });
  const update = useCallback(
    (n: 3 | 4 | 5) => {
      setCols(n);
      localStorage.setItem(localKey, String(n));
    },
    [localKey]
  );
  return [cols, update];
}
