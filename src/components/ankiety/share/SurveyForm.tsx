"use client";

import { useState, useEffect, useRef } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import type { SurveyQuestion, SurveySection } from "../SurveyEditor";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface Answer {
  id: string;
  questionId: string;
  value: unknown;
}

interface Props {
  token: string;
  survey: {
    id: string;
    name: string;
    sections: SurveySection[];
    questions: SurveyQuestion[];
  };
  responseId: string;
  existingAnswers: Answer[];
  readOnly?: boolean;
  onRegisterSave?: (fn: () => Promise<void>) => void;
  onSubmitted?: () => void;
}

type Attachment = { url: string; name: string };

function unwrapAnswer(value: unknown): { answer: unknown; attachments: Attachment[] } {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && "attachments" in (value as object)) {
    const v = value as { answer?: unknown; attachments: Attachment[] };
    return { answer: v.answer ?? null, attachments: v.attachments ?? [] };
  }
  return { answer: value, attachments: [] };
}

function initAnswers(questions: SurveyQuestion[], existing: Answer[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const q of questions) {
    const found = existing.find((a) => a.questionId === q.id);
    map[q.id] = found ? unwrapAnswer(found.value).answer : null;
  }
  return map;
}

function initAttachments(questions: SurveyQuestion[], existing: Answer[]): Record<string, Attachment[]> {
  const map: Record<string, Attachment[]> = {};
  for (const q of questions) {
    const found = existing.find((a) => a.questionId === q.id);
    map[q.id] = found ? unwrapAnswer(found.value).attachments : [];
  }
  return map;
}

export default function SurveyForm({ token, survey, responseId, existingAnswers, readOnly = false, onRegisterSave, onSubmitted }: Props) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    () => initAnswers(survey.questions, existingAnswers)
  );
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>(
    () => initAttachments(survey.questions, existingAnswers)
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(answers);
  const pendingAttachmentsRef = useRef(attachments);

  // Keep refs updated for auto-save / unmount-save closures
  useEffect(() => { pendingRef.current = answers; }, [answers]);
  useEffect(() => { pendingAttachmentsRef.current = attachments; }, [attachments]);

  // Save on unmount (captures latest answers via refs)
  useEffect(() => {
    if (readOnly) return;
    return () => {
      const ans = pendingRef.current;
      const atts = pendingAttachmentsRef.current;
      const payload = Object.entries(ans)
        .filter(([questionId, v]) => {
          const hasAnswer = v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
          const hasFiles = (atts[questionId]?.length ?? 0) > 0;
          return hasAnswer || hasFiles;
        })
        .map(([questionId, value]) => {
          const files = atts[questionId] ?? [];
          if (files.length > 0) return { questionId, value: { answer: value, attachments: files } };
          return { questionId, value };
        });
      if (payload.length === 0) return;
      fetch(`/api/share/survey/${token}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, answers: payload }),
      }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, responseId, readOnly]);

  // Register explicit save function for parent to call before navigation
  useEffect(() => {
    if (readOnly || !onRegisterSave) return;
    onRegisterSave(async () => {
      const ans = pendingRef.current;
      const atts = pendingAttachmentsRef.current;
      const payload = Object.entries(ans)
        .filter(([questionId, v]) => {
          const hasAnswer = v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
          const hasFiles = (atts[questionId]?.length ?? 0) > 0;
          return hasAnswer || hasFiles;
        })
        .map(([questionId, value]) => {
          const files = atts[questionId] ?? [];
          if (files.length > 0) return { questionId, value: { answer: value, attachments: files } };
          return { questionId, value };
        });
      if (payload.length === 0) return;
      await fetch(`/api/share/survey/${token}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, answers: payload }),
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, responseId, readOnly]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (readOnly) return;
    autoSaveTimer.current = setInterval(() => {
      const payload = buildPayload(pendingRef.current);
      if (payload.length === 0) return;
      fetch(`/api/share/survey/${token}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, answers: payload }),
      }).catch(() => {});
    }, 30000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, responseId]);

  function buildPayload(ans: Record<string, unknown>) {
    return Object.entries(ans)
      .filter(([questionId, v]) => {
        const hasAnswer = v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
        const hasFiles = (attachments[questionId]?.length ?? 0) > 0;
        return hasAnswer || hasFiles;
      })
      .map(([questionId, value]) => {
        const files = attachments[questionId] ?? [];
        if (files.length > 0) {
          return { questionId, value: { answer: value, attachments: files } };
        }
        return { questionId, value };
      });
  }

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const q of survey.questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      const isEmpty = val === null || val === undefined || val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) errs[q.id] = t.ankiety.requiredError;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function hasUnansweredQuestions(): boolean {
    return survey.questions.some((q) => {
      const v = answers[q.id];
      return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    });
  }

  async function doSubmit() {
    if (!validate()) {
      const firstErrId = survey.questions.find((q) => q.required && (() => {
        const v = answers[q.id];
        return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      })())?.id;
      if (firstErrId) {
        document.getElementById(`q-${firstErrId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/survey/${token}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, answers: buildPayload(answers) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? t.ankiety.submitError);
        return;
      }
      setSubmitted(true);
      onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (hasUnansweredQuestions()) {
      setShowIncompleteConfirm(true);
      return;
    }
    doSubmit();
  }

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold">{t.ankiety.thankYou}</h2>
        <p className="text-sm text-muted-foreground">{t.ankiety.thankYouDesc}</p>
      </div>
    );
  }

  // Render questions — all at once (no pagination in this version)
  const required = survey.questions.filter((q) => q.required).length;
  const answered = survey.questions.filter((q) => {
    const v = answers[q.id];
    return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = survey.questions.length > 0
    ? Math.round((answered / survey.questions.length) * 100)
    : 0;

  // Group by section
  const sectionedQuestions = survey.sections.map((s) => ({
    section: s,
    questions: survey.questions.filter((q) => q.sectionId === s.id),
  }));
  const unsectioned = survey.questions.filter((q) => !q.sectionId);

  return (
    <>
    {showIncompleteConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowIncompleteConfirm(false)}>
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-base">{t.ankiety.notAllAnswered}</h3>
          <p className="text-sm text-muted-foreground">
            {t.ankiety.incompleteConfirmMsg}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowIncompleteConfirm(false)}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={() => { setShowIncompleteConfirm(false); doSubmit(); }}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {t.ankiety.sendAnyway}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="space-y-6">
      {/* Progress */}
      {survey.questions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{answered} / {survey.questions.length} {t.ankiety.progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Sectioned questions */}
      {sectionedQuestions.map(({ section, questions }) => (
        questions.length > 0 && (
          <div key={section.id} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
              {section.name}
            </h3>
            {questions.map((q) => (
              <QuestionInput
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
                error={errors[q.id]}
                token={token}
                attachments={attachments[q.id] ?? []}
                onAttachmentsChange={(files) => setAttachments((prev) => ({ ...prev, [q.id]: files }))}
                readOnly={readOnly}
              />
            ))}
          </div>
        )
      ))}

      {/* Unsectioned questions */}
      {unsectioned.length > 0 && (
        <div className="space-y-4">
          {unsectioned.map((q) => (
            <QuestionInput
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
              error={errors[q.id]}
              token={token}
              attachments={attachments[q.id] ?? []}
              onAttachmentsChange={(files) => setAttachments((prev) => ({ ...prev, [q.id]: files }))}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {required > 0 && (
        <p className="text-xs text-muted-foreground">{t.ankiety.requiredMark}</p>
      )}

      {!readOnly && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t.ankiety.submitting : t.ankiety.submit}
        </button>
      )}
    </div>
    </>
  );
}

// ── Question Input ─────────────────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
  error,
  token,
  attachments,
  onAttachmentsChange,
  readOnly = false,
}: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  token: string;
  attachments: Attachment[];
  onAttachmentsChange: (files: Attachment[]) => void;
  readOnly?: boolean;
}) {
  const t = useT();
  const rawConfig = (question.config ?? {}) as Record<string, number | boolean>;
  const config = {
    ...rawConfig,
    min: Number(rawConfig.min ?? 0),
    max: Number(rawConfig.max ?? 200000),
    step: Number(rawConfig.step ?? 1000),
    allowAttachments: !!rawConfig.allowAttachments,
  };

  return (
    <div id={`q-${question.id}`} className="bg-card border border-border rounded-xl p-5 space-y-3">
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
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-default"
          placeholder={t.ankiety.yourAnswerPlaceholder}
        />
      )}

      {question.type === "long_text" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-60 disabled:cursor-default"
          placeholder={t.ankiety.yourAnswerPlaceholder}
        />
      )}

      {question.type === "single_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className={`flex items-center gap-3 ${readOnly ? "cursor-default" : "cursor-pointer group"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                value === opt ? "border-primary bg-primary" : "border-border" + (readOnly ? "" : " group-hover:border-primary/50")
              }`}>
                {value === opt && <div className="w-full h-full rounded-full bg-white scale-50 transform" />}
              </div>
              <span className="text-sm" onClick={() => !readOnly && onChange(opt)}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt);
            return (
              <label key={opt} className={`flex items-center gap-3 ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={readOnly}
                  onChange={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    onChange(selected ? current.filter((v) => v !== opt) : [...current, opt]);
                  }}
                  className="w-4 h-4 rounded border-border accent-primary disabled:opacity-60"
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === "rating" && (
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from(
            { length: (config.max ?? 5) - (config.min ?? 1) + 1 },
            (_, i) => (config.min ?? 1) + i
          ).map((n) => (
            <button
              key={n}
              onClick={() => !readOnly && onChange(n)}
              disabled={readOnly}
              className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${
                value === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border" + (readOnly ? " opacity-50" : " hover:border-primary/50 hover:bg-muted")
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "yes_no" && (
        <div className="flex items-center gap-3">
          {[t.ankiety.yesLabel, t.ankiety.noLabel].map((opt) => (
            <button
              key={opt}
              onClick={() => !readOnly && onChange(opt)}
              disabled={readOnly}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border" + (readOnly ? " opacity-50" : " hover:border-primary/50 hover:bg-muted")
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "budget_range" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{(config.min ?? 0).toLocaleString()} zł</span>
            <span className="font-semibold text-primary">
              {typeof value === "number" ? value.toLocaleString() : (config.min ?? 0).toLocaleString()} zł
            </span>
            <span className="text-muted-foreground">{(config.max ?? 200000).toLocaleString()} zł</span>
          </div>
          <input
            type="range"
            min={config.min ?? 0}
            max={config.max ?? 200000}
            step={config.step ?? 1000}
            value={typeof value === "number" ? value : (config.min ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={readOnly}
            className="w-full accent-primary disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={config.min ?? 0}
              max={config.max ?? 200000}
              step={config.step ?? 1000}
              value={typeof value === "number" ? value : (config.min ?? 0)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!isNaN(n)) onChange(n);
              }}
              disabled={readOnly}
              className="w-36 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-default"
            />
            <span className="text-sm text-muted-foreground">zł</span>
          </div>
        </div>
      )}

      {config.allowAttachments && !readOnly && (() => {
        const maxFiles = typeof config.maxAttachments === "number" ? config.maxAttachments : null;
        const atLimit = maxFiles !== null && attachments.length >= maxFiles;
        return (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t.ankiety.attachmentsLabel}{maxFiles !== null ? ` (${t.ankiety.maxFiles}: ${maxFiles})` : ""}
            </p>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs">
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline max-w-[140px] truncate">{f.name}</a>
                    <button
                      type="button"
                      onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {!atLimit ? (
              <UploadButton<OurFileRouter, "surveyAnswerUploader">
                endpoint="surveyAnswerUploader"
                headers={{ "x-survey-token": token }}
                content={{ button: t.ankiety.addAttachments, allowedContent: "" }}
                onBeforeUploadBegin={(files) => {
                  if (maxFiles === null) return files;
                  const remaining = maxFiles - attachments.length;
                  if (files.length > remaining) {
                    toast.error(t.ankiety.canAddMoreFiles.replace("{remaining}", String(remaining)).replace("{selected}", String(files.length)).replace("{added}", String(remaining)));
                    return files.slice(0, remaining);
                  }
                  return files;
                }}
                onClientUploadComplete={(res) => {
                  onAttachmentsChange([...attachments, ...res.map((f) => ({ url: f.url, name: f.name }))]);
                }}
                appearance={{
                  button: "bg-violet-600 text-white border-0 hover:bg-violet-700 rounded-lg text-xs font-medium px-3 py-2 h-auto ut-uploading:opacity-70",
                  allowedContent: "hidden",
                  container: "flex-row",
                }}
              />
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">{t.ankiety.maxFilesReachedLabel.replace("{count}", String(maxFiles))}</p>
            )}
          </div>
        );
      })()}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
