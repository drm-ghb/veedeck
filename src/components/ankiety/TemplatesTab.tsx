"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ClipboardList, Eye, X } from "@/components/ui/icons";
import { surveyTemplates, type SurveyTemplate } from "@/lib/surveyTemplates";
import { useT } from "@/lib/i18n";

type Client = { id: string; name: string };

interface CustomTemplate {
  id: string;
  name: string;
  createdAt: string;
  _count: { questions: number };
}

interface Props {
  customTemplates: CustomTemplate[];
  clients: Client[];
}

// ── Use-template dialog ──────────────────────────────────────────────────────

function UseTemplateDialog({
  templateName,
  clients,
  onConfirm,
  onClose,
}: {
  templateName: string;
  clients: Client[];
  onConfirm: (name: string, assignedClientId: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(templateName);
  const [assignedClientId, setAssignedClientId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    await onConfirm(name.trim(), assignedClientId);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
        <h2 className="font-semibold text-base">{t.ankiety.createFromTemplate}</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t.ankiety.surveyNameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        {clients.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t.ankiety.clientOptional}</label>
            <select
              value={assignedClientId}
              onChange={(e) => setAssignedClientId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t.ankiety.noClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? t.ankiety.creating : t.ankiety.create}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template preview overlay ─────────────────────────────────────────────────

function TemplatePreviewQuestion({ question }: { question: import("@/lib/surveyTemplates").TemplateQuestion }) {
  const t = useT();
  const [value, setValue] = useState<unknown>(null);
  const config = (question.config ?? {}) as Record<string, number>;

  return (
    <div className="bg-background border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold">
          {question.label}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </p>
        {question.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{question.description}</p>
        )}
      </div>

      {question.type === "short_text" && (
        <input type="text" value={(value as string) ?? ""} onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={t.ankiety.yourAnswerPlaceholder} />
      )}

      {question.type === "long_text" && (
        <textarea value={(value as string) ?? ""} onChange={(e) => setValue(e.target.value)} rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder={t.ankiety.yourAnswerPlaceholder} />
      )}

      {question.type === "single_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${value === opt ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"}`}>
                {value === opt && <div className="w-full h-full rounded-full bg-white scale-50 transform" />}
              </div>
              <span className="text-sm" onClick={() => setValue(opt)}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt);
            return (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    setValue(selected ? current.filter((v) => v !== opt) : [...current, opt]);
                  }}
                  className="w-4 h-4 rounded border-border accent-primary" />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === "rating" && (
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: (config.max ?? 5) - (config.min ?? 1) + 1 }, (_, i) => (config.min ?? 1) + i).map((n) => (
            <button key={n} onClick={() => setValue(n)}
              className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-muted"}`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "yes_no" && (
        <div className="flex items-center gap-3">
          {[t.ankiety.yesLabel, t.ankiety.noLabel].map((opt) => (
            <button key={opt} onClick={() => setValue(opt)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${value === opt ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-muted"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "budget_range" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{(config.min ?? 0).toLocaleString("pl-PL")} zł</span>
            <span className="font-semibold text-primary">
              {typeof value === "number" ? value.toLocaleString("pl-PL") : (config.min ?? 0).toLocaleString("pl-PL")} zł
            </span>
            <span className="text-muted-foreground">{(config.max ?? 200000).toLocaleString("pl-PL")} zł</span>
          </div>
          <input type="range" min={config.min ?? 0} max={config.max ?? 200000} step={config.step ?? 1000}
            value={typeof value === "number" ? value : (config.min ?? 0)}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-primary" />
        </div>
      )}
    </div>
  );
}

function TemplatePreview({ tpl, onClose, onUse }: { tpl: SurveyTemplate; onClose: () => void; onUse: () => void }) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-semibold">{tpl.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Survey preview */}
        <div className="overflow-y-auto flex-1 bg-muted/40 px-6 py-6 space-y-6">
          <h1 className="text-xl font-bold text-foreground">{tpl.name}</h1>

          {tpl.sections.map((section) => (
            section.questions.length > 0 ? (
              <div key={section.name} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  {section.name}
                </h3>
                {section.questions.map((q, i) => (
                  <TemplatePreviewQuestion key={i} question={q} />
                ))}
              </div>
            ) : null
          ))}

          {tpl.questions.length > 0 && (
            <div className="space-y-4">
              {tpl.questions.map((q, i) => (
                <TemplatePreviewQuestion key={i} question={q} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
            {t.common.close}
          </button>
          <button onClick={onUse} className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            {t.ankiety.useTemplate}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TemplatesTab({ customTemplates: initial, clients }: Props) {
  const t = useT();
  const router = useRouter();
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(initial);
  const [useDialog, setUseDialog] = useState<{ type: "builtin"; templateId: string; name: string } | { type: "custom"; survey: CustomTemplate } | null>(null);
  const [previewTpl, setPreviewTpl] = useState<SurveyTemplate | null>(null);

  // Create a new blank custom template
  async function handleNewTemplate() {
    const name = t.ankiety.newTemplate;
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isTemplate: true }),
    });
    if (!res.ok) { toast.error(t.ankiety.createTemplateError); return; }
    const survey = await res.json();
    router.push(`/ankiety/${survey.id}/edytuj`);
  }

  // Use built-in template: create survey → apply template
  async function handleUseBuiltin(name: string, assignedClientId: string, templateId: string) {
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, assignedClientId: assignedClientId || null }),
    });
    if (!res.ok) { toast.error(t.ankiety.createSurveyError); return; }
    const survey = await res.json();

    await fetch(`/api/surveys/${survey.id}/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });

    toast.success(t.ankiety.surveyCreated);
    router.push(`/ankiety/${survey.id}/edytuj`);
    setUseDialog(null);
  }

  // Use custom template: duplicate
  async function handleUseCustom(name: string, assignedClientId: string, templateId: string) {
    const res = await fetch(`/api/surveys/${templateId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, assignedClientId: assignedClientId || null }),
    });
    if (!res.ok) { toast.error(t.ankiety.createSurveyError); return; }
    const survey = await res.json();
    toast.success(t.ankiety.surveyCreated);
    router.push(`/ankiety/${survey.id}/edytuj`);
    setUseDialog(null);
  }

  async function handleDeleteCustom(template: CustomTemplate) {
    if (!confirm(t.ankiety.deleteTemplateConfirm.replace("{name}", template.name))) return;
    const res = await fetch(`/api/surveys/${template.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? t.ankiety.deleteTemplateError);
      return;
    }
    setCustomTemplates((prev) => prev.filter((tpl) => tpl.id !== template.id));
    toast.success(t.ankiety.templateDeleted);
  }

  const totalQuestions = (t: (typeof surveyTemplates)[0]) => {
    const inSections = t.sections.reduce((acc, s) => acc + s.questions.length, 0);
    return inSections + t.questions.length;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Built-in templates */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">{t.ankiety.builtinTemplatesTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveyTemplates.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 space-y-3 flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalQuestions(tpl)} {t.ankiety.questionsCount} · {tpl.sections.length} {t.ankiety.sectionsCount}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tpl.description}</p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setPreviewTpl(tpl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Eye size={13} />
                  {t.ankiety.preview}
                </button>
                <button
                  onClick={() => setUseDialog({ type: "builtin", templateId: tpl.id, name: tpl.name })}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t.ankiety.useTemplate}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom templates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t.ankiety.myTemplatesTitle}</h2>
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Plus size={14} />
            {t.ankiety.newTemplate}
          </button>
        </div>

        {customTemplates.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t.ankiety.noCustomTemplates}</p>
            <button onClick={handleNewTemplate} className="text-sm text-primary hover:underline">
              {t.ankiety.createFirstTemplate}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((tpl) => (
              <div key={tpl.id} className="bg-card border border-border rounded-xl p-5 space-y-3 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tpl._count.questions} {t.ankiety.questionsCount}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`/ankiety/${tpl.id}/edytuj`}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title={t.common.edit}
                    >
                      <Edit2 size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteCustom(tpl)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-colors"
                      title={t.common.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => setUseDialog({ type: "custom", survey: tpl })}
                  className="w-full py-2 text-xs font-medium border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                >
                  {t.ankiety.useTemplate}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Template preview */}
      {previewTpl && (
        <TemplatePreview
          tpl={previewTpl}
          onClose={() => setPreviewTpl(null)}
          onUse={() => {
            setUseDialog({ type: "builtin", templateId: previewTpl.id, name: previewTpl.name });
            setPreviewTpl(null);
          }}
        />
      )}

      {/* Dialog */}
      {useDialog && (
        <UseTemplateDialog
          templateName={useDialog.type === "builtin" ? useDialog.name : useDialog.survey.name}
          clients={clients}
          onClose={() => setUseDialog(null)}
          onConfirm={async (name, assignedClientId) => {
            if (useDialog.type === "builtin") {
              await handleUseBuiltin(name, assignedClientId, useDialog.templateId);
            } else {
              await handleUseCustom(name, assignedClientId, useDialog.survey.id);
            }
          }}
        />
      )}
    </div>
  );
}
