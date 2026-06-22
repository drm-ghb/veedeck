"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

export interface ProjectInfoData {
  investmentStreet?: string | null;
  investmentCity?: string | null;
  investmentPostalCode?: string | null;
  investmentCountry?: string | null;
  designerContactName?: string | null;
  designerContactPhone?: string | null;
  investorContactName?: string | null;
  investorContactPhone?: string | null;
  projectNotes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorId: string;
  assignmentId: string;
  info: ProjectInfoData;
}

export default function EditProjectInfoDialog({ open, onOpenChange, contractorId, assignmentId, info }: Props) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [investmentStreet, setInvestmentStreet] = useState(info.investmentStreet ?? "");
  const [investmentCity, setInvestmentCity] = useState(info.investmentCity ?? "");
  const [investmentPostalCode, setInvestmentPostalCode] = useState(info.investmentPostalCode ?? "");
  const [investmentCountry, setInvestmentCountry] = useState(info.investmentCountry ?? "");
  const [designerContactName, setDesignerContactName] = useState(info.designerContactName ?? "");
  const [designerContactPhone, setDesignerContactPhone] = useState(info.designerContactPhone ?? "");
  const [investorContactName, setInvestorContactName] = useState(info.investorContactName ?? "");
  const [investorContactPhone, setInvestorContactPhone] = useState(info.investorContactPhone ?? "");
  const [projectNotes, setProjectNotes] = useState(info.projectNotes ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contractors/${contractorId}/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentStreet: investmentStreet.trim() || null,
          investmentCity: investmentCity.trim() || null,
          investmentPostalCode: investmentPostalCode.trim() || null,
          investmentCountry: investmentCountry.trim() || null,
          designerContactName: designerContactName.trim() || null,
          designerContactPhone: designerContactPhone.trim() || null,
          investorContactName: investorContactName.trim() || null,
          investorContactPhone: investorContactPhone.trim() || null,
          projectNotes: projectNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error(t.wykonawcy.saveError);
        return;
      }
      toast.success(t.wykonawcy.infoSaved);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.wykonawcy.projectInfoTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.investmentAddress}</p>
            <Input
              value={investmentStreet}
              onChange={(e) => setInvestmentStreet(e.target.value)}
              placeholder={t.wykonawcy.streetPlaceholder}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={investmentPostalCode}
                onChange={(e) => setInvestmentPostalCode(e.target.value)}
                placeholder={t.wykonawcy.postalCode}
              />
              <Input
                value={investmentCity}
                onChange={(e) => setInvestmentCity(e.target.value)}
                placeholder={t.wykonawcy.city}
              />
            </div>
            <Input
              value={investmentCountry}
              onChange={(e) => setInvestmentCountry(e.target.value)}
              placeholder={t.wykonawcy.country}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.designerContact}</p>
            <div className="space-y-1">
              <Label className="text-xs">{t.wykonawcy.labelName}</Label>
              <Input
                value={designerContactName}
                onChange={(e) => setDesignerContactName(e.target.value)}
                placeholder={t.wykonawcy.labelName}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.wykonawcy.phoneNumber}</Label>
              <Input
                value={designerContactPhone}
                onChange={(e) => setDesignerContactPhone(e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.investorContact}</p>
            <div className="space-y-1">
              <Label className="text-xs">{t.wykonawcy.labelName}</Label>
              <Input
                value={investorContactName}
                onChange={(e) => setInvestorContactName(e.target.value)}
                placeholder={t.wykonawcy.labelName}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.wykonawcy.phoneNumber}</Label>
              <Input
                value={investorContactPhone}
                onChange={(e) => setInvestorContactPhone(e.target.value)}
                placeholder="+48 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.descOptional}</p>
            <textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder={t.wykonawcy.notesPlaceholder}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t.wykonawcy.savingBtn : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
