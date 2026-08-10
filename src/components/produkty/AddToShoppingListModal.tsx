"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown } from "@/components/ui/icons";

interface Section {
  id: string;
  name: string;
}

interface ShoppingList {
  id: string;
  name: string;
  sections: Section[];
}

export interface LibraryProduct {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  deliveryTime: string | null;
  category: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: LibraryProduct;
}

export default function AddToShoppingListModal({ open, onClose, product }: Props) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    fetch("/api/biblioteka/lists")
      .then((r) => r.json())
      .then((data: ShoppingList[]) => {
        setLists(data);
        if (data.length > 0) {
          setSelectedListId(data[0].id);
          setSelectedSectionId(data[0].sections[0]?.id ?? "");
        }
      })
      .catch(() => toast.error("Nie udało się załadować list"))
      .finally(() => setFetching(false));
  }, [open]);

  const selectedList = lists.find((l) => l.id === selectedListId);

  function handleListChange(listId: string) {
    setSelectedListId(listId);
    const list = lists.find((l) => l.id === listId);
    setSelectedSectionId(list?.sections[0]?.id ?? "");
  }

  async function handleAdd() {
    if (!selectedListId || !selectedSectionId) {
      toast.error("Wybierz listę i sekcję");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${selectedListId}/sections/${selectedSectionId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          url: product.url,
          imageUrl: product.imageUrl,
          price: product.price,
          manufacturer: product.manufacturer,
          color: product.color,
          dimensions: product.dimensions,
          description: product.description,
          deliveryTime: product.deliveryTime,
          productId: product.id,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dodano do listy zakupowej");
      onClose();
    } catch {
      toast.error("Nie udało się dodać produktu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Dodaj do listy zakupowej</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{product.name}</p>
        </DialogHeader>

        {fetching ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Ładowanie list...</div>
        ) : lists.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Brak aktywnych list zakupowych</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lista</label>
              <div className="relative">
                <select
                  value={selectedListId}
                  onChange={(e) => handleListChange(e.target.value)}
                  className="w-full appearance-none bg-muted rounded-lg px-3 py-2 pr-8 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sekcja</label>
              {selectedList && selectedList.sections.length === 0 ? (
                <div className="text-sm text-muted-foreground">Ta lista nie ma sekcji</div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full appearance-none bg-muted rounded-lg px-3 py-2 pr-8 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {selectedList?.sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Anuluj</Button>
          <Button
            onClick={handleAdd}
            disabled={loading || fetching || !selectedListId || !selectedSectionId}
          >
            {loading ? "Dodawanie..." : "Dodaj do listy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
