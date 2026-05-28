"use client";

import { useState, useEffect, useRef } from "react";
import type { SurveyQuestion, SurveySection } from "../SurveyEditor";

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
}

function initAnswers(questions: SurveyQuestion[], existing: Answer[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const q of questions) {
    const found = existing.find((a) => a.questionId === q.id);
    map[q.id] = found ? found.value : null;
  }
  return map;
}

export default function SurveyForm({ token, survey, responseId, existingAnswers }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    () => initAnswers(survey.questions, existingAnswers)
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(answers);

  // Keep ref updated for auto-save closure
  useEffect(() => { pendingRef.current = answers; }, [answers]);

  // Auto-save every 30 seconds
  useEffect(() => {
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
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([questionId, value]) => ({ questionId, value }));
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
      if (isEmpty) errs[q.id] = "To pytanie jest wymagane.";
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
        alert(body.error ?? "Nie udało się wysłać ankiety.");
        return;
      }
      setSubmitted(true);
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
        <h2 className="text-xl font-bold">Dziękujemy!</h2>
        <p className="text-sm text-muted-foreground">Twoje odpowiedzi zostały zapisane. Możesz teraz zamknąć tę stronę.</p>
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
          <h3 className="font-semibold text-base">Nie wszystkie pytania wypełnione</h3>
          <p className="text-sm text-muted-foreground">
            Nie wszystkie pytania zostały uzupełnione. Czy na pewno chcesz wysłać ankietę?
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowIncompleteConfirm(false)}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={() => { setShowIncompleteConfirm(false); doSubmit(); }}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Wyślij i tak
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
            <span>{answered} / {survey.questions.length} odpowiedzi</span>
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
            />
          ))}
        </div>
      )}

      {required > 0 && (
        <p className="text-xs text-muted-foreground">* Pola wymagane</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Wysyłanie..." : "Wyślij ankietę"}
      </button>
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
}: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const config = (question.config ?? {}) as Record<string, number>;

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
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Twoja odpowiedź..."
        />
      )}

      {question.type === "long_text" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder="Twoja odpowiedź..."
        />
      )}

      {question.type === "single_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                value === opt ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
              }`}>
                {value === opt && <div className="w-full h-full rounded-full bg-white scale-50 transform" />}
              </div>
              <span className="text-sm" onClick={() => onChange(opt)}>{opt}</span>
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
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    onChange(selected ? current.filter((v) => v !== opt) : [...current, opt]);
                  }}
                  className="w-4 h-4 rounded border-border accent-primary"
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
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${
                value === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "yes_no" && (
        <div className="flex items-center gap-3">
          {["Tak", "Nie"].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50 hover:bg-muted"
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
            <span className="text-muted-foreground">{(config.min ?? 0).toLocaleString("pl-PL")} zł</span>
            <span className="font-semibold text-primary">
              {typeof value === "number" ? value.toLocaleString("pl-PL") : (config.min ?? 0).toLocaleString("pl-PL")} zł
            </span>
            <span className="text-muted-foreground">{(config.max ?? 200000).toLocaleString("pl-PL")} zł</span>
          </div>
          <input
            type="range"
            min={config.min ?? 0}
            max={config.max ?? 200000}
            step={config.step ?? 1000}
            value={typeof value === "number" ? value : (config.min ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-primary"
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
              className="w-36 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm text-muted-foreground">zł</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
