"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, ChevronDown } from "@/components/ui/icons";

type Client = {
  id: string;
  name: string;
  projects: { id: string; title: string }[];
};

type Moodboard = {
  id: string;
  title: string;
  client: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
};

interface Props {
  moodboard: Moodboard;
  clients: Client[];
  onClose: () => void;
  onSave: (updated: { title: string; client: { id: string; name: string } | null; project: { id: string; title: string } | null }) => void;
}

export default function EditMoodboardDialog({ moodboard, clients, onClose, onSave }: Props) {
  const [title, setTitle] = useState(moodboard.title);
  const [clientId, setClientId] = useState(moodboard.client?.id ?? "");
  const [projectId, setProjectId] = useState(moodboard.project?.id ?? "");
  const [loading, setLoading] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const availableProjects = selectedClient?.projects ?? [];

  function handleClientChange(id: string) {
    setClientId(id);
    setProjectId("");
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Podaj nazwę tablicy"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/moodboards/${moodboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          clientId: clientId || null,
          projectId: projectId || null,
        }),
      });
      if (!res.ok) { toast.error("Błąd podczas zapisywania"); return; }

      const newClient = clients.find((c) => c.id === clientId) ?? null;
      const newProject = newClient?.projects.find((p) => p.id === projectId) ?? null;
      onSave({
        title: title.trim(),
        client: newClient ? { id: newClient.id, name: newClient.name } : null,
        project: newProject ? { id: newProject.id, title: newProject.title } : null,
      });
      toast.success("Tablica zaktualizowana");
      onClose();
    } catch {
      toast.error("Błąd podczas zapisywania");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Edytuj tablicę</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nazwa tablicy</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Klient <span className="text-muted-foreground font-normal">(opcjonalne)</span></label>
            <div className="relative">
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Bez klienta —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {clientId && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Projekt <span className="text-muted-foreground font-normal">(opcjonalne)</span></label>
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2 rounded-lg border border-border bg-muted/50">
                  Klient nie ma żadnych projektów
                </p>
              ) : (
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— Bez projektu —</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </div>
    </div>
  );
}
