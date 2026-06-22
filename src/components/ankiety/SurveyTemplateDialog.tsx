"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { surveyTemplates } from "@/lib/surveyTemplates";
import type { SurveySection, SurveyQuestion } from "./SurveyEditor";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onApplied: (data: { sections: SurveySection[]; questions: SurveyQuestion[] }) => void;
  surveyId: string;
}

export default function SurveyTemplateDialog({ open, onClose, onApplied, surveyId }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (!selected) return;
    setLoading(true);
    const res = await fetch(`/api/surveys/${surveyId}/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? t.ankiety.applyTemplateError);
      return;
    }
    const data = await res.json();
    onApplied(data);
  }

  function templateQuestionCount(id: string) {
    const tpl = surveyTemplates.find((t) => t.id === id);
    if (!tpl) return 0;
    return tpl.questions.length + tpl.sections.reduce((sum, s) => sum + s.questions.length, 0);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading && !v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.ankiety.selectTemplate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {surveyTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                selected === tpl.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                  {templateQuestionCount(tpl.id)} {t.ankiety.questionsCount}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            {t.common.cancel}
          </Button>
          <Button onClick={handleApply} disabled={!selected || loading} className="flex-1">
            {loading ? t.common.loading : t.ankiety.applyTemplate}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
