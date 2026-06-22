"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ICON_OPTIONS, getRoomIcon } from "@/lib/roomIcons";
import { useT } from "@/lib/i18n";

interface AddRoomDialogProps {
  projectId: string;
}

export default function AddRoomDialog({ projectId }: AddRoomDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("INNE");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const SelectedIcon = getRoomIcon(null, icon);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: name.trim(), type: "INNE", icon }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.projekty.roomAdded);
      setOpen(false);
      setName("");
      setIcon("INNE");
      router.refresh();
    } catch {
      toast.error(t.projekty.roomAddError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        {t.projekty.addRoom}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.projekty.newRoom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="roomName">{t.projekty.roomName}</Label>
            <Input
              id="roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.projekty.roomNamePlaceholder}
              required
              autoFocus
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t.projekty.creating : t.common.add}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
