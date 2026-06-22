"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  const [name, setName] = useState(client.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setName(client.name); }, [client.name]);

  async function handleSubmit() {
    if (!name.trim()) { toast.error(t.projekty.clientNameRequired); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) { toast.error(t.common.error); return; }
      toast.success(t.common.saved);
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
          <DialogTitle>{t.projekty.editClientTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t.projekty.clientNameInputLabel}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
