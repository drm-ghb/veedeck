"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus } from "@/components/ui/icons";
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
import { useT } from "@/lib/i18n";

export default function AddFolderDialog({
  roomId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: {
  roomId: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const router = useRouter();
  const t = useT();
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? externalOpen! : internalOpen;
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpenChange(v: boolean) {
    if (loading) return;
    if (isControlled) externalOnOpenChange?.(v);
    else setInternalOpen(v);
    if (!v) setName("");
  }

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
      const folder = await res.json();
      window.dispatchEvent(new CustomEvent("renderflow:folder-created", { detail: folder }));
      toast.success(t.render.folderCreated);
      setName("");
      if (isControlled) externalOnOpenChange?.(false);
      else setInternalOpen(false);
      router.refresh();
    } else {
      toast.error(t.render.folderCreateError);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger render={<Button variant="outline" />}>
          <FolderPlus size={15} />
          {t.render.newFolder}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.render.newFolder}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">{t.render.folderName}</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.render.folderNamePlaceholder}
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
          </div>
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full">
            {loading ? t.render.creating : t.render.createFolder}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
