"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check } from "@/components/ui/icons";

interface ClientOption {
  id: string;
  name: string;
  projects: { id: string; title: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorId: string;
  onAssigned: () => void;
}

export default function AssignProjectDialog({ open, onOpenChange, contractorId, onAssigned }: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    fetch("/api/projects/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [open]);

  function reset() {
    setProjectId("");
    setSelectedClientId(null);
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const clientProjects = selectedClient?.projects ?? [];

  async function handleSubmit() {
    if (!projectId) {
      toast.error("Wybierz projekt");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contractors/${contractorId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Błąd podczas przypisywania projektu");
        return;
      }
      toast.success("Projekt przypisany");
      onOpenChange(false);
      reset();
      onAssigned();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Przypisz projekt do wykonawcy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: wybierz klienta */}
          <div className="space-y-2">
            <Label>1. Wybierz klienta</Label>
            {loadingClients ? (
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
                Ładowanie…
              </div>
            ) : clients.length === 0 ? (
              <div className="h-16 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
                Brak klientów
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-48 overflow-y-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => { setSelectedClientId(client.id); setProjectId(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedClientId === client.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="flex-1 font-semibold text-sm truncate">{client.name}</span>
                    {selectedClientId === client.id && (
                      <Check size={15} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: wybierz projekt (tylko po wybraniu klienta) */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>2. Wybierz projekt</Label>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                {clientProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProjectId(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      projectId === p.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="flex-1 text-sm truncate">{p.title}</span>
                    {projectId === p.id && (
                      <Check size={15} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !projectId}>
            {loading ? "Przypisywanie…" : "Przypisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
