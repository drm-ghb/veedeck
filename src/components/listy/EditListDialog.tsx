"use client";

import { useState, useEffect } from "react";
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
import { Search, ChevronRight } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface ClientItem {
  id: string;
  name: string;
}

interface EditListDialogProps {
  list: {
    id: string;
    name: string;
    directClientId: string | null;
    directClientName: string | null;
    project: { id: string; title: string } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditListDialog({ list, open, onOpenChange }: EditListDialogProps) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(list.name);
  const [mode, setMode] = useState<"none" | "client">(list.directClientId ? "client" : "none");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(
    list.directClientId ? { id: list.directClientId, name: list.directClientName ?? "" } : null
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(list.name);
      setMode(list.directClientId ? "client" : "none");
      setSelectedClient(list.directClientId ? { id: list.directClientId, name: list.directClientName ?? "" } : null);
      setSearch("");
    }
  }, [open, list]);

  async function fetchClients() {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setClients(data.filter((c: any) => !c.archived).map((c: any) => ({
          id: c.id,
          name: c.name,
        })));
      }
    } finally {
      setLoadingClients(false);
    }
  }

  function handleModeChange(newMode: "none" | "client") {
    setMode(newMode);
    setSelectedClient(null);
    setSearch("");
    if (newMode === "client" && clients.length === 0) {
      fetchClients();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "client" && !selectedClient) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientId: mode === "client" ? selectedClient?.id : null,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.listy.listUpdated);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t.listy.listUpdateError);
    } finally {
      setLoading(false);
    }
  }

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const canSubmit = name.trim() && (mode === "none" || selectedClient !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.listy.editList}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-list-name">{t.listy.listName}</Label>
            <Input
              id="edit-list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.listy.listNamePlaceholder}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>{t.listy.assignProject}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange("none")}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border font-medium transition-colors ${
                  mode === "none"
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {t.listy.noProject}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("client")}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border font-medium transition-colors ${
                  mode === "client"
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {t.listy.existingClientTab}
              </button>
            </div>

            {mode === "client" && (
              <div className="space-y-2 pt-1">
                {selectedClient ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
                    <p className="text-sm font-medium truncate">{selectedClient.name}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
                    >
                      {t.listy.changeBtn}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t.listy.searchClientPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                      {loadingClients ? (
                        <p className="text-sm text-muted-foreground text-center py-6">{t.common.loading}</p>
                      ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {search ? t.common.noResults : t.listy.noClients}
                        </p>
                      ) : (
                        filtered.map((c, i) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClient(c)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                              i !== filtered.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            <ChevronRight size={14} className="text-muted-foreground ml-3 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
