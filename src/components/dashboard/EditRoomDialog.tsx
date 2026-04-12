"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { ROOM_TYPE_LABELS, ICON_OPTIONS, getRoomIcon, type RoomType } from "@/lib/roomIcons";

const ROOM_TYPES = Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][];

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
  const [name, setName] = useState(room.name);
  const [type, setType] = useState<RoomType>(room.type as RoomType);
  const [icon, setIcon] = useState<string>(room.icon || room.type);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setName(room.name);
      setType(room.type as RoomType);
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
        body: JSON.stringify({ name: name.trim(), type, icon }),
      });

      if (!res.ok) throw new Error();

      toast.success("Pomieszczenie zaktualizowane");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj pomieszczenie</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Icon preview */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <SelectedIcon size={32} className="text-primary" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-roomName">Nazwa *</Label>
            <Input
              id="edit-roomName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Typ pomieszczenia</Label>
            <DropdownMenu>
              <DropdownMenuTrigger type="button" className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm hover:border-gray-400 transition-colors">
                <span className="text-gray-700">{ROOM_TYPE_LABELS[type]}</span>
                <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                {ROOM_TYPES.map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setType(value)}
                    className={type === value ? "bg-gray-100 font-medium" : ""}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <Icon size={20} className={icon === key ? "text-white" : "text-primary"} />
                  <span className="truncate w-full text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
