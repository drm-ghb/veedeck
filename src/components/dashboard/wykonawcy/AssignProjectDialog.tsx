"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

interface ClientOption {
  id: string;
  name: string;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  mainContact?: { name: string; phone?: string | null } | null;
  projects: { id: string; title: string }[];
}

interface DesignerInfo {
  name: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorId: string;
  onAssigned: () => void;
}

export default function AssignProjectDialog({ open, onOpenChange, contractorId, onAssigned }: Props) {
  const t = useT();
  const [designer, setDesigner] = useState<DesignerInfo | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 3 fields
  const [investmentStreet, setInvestmentStreet] = useState("");
  const [investmentCity, setInvestmentCity] = useState("");
  const [investmentPostalCode, setInvestmentPostalCode] = useState("");
  const [investmentCountry, setInvestmentCountry] = useState("");
  const [designerContactName, setDesignerContactName] = useState("");
  const [designerContactPhone, setDesignerContactPhone] = useState("");
  const [investorContactName, setInvestorContactName] = useState("");
  const [investorContactPhone, setInvestorContactPhone] = useState("");
  const [projectNotes, setProjectNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    fetch("/api/projects/clients")
      .then((r) => r.json())
      .then((data) => {
        setDesigner(data.designer ?? null);
        setClients(Array.isArray(data.clients) ? data.clients : []);
      })
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [open]);

  // Auto-populate designer fields when designer data loads
  useEffect(() => {
    if (designer) {
      setDesignerContactName(designer.name ?? "");
      setDesignerContactPhone(designer.phone ?? "");
    }
  }, [designer]);

  // Auto-populate address + investor when client is selected
  function selectClient(client: ClientOption) {
    setSelectedClientId(client.id);
    setProjectId("");
    setInvestmentStreet(client.addressStreet ?? "");
    setInvestmentCity(client.addressCity ?? "");
    setInvestmentPostalCode(client.addressPostalCode ?? "");
    setInvestmentCountry(client.addressCountry ?? "");
    setInvestorContactName(client.mainContact?.name ?? "");
    setInvestorContactPhone(client.mainContact?.phone ?? "");
  }

  function reset() {
    setProjectId("");
    setSelectedClientId(null);
    setInvestmentStreet("");
    setInvestmentCity("");
    setInvestmentPostalCode("");
    setInvestmentCountry("");
    setDesignerContactName("");
    setDesignerContactPhone("");
    setInvestorContactName("");
    setInvestorContactPhone("");
    setProjectNotes("");
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const clientProjects = selectedClient?.projects ?? [];

  async function handleSubmit() {
    if (!projectId) {
      toast.error(t.wykonawcy.selectProjectError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contractors/${contractorId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
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
        const data = await res.json();
        toast.error(data.error ?? t.wykonawcy.assignError);
        return;
      }
      toast.success(t.wykonawcy.assignedOk);
      onOpenChange(false);
      reset();
      onAssigned();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.wykonawcy.assignTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Krok 1: klient */}
          <div className="space-y-2">
            <Label>{t.wykonawcy.selectClientStep}</Label>
            {loadingClients ? (
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
                {t.common.loading}
              </div>
            ) : clients.length === 0 ? (
              <div className="h-16 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
                {t.wykonawcy.noClients}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-48 overflow-y-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClient(client)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedClientId === client.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="flex-1 font-semibold text-sm truncate">{client.name}</span>
                    {selectedClientId === client.id && (
                      <Check size={15} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Krok 2: projekt */}
          {selectedClientId && (
            <div className="space-y-2">
              <Label>{t.wykonawcy.selectProjectStep}</Label>
              <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-40 overflow-y-auto">
                {clientProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProjectId(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      projectId === p.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="flex-1 text-sm truncate">{p.title}</span>
                    {projectId === p.id && (
                      <Check size={15} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Krok 3: informacje o projekcie */}
          {projectId && (
            <div className="space-y-4 border-t border-border pt-4">
              <Label>{t.wykonawcy.projectInfoStep}</Label>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.investmentAddress}</p>
                <div className="space-y-2">
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
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.designerContact}</p>
                <Input
                  value={designerContactName}
                  onChange={(e) => setDesignerContactName(e.target.value)}
                  placeholder={t.wykonawcy.labelName}
                />
                <Input
                  value={designerContactPhone}
                  onChange={(e) => setDesignerContactPhone(e.target.value)}
                  placeholder={t.wykonawcy.phoneNumber}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.investorContact}</p>
                <Input
                  value={investorContactName}
                  onChange={(e) => setInvestorContactName(e.target.value)}
                  placeholder={t.wykonawcy.labelName}
                />
                <Input
                  value={investorContactPhone}
                  onChange={(e) => setInvestorContactPhone(e.target.value)}
                  placeholder={t.wykonawcy.phoneNumber}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t.wykonawcy.descOptional}</p>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder={t.wykonawcy.notesPlaceholder}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !projectId}>
            {loading ? t.wykonawcy.assigning : t.wykonawcy.assignBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
