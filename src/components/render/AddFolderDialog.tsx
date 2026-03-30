"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AddFolderDialog({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roomId }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Folder utworzony");
      setName("");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Błąd tworzenia folderu");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { setOpen(v); if (!v) setName(""); } }}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FolderPlus size={15} />
        Nowy folder
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nowy folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Nazwa folderu</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Wersja 1"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
          </div>
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full">
            {loading ? "Tworzenie..." : "Utwórz folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
