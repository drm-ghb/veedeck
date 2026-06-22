"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ICON_OPTIONS, getRoomIcon } from "@/lib/roomIcons";
import { useT } from "@/lib/i18n";

interface EditRoomDialogProps {
  room: {
    id: string;
    name: string;
    type: string;
    icon?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRoomDialog({
  room,
  open,
  onOpenChange,
}: EditRoomDialogProps) {
  const t = useT();
  const [name, setName] = useState(room.name);
  const [icon, setIcon] = useState<string>(room.icon || room.type);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setName(room.name);
      setIcon(room.icon || room.type);
    }
  }, [open, room]);

  const SelectedIcon = getRoomIcon(null, icon);

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.projekty.roomUpdated);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t.projekty.roomUpdateError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.projekty.editRoom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Icon preview */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <SelectedIcon size={32} className="text-primary" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-roomName">{t.projekty.roomName}</Label>
            <Input
              id="edit-roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t.projekty.roomIcon}</Label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setIcon(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                    icon === key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  <Icon size={20} className={icon === key ? "text-background" : "text-primary"} />
                  <span className="truncate w-full text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
