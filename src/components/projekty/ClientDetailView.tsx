"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, Image as ImageIcon, LocalMall, ChevronRight, Pencil } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EditClientDialog from "@/components/projekty/EditClientDialog";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";

interface Project {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  createdAt: string;
  archived: boolean;
  renderCount: number;
  roomCount: number;
  listCount: number;
}

interface Client {
  id: string;
  name: string;
  createdAt: string;
  projects: Project[];
}

interface Props {
  client: Client;
}

export default function ClientDetailView({ client }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const byContent = (a: Project, b: Project) =>
    (b.renderCount + b.roomCount + b.listCount) - (a.renderCount + a.roomCount + a.listCount);
  const active = client.projects.filter((p) => !p.archived).sort(byContent);
  const archived = client.projects.filter((p) => p.archived).sort(byContent);
  const [showArchived, setShowArchived] = useState(false);

  const displayed = showArchived ? archived : active;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/klienci" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft size={15} />
        Wszyscy klienci
      </Link>

      {/* Client header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.length} {active.length === 1 ? "aktywny projekt" : active.length < 5 ? "aktywne projekty" : "aktywnych projektów"}
            {archived.length > 0 && ` · ${archived.length} archiwalnych`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil size={13} />
            Edytuj
          </Button>
          <NewProjectDialog label="Nowy projekt" clientId={client.id} clientName={client.name} />
        </div>
      </div>

      {/* Tab toggle */}
      {archived.length > 0 && (
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 w-fit">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${!showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Aktywne ({active.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${showArchived ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Archiwum ({archived.length})
          </button>
        </div>
      )}

      {/* Projects list */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users size={36} className="opacity-30" />
          <p className="text-sm">Brak projektów</p>
          <NewProjectDialog label="Dodaj pierwszy projekt" clientId={client.id} clientName={client.name} />
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {displayed.map((p) => (
            <Link
              key={p.id}
              href={`/klienci/${p.slug ?? p.id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{p.title}</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                {p.renderCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon size={12} /> {p.renderCount}
                  </span>
                )}
                {p.listCount > 0 && (
                  <span className="flex items-center gap-1">
                    <LocalMall size={12} /> {p.listCount}
                  </span>
                )}
                <span>{new Date(p.createdAt).toLocaleDateString("pl")}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <EditClientDialog
        client={client}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => { setEditOpen(false); router.refresh(); }}
      />
    </div>
  );
}
