import { useState, useCallback, useEffect } from "react";
import { debounce } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  color?: string | null;
  price?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  supplier?: string | null;
  catalogNumber?: string | null;
}


interface SearchFilters {
  categories: string[];
  manufacturers: string[];
  colors: string[];
}

interface AvailableFilters {
  categories: string[];
  manufacturers: string[];
  colors: string[];
}

interface UseProductSearchReturn {
  query: string;
  filters: SearchFilters;
  products: Product[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  availableFilters: AvailableFilters | null;
  handleQueryChange: (query: string) => void;
  handleFilterChange: (filterType: keyof SearchFilters, value: string) => void;
  resetFilters: () => void;
}

export function useProductSearch(): UseProductSearchReturn {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    manufacturers: [],
    colors: [],
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);

  // Fetch available filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch("/api/products?action=filters");
        if (!response.ok) throw new Error("Failed to fetch filters");
        const data = await response.json();
        setAvailableFilters(data);
      } catch (err) {
        console.error("Error fetching filters:", err);
      }
    };

    fetchFilters();
  }, []);

  // Perform search
  const performSearch = useCallback(async (q: string, f: SearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("action", "search");
      if (q) params.append("query", q);
      f.categories.forEach((c) => params.append("categories[]", c));
      f.manufacturers.forEach((m) => params.append("manufacturers[]", m));
      f.colors.forEach((c) => params.append("colors[]", c));
      params.append("limit", "20");

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setProducts(data.products);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string, f: SearchFilters) => {
      performSearch(q, f);
    }, 300),
    [performSearch]
  );

  // Trigger search on query or filters change
  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters, debouncedSearch]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: string) => {
    setFilters((prev) => {
      const current = prev[filterType];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      return { ...prev, [filterType]: updated };
    });
  };

  const resetFilters = () => {
    setQuery("");
    setFilters({ categories: [], manufacturers: [], colors: [] });
    setProducts([]);
    setError(null);
  };

  return {
    query,
    filters,
    products,
    total,
    hasMore,
    loading,
    error,
    availableFilters,
    handleQueryChange,
    handleFilterChange,
    resetFilters,
  };
}
