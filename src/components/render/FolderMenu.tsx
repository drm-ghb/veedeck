"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FolderMenuProps {
  folder: { id: string; name: string };
}

export default function FolderMenu({ folder }: FolderMenuProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [loading, setLoading] = useState(false);

  async function handleRename() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Nazwa folderu zmieniona");
      setRenameOpen(false);
      router.refresh();
    } else {
      toast.error("Błąd zmiany nazwy");
    }
  }

  async function handleDelete() {
    if (!confirm(`Usunąć folder "${folder.name}"? Pliki w folderze nie zostaną usunięte.`)) return;
    const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Folder usunięty");
      router.refresh();
    } else {
      toast.error("Błąd usuwania folderu");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setName(folder.name); setRenameOpen(true); }}>
            <Pencil size={14} />
            Zmień nazwę
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 size={14} />
            Usuń folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={(v) => { if (!loading) setRenameOpen(v); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Zmień nazwę folderu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRename(); } }}
            />
            <Button onClick={handleRename} disabled={loading || !name.trim()} className="w-full">
              {loading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
