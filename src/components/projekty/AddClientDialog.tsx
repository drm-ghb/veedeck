"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AddClientDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error(t.projekty.clientNameRequired); return; }
    if (contactEmail.trim() && !contactEmail.includes("@")) {
      toast.error(t.projekty.emailInvalid);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? t.common.error);
        return;
      }
      toast.success(t.projekty.clientAdded);
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
          <DialogTitle>{t.projekty.addClientTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.projekty.clientNameInputLabel} <span className="text-destructive">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="np. Makowska"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t.projekty.clientContactLabel} <span className="text-muted-foreground font-normal">{t.common.optional}</span></Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Jan Kowalski"
            />
            <p className="text-xs text-muted-foreground">{t.projekty.clientContactHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.projekty.clientEmailLabel}</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jan@domena.pl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.projekty.phoneLabel}</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.projekty.clientDescLabel} <span className="text-muted-foreground font-normal">{t.common.optional}</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opis klienta..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? t.projekty.addingLabel : t.projekty.addClientBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
