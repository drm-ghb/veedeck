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

interface AddRoomDialogProps {
  projectId: string;
}

export default function AddRoomDialog({ projectId }: AddRoomDialogProps) {
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

      toast.success(`Pomieszczenie "${name.trim()}" dodane`);
      setOpen(false);
      setName("");
      setIcon("INNE");
      router.refresh();
    } catch {
      toast.error("Błąd dodawania pomieszczenia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + Dodaj
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowe pomieszczenie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="roomName">Nazwa *</Label>
            <Input
              id="roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Kuchnia główna, Sypialnia 1..."
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ikona</Label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setIcon(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                    icon === key
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                  }`}
                >
                  <Icon size={20} className={icon === key ? "text-white" : "text-[#19213D]"} />
                  <span className="truncate w-full text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Dodawanie..." : "Dodaj"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
