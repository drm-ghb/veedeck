"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ChevronDown, Check } from "@/components/ui/icons";

type Client = {
  id: string;
  name: string;
  projects: { id: string; title: string }[];
};

interface Props {
  clients: Client[];
}

export default function NewMoodboardDialog({ clients }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const availableProjects = selectedClient?.projects ?? [];
  const selectedProject = availableProjects.find((p) => p.id === projectId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientOpen(false);
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleClientChange(id: string) {
    setClientId(id);
    setProjectId("");
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error("Podaj nazwę tablicy"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/moodboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), clientId: clientId || null, projectId: projectId || null }),
      });
      if (!res.ok) { toast.error("Błąd podczas tworzenia tablicy"); return; }
      const data = await res.json();
      toast.success("Tablica utworzona");
      setOpen(false);
      setTitle("");
      setClientId("");
      setProjectId("");
      router.push(`/moodboardy/${data.id}`);
    } catch {
      toast.error("Błąd podczas tworzenia tablicy");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus size={16} /> Nowa tablica
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Nowa tablica</h2>
          <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
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
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="np. Moodboard salonu"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Klient <span className="text-muted-foreground font-normal">(opcjonalne)</span></label>
            <div className="relative" ref={clientRef}>
              <button
                type="button"
                onClick={() => setClientOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <span className={clientId ? "" : "text-muted-foreground"}>
                  {selectedClient?.name ?? "— Bez klienta —"}
                </span>
                <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
              </button>
              {clientOpen && (
                <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-52 overflow-y-auto py-1">
                    <button
                      type="button"
                      onClick={() => { handleClientChange(""); setClientOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Check size={14} className={clientId === "" ? "opacity-100" : "opacity-0"} />
                      — Bez klienta —
                    </button>
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { handleClientChange(c.id); setClientOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Check size={14} className={clientId === c.id ? "opacity-100" : "opacity-0"} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                <div className="relative" ref={projectRef}>
                  <button
                    type="button"
                    onClick={() => setProjectOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <span className={projectId ? "" : "text-muted-foreground"}>
                      {selectedProject?.title ?? "— Bez projektu —"}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
                  </button>
                  {projectOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="max-h-52 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => { setProjectId(""); setProjectOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Check size={14} className={projectId === "" ? "opacity-100" : "opacity-0"} />
                          — Bez projektu —
                        </button>
                        {availableProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setProjectId(p.id); setProjectOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                          >
                            <Check size={14} className={projectId === p.id ? "opacity-100" : "opacity-0"} />
                            {p.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Tworzenie..." : "Utwórz tablicę"}
          </button>
        </div>
      </div>
    </div>
  );
}
