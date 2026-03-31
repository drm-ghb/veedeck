"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EditProjectDialog from "./EditProjectDialog";

interface ProjectMenuProps {
  project: {
    id: string;
    title: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
  };
}

export default function ProjectMenu({ project }: ProjectMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success("Projekt zarchiwizowany");
      router.refresh();
    } else {
      toast.error("Błąd archiwizacji");
    }
  }

  async function handleDelete() {
    if (!confirm(`Usunąć projekt "${project.title}" z RenderFlow?`)) return;
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeModule: "renderflow" }),
    });
    if (res.ok) {
      toast.success("Projekt usunięty z RenderFlow");
      router.refresh();
    } else {
      toast.error("Błąd usuwania");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            Edytuj
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            Archiwizuj
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
