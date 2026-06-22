"use client";

import { useState } from "react";
import { Eye, ArrowLeft } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import type { SurveyQuestion, SurveySection } from "./SurveyEditor";
import { useT } from "@/lib/i18n";

interface Survey {
  id: string;
  name: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
  user: { name: string | null; clientLogoUrl: string | null };
}

export default function SurveyPreview({ survey }: { survey: Survey }) {
  const router = useRouter();
  const t = useT();

  const sectionedQuestions = survey.sections.map((s) => ({
    section: s,
    questions: survey.questions.filter((q) => q.sectionId === s.id),
  }));
  const unsectioned = survey.questions.filter((q) => !q.sectionId);

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      {/* Preview banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <Eye size={14} />
          {t.ankiety.previewBanner}
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:underline"
        >
          <ArrowLeft size={12} />
          {t.ankiety.previewBack}
        </button>
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-3">
        {survey.user.clientLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={survey.user.clientLogoUrl} alt="Logo" className="h-8 w-auto object-contain" />
        )}
        <span className="font-semibold text-sm text-foreground">{survey.user.name ?? ""}</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{survey.name}</h1>
            <p className="text-sm text-muted-foreground">{t.ankiety.previewNote}</p>
          </div>

          {/* Sectioned questions */}
          {sectionedQuestions.map(({ section, questions }) =>
            questions.length > 0 ? (
              <div key={section.id} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  {section.name}
                </h3>
                {questions.map((q) => <PreviewQuestion key={q.id} question={q} />)}
              </div>
            ) : null
          )}

          {/* Unsectioned questions */}
          {unsectioned.length > 0 && (
            <div className="space-y-4">
              {unsectioned.map((q) => <PreviewQuestion key={q.id} question={q} />)}
            </div>
          )}

          <button
            disabled
            className="w-full py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl opacity-40 cursor-not-allowed"
          >
            {t.ankiety.previewSubmit}
          </button>
        </div>
      </main>

      <footer className="py-4 flex items-center justify-center opacity-40 select-none">
        <span className="text-xs text-muted-foreground">Powered by veedeck</span>
      </footer>
    </div>
  );
}

function PreviewQuestion({ question }: { question: SurveyQuestion }) {
  const t = useT();
  const [value, setValue] = useState<unknown>(null);
  const config = (question.config ?? {}) as Record<string, number>;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
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
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={t.ankiety.answerPlaceholder}
        />
      )}

      {question.type === "long_text" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder={t.ankiety.answerPlaceholder}
        />
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
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    setValue(selected ? current.filter((v) => v !== opt) : [...current, opt]);
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
          {Array.from({ length: (config.max ?? 5) - (config.min ?? 1) + 1 }, (_, i) => (config.min ?? 1) + i).map((n) => (
            <button
              key={n}
              onClick={() => setValue(n)}
              className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-muted"}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === "yes_no" && (
        <div className="flex items-center gap-3">
          {[t.ankiety.yesOption, t.ankiety.noOption].map((opt) => (
            <button
              key={opt}
              onClick={() => setValue(opt)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${value === opt ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 hover:bg-muted"}`}
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
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}
    </div>
  );
}
