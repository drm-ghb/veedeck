"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { surveyTemplates } from "@/lib/surveyTemplates";

type Client = { id: string; name: string };
type CustomTemplate = { id: string; name: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (survey: any) => void;
  clients: Client[];
  customTemplates: CustomTemplate[];
}

export default function NewSurveyDialog({ open, onClose, onCreated, clients, customTemplates }: Props) {
  const [name, setName] = useState("");
  const [assignedClientId, setAssignedClientId] = useState("");
  const [templateValue, setTemplateValue] = useState(""); // "builtin:{id}" | "custom:{id}" | ""
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setAssignedClientId("");
      setTemplateValue("");
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);

    const clientId = assignedClientId || null;
    const [templateType, templateId] = templateValue ? templateValue.split(":") : [];

    try {
      let survey: any;

      if (templateType === "custom" && templateId) {
        // Duplicate custom template → creates survey with questions in one step
        const res = await fetch(`/api/surveys/${templateId}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), assignedClientId: clientId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? "Błąd tworzenia ankiety");
          return;
        }
        survey = await res.json();
      } else {
        // Create blank survey
        const res = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), assignedClientId: clientId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? "Błąd tworzenia ankiety");
          return;
        }
        survey = await res.json();

        // Apply built-in template if selected
        if (templateType === "builtin" && templateId) {
          await fetch(`/api/surveys/${survey.id}/apply-template`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId }),
          });
        }
      }

      toast.success("Ankieta utworzona");
      onCreated(survey);
    } finally {
      setLoading(false);
    }
  }

  const hasTemplates = surveyTemplates.length > 0 || customTemplates.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading && !v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>+ Nowa ankieta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="survey-name">Nazwa ankiety</Label>
            <Input
              id="survey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Ankieta onboardingowa"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
          </div>

          {hasTemplates && (
            <div className="space-y-1.5">
              <Label htmlFor="survey-template">Szablon</Label>
              <select
                id="survey-template"
                value={templateValue}
                onChange={(e) => setTemplateValue(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Brak szablonu —</option>
                {surveyTemplates.length > 0 && (
                  <optgroup label="Szablony gotowe">
                    {surveyTemplates.map((t) => (
                      <option key={t.id} value={`builtin:${t.id}`}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
                {customTemplates.length > 0 && (
                  <optgroup label="Moje szablony">
                    {customTemplates.map((t) => (
                      <option key={t.id} value={`custom:${t.id}`}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="survey-client">Klient (opcjonalne)</Label>
              <select
                id="survey-client"
                value={assignedClientId}
                onChange={(e) => setAssignedClientId(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— bez przypisania —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full">
            {loading ? "Tworzenie..." : "Utwórz ankietę"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
