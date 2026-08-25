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
import { getSurveyTemplates } from "@/lib/surveyTemplates";
import { useT, useLang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "@/components/ui/icons";

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
  const t = useT();
  const { lang } = useLang();
  const surveyTemplates = getSurveyTemplates(lang);
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
          toast.error(body.error ?? t.ankiety.createSurveyError);
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
          toast.error(body.error ?? t.ankiety.createSurveyError);
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

      toast.success(t.ankiety.surveyCreated);
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
          <DialogTitle>+ {t.ankiety.newSurvey}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="survey-name">{t.ankiety.surveyNameLabel}</Label>
            <Input
              id="survey-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.ankiety.surveyNamePlaceholder}
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
              autoFocus
            />
          </div>

          {hasTemplates && (
            <div className="space-y-1.5">
              <Label>{t.ankiety.templateLabel}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger disabled={loading} className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className={templateValue ? "text-foreground" : "text-muted-foreground"}>
                    {templateValue
                      ? (templateValue.startsWith("builtin:")
                          ? surveyTemplates.find((t) => t.id === templateValue.slice(8))?.name
                          : customTemplates.find((t) => t.id === templateValue.slice(7))?.name)
                        ?? t.ankiety.noTemplate
                      : t.ankiety.noTemplate}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTemplateValue("")}>
                    <span className={!templateValue ? "font-medium text-primary" : ""}>{t.ankiety.noTemplate}</span>
                  </DropdownMenuItem>
                  {surveyTemplates.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{t.ankiety.builtinTemplatesOptgroup}</DropdownMenuLabel>
                        {surveyTemplates.map((tpl) => (
                          <DropdownMenuItem key={tpl.id} onClick={() => setTemplateValue(`builtin:${tpl.id}`)}>
                            <span className={templateValue === `builtin:${tpl.id}` ? "font-medium text-primary" : ""}>{tpl.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </>
                  )}
                  {customTemplates.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{t.ankiety.myTemplatesOptgroup}</DropdownMenuLabel>
                        {customTemplates.map((tpl) => (
                          <DropdownMenuItem key={tpl.id} onClick={() => setTemplateValue(`custom:${tpl.id}`)}>
                            <span className={templateValue === `custom:${tpl.id}` ? "font-medium text-primary" : ""}>{tpl.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t.ankiety.clientOptional}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger disabled={loading} className="w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className={assignedClientId ? "text-foreground" : "text-muted-foreground"}>
                    {assignedClientId ? clients.find((c) => c.id === assignedClientId)?.name ?? t.ankiety.noClient : t.ankiety.noClient}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setAssignedClientId("")}>
                    <span className={!assignedClientId ? "font-medium text-primary" : ""}>{t.ankiety.noClient}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {clients.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setAssignedClientId(c.id)}>
                      <span className={assignedClientId === c.id ? "font-medium text-primary" : ""}>{c.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Button onClick={handleSave} disabled={loading || !name.trim()} className="w-full">
            {loading ? t.ankiety.creating : t.ankiety.createSurvey}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
