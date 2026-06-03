"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AddClientDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() { setName(""); }

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Podaj nazwę klienta"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Błąd");
        return;
      }
      toast.success("Klient dodany");
      onOpenChange(false);
      reset();
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy klient</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nazwa klienta <span className="text-destructive">*</span></Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="np. Makowska"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Dodawanie…" : "Dodaj klienta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
