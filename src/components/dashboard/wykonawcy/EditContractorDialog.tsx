"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor: { id: string; name: string; company?: string | null; trade?: string | null; email?: string | null; phone?: string | null };
  onUpdated: () => void;
}

export default function EditContractorDialog({ open, onOpenChange, contractor, onUpdated }: Props) {
  const t = useT();
  const tradeOptions = [
    { value: "malarz", label: t.wykonawcy.tradePainter },
    { value: "hydraulik", label: t.wykonawcy.tradePlumber },
    { value: "elektryk", label: t.wykonawcy.tradeElectrician },
    { value: "firma wykończeniowa", label: t.wykonawcy.tradeFinishing },
    { value: "inne", label: t.wykonawcy.tradeOther },
  ];
  const [name, setName] = useState(contractor.name);
  const [company, setCompany] = useState(contractor.company ?? "");
  const [trade, setTrade] = useState(contractor.trade ?? "");
  const [email, setEmail] = useState(contractor.email ?? "");
  const [phone, setPhone] = useState(contractor.phone ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contractor.name);
      setCompany(contractor.company ?? "");
      setTrade(contractor.trade ?? "");
      setEmail(contractor.email ?? "");
      setPhone(contractor.phone ?? "");
    }
  }, [open, contractor]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error(t.wykonawcy.nameRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contractors/${contractor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, trade, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? t.wykonawcy.saveError);
        return;
      }
      toast.success(t.wykonawcy.changesSaved);
      onOpenChange(false);
      onUpdated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.wykonawcy.editTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t.wykonawcy.labelNameRequired}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="space-y-1">
            <Label>{t.wykonawcy.labelCompany}</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t.wykonawcy.labelSpecialization}</Label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t.wykonawcy.selectSpecialty}</option>
              {tradeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t.wykonawcy.labelEmail}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t.wykonawcy.labelPhone}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t.wykonawcy.savingBtn : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
