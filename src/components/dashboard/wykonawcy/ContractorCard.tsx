"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Trash2, Edit2 } from "@/components/ui/icons";
import EditContractorDialog from "./EditContractorDialog";

interface Props {
  id: string;
  name: string;
  company?: string | null;
  trade?: string | null;
  activeAssignments: number;
}

export default function ContractorCard({ id, name, company, trade, activeAssignments }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function handleDelete() {
    if (!confirm(`Usunąć wykonawcę "${name}"? Spowoduje to usunięcie wszystkich przypisań i plików.`)) return;
    const res = await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Wykonawca usunięty");
      router.refresh();
    } else {
      toast.error("Błąd podczas usuwania wykonawcy");
    }
  }

  return (
    <>
    <Link href={`/wykonawcy/${id}`} className="block">
      <Card className="hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-tight truncate">{name}</CardTitle>
              {company && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">{company}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-8 z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg py-1"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Edit2 size={14} />
                      Edytuj
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); handleDelete(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={14} />
                      Usuń
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {trade && (
              <Badge variant="secondary" className="text-xs">{trade}</Badge>
            )}
            <Badge
              variant={activeAssignments > 0 ? "default" : "secondary"}
              className="text-xs"
            >
              {activeAssignments === 1 ? "1 aktywny projekt" : `${activeAssignments} aktywnych projektów`}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    </Link>

    <EditContractorDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      contractor={{ id, name, company, trade }}
      onUpdated={() => router.refresh()}
    />
    </>
  );
}
