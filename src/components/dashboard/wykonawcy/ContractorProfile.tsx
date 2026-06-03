"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Archive, ArchiveRestore, ChevronLeft } from "@/components/ui/icons";
import AssignProjectDialog from "./AssignProjectDialog";
import EditContractorDialog from "./EditContractorDialog";

interface Assignment {
  id: string;
  archived: boolean;
  createdAt: string;
  project: { id: string; title: string; clientName: string | null };
}

interface Contractor {
  id: string;
  name: string;
  company: string | null;
  trade: string | null;
  email: string | null;
  phone: string | null;
  assignments: Assignment[];
}

interface Props {
  contractor: Contractor;
}

export default function ContractorProfile({ contractor }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const active = contractor.assignments.filter((a) => !a.archived);
  const archived = contractor.assignments.filter((a) => a.archived);
  const displayed = tab === "active" ? active : archived;

  async function toggleArchive(assignment: Assignment) {
    const res = await fetch(`/api/contractors/${contractor.id}/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !assignment.archived }),
    });
    if (res.ok) {
      toast.success(assignment.archived ? "Przywrócono projekt" : "Projekt zarchiwizowany");
      router.refresh();
    } else {
      toast.error("Błąd podczas aktualizacji");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/wykonawcy" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/wykonawcy" className="hover:text-foreground transition-colors">Wykonawcy</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{contractor.name}</span>
        </nav>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{contractor.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {contractor.company && <span className="text-sm text-muted-foreground">{contractor.company}</span>}
            {contractor.trade && <Badge variant="secondary">{contractor.trade}</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {contractor.email && <span>{contractor.email}</span>}
            {contractor.phone && <span>{contractor.phone}</span>}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="shrink-0">Edytuj</Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 border border-border rounded-lg p-1">
            <button
              onClick={() => setTab("active")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Aktywne ({active.length})
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "archived" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Zarchiwizowane ({archived.length})
            </button>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="gap-2 shrink-0">
            <Plus size={16} />
            Przypisz projekt
          </Button>
        </div>

        {displayed.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {tab === "active" ? "Brak aktywnych projektów" : "Brak zarchiwizowanych projektów"}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                <Link href={`/wykonawcy/${contractor.id}/projekty/${a.id}`} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.project.title}</p>
                  {a.project.clientName && (
                    <p className="text-sm text-muted-foreground truncate">{a.project.clientName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Przypisano: {new Date(a.createdAt).toLocaleDateString("pl-PL")}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleArchive(a)}
                  className="gap-1.5 shrink-0"
                >
                  {a.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  {a.archived ? "Przywróć" : "Archiwizuj"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssignProjectDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        contractorId={contractor.id}
        onAssigned={() => router.refresh()}
      />
      <EditContractorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contractor={contractor}
        onUpdated={() => router.refresh()}
      />
    </div>
  );
}
