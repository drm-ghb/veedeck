"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Project {
  id: string;
  title: string;
  clientName: string | null;
}

export default function NewListDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"none" | "project">("none");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const t = useT();

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjects(data.filter((p: any) => !p.archived).map((p: any) => ({
          id: p.id,
          title: p.title,
          clientName: p.clientName ?? null,
        })));
      }
    } finally {
      setLoadingProjects(false);
    }
  }

  function handleModeChange(newMode: "none" | "project") {
    setMode(newMode);
    setSelectedProject(null);
    setSearch("");
    if (newMode === "project" && projects.length === 0) {
      fetchProjects();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "project" && !selectedProject) return;

    setLoading(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          projectId: selectedProject?.id ?? null,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.listy.listCreated);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t.listy.listCreateError);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setName("");
      setMode("none");
      setSelectedProject(null);
      setSearch("");
    }
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.clientName?.toLowerCase().includes(q) ?? false)
    );
  });

  const canSubmit = name.trim() && (mode === "none" || selectedProject !== null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="flex items-center gap-2 sm:self-start" />}>
        <Plus size={16} />
        {t.listy.newList}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.listy.newList}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t.listy.listName}</Label>
            <Input
              id="name"
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
                onClick={() => handleModeChange("project")}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border font-medium transition-colors ${
                  mode === "project"
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {t.listy.selectProject}
              </button>
            </div>

            {mode === "project" && (
              <div className="space-y-2 pt-1">
                {selectedProject ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted border border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedProject.title}</p>
                      {selectedProject.clientName && (
                        <p className="text-xs text-muted-foreground truncate">{selectedProject.clientName}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="text-xs text-muted-foreground hover:text-foreground ml-2 shrink-0"
                    >
                      Zmień
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t.listy.searchProject}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                      {loadingProjects ? (
                        <p className="text-sm text-muted-foreground text-center py-6">{t.common.loading}</p>
                      ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {search ? t.common.noResults : t.listy.noProjects}
                        </p>
                      ) : (
                        filtered.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProject(p)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                              i !== filtered.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                              {p.clientName && (
                                <p className="text-xs text-muted-foreground truncate">{p.clientName}</p>
                              )}
                            </div>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !canSubmit}>
              {loading ? t.listy.creating : t.listy.createList}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
