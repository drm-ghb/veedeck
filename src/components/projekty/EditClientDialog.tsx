"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Client { id: string; name: string; }

interface Props {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function EditClientDialog({ client, open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState(client.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setName(client.name); }, [client.name]);

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Podaj nazwę klienta"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) { toast.error("Błąd"); return; }
      toast.success("Zapisano");
      onOpenChange(false);
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj klienta</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nazwa klienta</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Zapisywanie…" : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
