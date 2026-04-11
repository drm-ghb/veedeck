"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Archive, Pin, PinOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import EditProjectDialog from "@/components/dashboard/EditProjectDialog";
import { useT } from "@/lib/i18n";

interface ProjektyMenuProps {
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

export default function ProjektyMenu({ project }: ProjektyMenuProps) {
  const t = useT();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t.projekty.projectDeleted);
        router.refresh();
      } else {
        toast.error(t.projekty.projectDeleteError);
      }
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-muted transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
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
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.projekty.confirmDeleteProject.replace("{title}", project.title)}</AlertDialogTitle>
            <AlertDialogDescription>
              Czy jesteś pewien, że chcesz trwale usunąć ten projekt? Wszystkie dane
              z nim związane zostaną usunięte na zawsze.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Usuwanie..." : t.projekty.deleteForever}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
