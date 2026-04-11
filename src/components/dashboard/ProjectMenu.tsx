"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, Trash2, Pin, PinOff } from "lucide-react";
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
import { useT } from "@/lib/i18n";

interface ProjectMenuProps {
  project: {
    id: string;
    title: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
    pinned?: boolean;
    clientCanUpload?: boolean;
  };
}

export default function ProjectMenu({ project }: ProjectMenuProps) {
  const t = useT();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  async function handlePin() {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !project.pinned }),
    });
    if (res.ok) {
      toast.success(project.pinned ? t.projekty.projectUnpinned : t.projekty.projectPinned);
      router.refresh();
    } else {
      toast.error(t.projekty.pinError);
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      toast.success(t.projekty.projectArchivedToast);
      router.refresh();
    } else {
      toast.error(t.projekty.projectArchiveError);
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
      toast.success(t.projekty.projectDeleted);
      router.refresh();
    } else {
      toast.error(t.projekty.projectDeleteError);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePin}>
            {project.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {project.pinned ? t.common.unpinAction : t.common.pinAction}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            {t.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive size={14} />
            {t.common.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            {t.common.delete}
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
