"use client";

import { useState } from "react";
import { useProductSearch } from "./useProductSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  color?: string | null;
  price?: string | null;
  imageUrl?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
}

export function SearchProductDialog({ open, onOpenChange, onSelectProduct }: Props) {
  const search = useProductSearch();
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

  const toggleFilter = (filterType: string) => {
    setExpandedFilters((prev) => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  };

  const getActiveCount = (filterType: keyof typeof search.filters): number => {
    return search.filters[filterType].length;
  };

  const handleProductSelect = (product: Product) => {
    onSelectProduct(product);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      search.resetFilters();
      setFilterSearch({ categories: "", manufacturers: "", colors: "" });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[700px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Zaawansowane wyszukiwanie</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Filters */}
          <div className="w-64 border-r overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Categories */}
              <div>
                <button
                  onClick={() => toggleFilter("categories")}
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
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedFilters.categories && search.availableFilters && (
                  <div className="space-y-2 ml-4">
                    {search.availableFilters.categories.length > 5 && (
                      <Input
                        placeholder="Szukaj kategorii..."
                        value={filterSearch.categories}
                        onChange={(e) => setFilterSearch((prev) => ({ ...prev, categories: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    )}
                    {search.availableFilters.categories
                      .filter((cat) => cat.toLowerCase().includes(filterSearch.categories.toLowerCase()))
                      .map((cat) => (
                        <div key={cat} className="flex items-center gap-2">
                          <Checkbox
                            id={`cat-${cat}`}
                            checked={search.filters.categories.includes(cat)}
                            onCheckedChange={() =>
                              search.handleFilterChange("categories", cat)
                            }
                          />
                          <label
                            htmlFor={`cat-${cat}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {cat}
                          </label>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Manufacturers */}
              <div>
                <button
                  onClick={() => toggleFilter("manufacturers")}
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
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedFilters.manufacturers && search.availableFilters && (
                  <div className="space-y-2 ml-4">
                    {search.availableFilters.manufacturers.length > 5 && (
                      <Input
                        placeholder="Szukaj producenta..."
                        value={filterSearch.manufacturers}
                        onChange={(e) => setFilterSearch((prev) => ({ ...prev, manufacturers: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {search.availableFilters.manufacturers
                        .filter((mfr) => mfr.toLowerCase().includes(filterSearch.manufacturers.toLowerCase()))
                        .map((mfr) => (
                          <div key={mfr} className="flex items-center gap-2">
                            <Checkbox
                              id={`mfr-${mfr}`}
                              checked={search.filters.manufacturers.includes(mfr)}
                              onCheckedChange={() =>
                                search.handleFilterChange("manufacturers", mfr)
                              }
                            />
                            <label
                              htmlFor={`mfr-${mfr}`}
                              className="text-sm cursor-pointer flex-1 truncate"
                            >
                              {mfr}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div>
                <button
                  onClick={() => toggleFilter("colors")}
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
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedFilters.colors && search.availableFilters && (
                  <div className="space-y-2 ml-4">
                    {search.availableFilters.colors.length > 5 && (
                      <Input
                        placeholder="Szukaj koloru..."
                        value={filterSearch.colors}
                        onChange={(e) => setFilterSearch((prev) => ({ ...prev, colors: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {search.availableFilters.colors
                        .filter((color) => color.toLowerCase().includes(filterSearch.colors.toLowerCase()))
                        .map((color) => (
                          <div key={color} className="flex items-center gap-2">
                            <Checkbox
                              id={`color-${color}`}
                              checked={search.filters.colors.includes(color)}
                              onCheckedChange={() =>
                                search.handleFilterChange("colors", color)
                              }
                            />
                            <label
                              htmlFor={`color-${color}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {color}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear filters button */}
              {(search.filters.categories.length > 0 ||
                search.filters.manufacturers.length > 0 ||
                search.filters.colors.length > 0 ||
                search.query) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={search.resetFilters}
                  className="w-full"
                >
                  Wyczyść filtry
                </Button>
              )}
            </div>
          </div>

          {/* Right panel: Search & Results */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj produktu..."
                  value={search.query}
                  onChange={(e) => search.handleQueryChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {search.loading
                  ? "Szukam..."
                  : `Znaleziono ${search.total} produktów`}
              </div>
            </div>

            <ScrollArea className="flex-1">
              {search.loading && (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {search.error && (
                <div className="p-4 text-sm text-destructive">
                  {search.error}
                </div>
              )}

              {!search.loading && search.products.length === 0 && !search.error && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {search.query || Object.values(search.filters).some((f) => f.length > 0)
                    ? "Brak wyników"
                    : "Wpisz zapytanie lub wybierz filtry"}
                </div>
              )}

              {!search.loading && search.products.length > 0 && (
                <div className="p-4 space-y-2">
                  {search.products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex gap-3"
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">
                          {product.name}
                        </div>
                        {(product.manufacturer ||
                          product.category ||
                          product.color) && (
                          <div className="text-xs text-muted-foreground mt-1 space-x-2">
                            {product.manufacturer && (
                              <span className="inline-block">
                                {product.manufacturer}
                              </span>
                            )}
                            {product.category && (
                              <span className="inline-block">
                                {product.category}
                              </span>
                            )}
                            {product.color && (
                              <span className="inline-block">
                                {product.color}
                              </span>
                            )}
                          </div>
                        )}
                        {product.price && (
                          <div className="text-sm text-foreground mt-1 font-medium">
                            {product.price}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
