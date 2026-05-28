"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Download, Bell, User } from "@/components/ui/icons";
import type { SurveyQuestion, SurveySection } from "./SurveyEditor";

interface Answer {
  id: string;
  questionId: string;
  value: unknown;
  question: { id: string; label: string; type: string };
}

interface SurveyResponse {
  id: string;
  respondentEmail: string;
  respondentName: string | null;
  completedAt: string;
  answers: Answer[];
}

interface Props {
  survey: {
    id: string;
    name: string;
    shareToken: string;
    sections: SurveySection[];
    questions: SurveyQuestion[];
    project: { id: string; title: string } | null;
  };
}

type Tab = "agregacja" | "indywidualne";

export default function SurveyResponsesView({ survey }: Props) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("agregacja");
  const [reminding, setReminding] = useState(false);
  const [reminderEmails, setReminderEmails] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);

  useEffect(() => {
    fetch(`/api/surveys/${survey.id}/responses`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setResponses(data.responses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [survey.id]);

  async function handleRemind() {
    const emails = reminderEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
    if (emails.length === 0) { setReminderMsg("Podaj przynajmniej jeden adres email."); return; }
    setReminding(true);
    setReminderMsg("");
    try {
      const res = await fetch(`/api/surveys/${survey.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReminderMsg(data.error ?? "Nie udało się wysłać przypomnień.");
      } else {
        setReminderMsg(`Wysłano ${data.sent} przypomnienie(ń).`);
        setReminderEmails("");
      }
    } catch {
      setReminderMsg("Błąd połączenia.");
    } finally {
      setReminding(false);
    }
  }

  const totalResponses = responses.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <Link href="/ankiety" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{survey.name}</h1>
          <p className="text-xs text-muted-foreground">
            {totalResponses} {totalResponses === 1 ? "odpowiedź" : totalResponses < 5 ? "odpowiedzi" : "odpowiedzi"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/surveys/${survey.id}/export`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} />
            Eksportuj CSV
          </Link>
          <Link
            href={`/ankiety/${survey.id}/edytuj`}
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Edytuj
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {(["agregacja", "indywidualne"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "agregacja" ? "Zestawienie" : "Indywidualne"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Ładowanie...</div>
        ) : totalResponses === 0 ? (
          <EmptyState surveyId={survey.id} shareToken={survey.shareToken} />
        ) : tab === "agregacja" ? (
          <AggregationView questions={survey.questions} responses={responses} />
        ) : (
          <IndividualView
            questions={survey.questions}
            responses={responses}
            selected={selectedResponse}
            onSelect={setSelectedResponse}
          />
        )}

        {/* Reminder panel */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell size={15} />
            Wyślij przypomnienie
          </div>
          <p className="text-xs text-muted-foreground">
            Wklej adresy email (po przecinku, średniku lub nowej linii). Można wysłać raz na 24h.
          </p>
          <textarea
            value={reminderEmails}
            onChange={(e) => setReminderEmails(e.target.value)}
            rows={3}
            placeholder={"klient@email.com\ninny@email.com"}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          {reminderMsg && (
            <p className="text-xs text-muted-foreground">{reminderMsg}</p>
          )}
          <button
            onClick={handleRemind}
            disabled={reminding || !reminderEmails.trim()}
            className="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {reminding ? "Wysyłanie..." : "Wyślij przypomnienie"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ surveyId, shareToken }: { surveyId: string; shareToken: string }) {
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/survey/${shareToken}`
    : `/share/survey/${shareToken}`;

  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
      <p className="text-sm font-medium">Brak odpowiedzi</p>
      <p className="text-xs text-muted-foreground">Udostępnij ankietę, aby zbierać odpowiedzi.</p>
      <button
        onClick={() => navigator.clipboard.writeText(shareUrl)}
        className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Kopiuj link do ankiety
      </button>
    </div>
  );
}

// ── Aggregation view ─────────────────────────────────────────────────────────

function AggregationView({
  questions,
  responses,
}: {
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
}) {
  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <QuestionSummary key={q.id} question={q} responses={responses} />
      ))}
    </div>
  );
}

function QuestionSummary({ question, responses }: { question: SurveyQuestion; responses: SurveyResponse[] }) {
  const answers = responses
    .map((r) => r.answers.find((a) => a.questionId === question.id)?.value)
    .filter((v) => v !== undefined && v !== null && v !== "");

  const total = answers.length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold">{question.label}</p>
        <p className="text-xs text-muted-foreground">{total} odpowiedzi</p>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic">Brak odpowiedzi</p>
      ) : question.type === "single_choice" || question.type === "yes_no" || question.type === "multiple_choice" ? (
        <ChoiceChart answers={answers} question={question} />
      ) : question.type === "rating" ? (
        <RatingChart answers={answers} question={question} />
      ) : (
        <TextAnswers answers={answers} />
      )}
    </div>
  );
}

function ChoiceChart({ answers, question }: { answers: unknown[]; question: SurveyQuestion }) {
  const options =
    question.type === "yes_no"
      ? ["Tak", "Nie"]
      : (question.options ?? []);

  const counts: Record<string, number> = {};
  for (const opt of options) counts[opt as string] = 0;
  for (const a of answers) {
    if (Array.isArray(a)) {
      for (const v of a) { if (v in counts) counts[v]++; }
    } else if (typeof a === "string" && a in counts) {
      counts[a]++;
    }
  }

  const max = Math.max(1, ...Object.values(counts));

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const count = counts[opt as string] ?? 0;
        const pct = Math.round((count / max) * 100);
        return (
          <div key={opt as string} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span>{opt as string}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingChart({ answers, question }: { answers: unknown[]; question: SurveyQuestion }) {
  const config = (question.config ?? {}) as Record<string, number>;
  const min = config.min ?? 1;
  const max = config.max ?? 5;
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const counts: Record<number, number> = {};
  for (const n of range) counts[n] = 0;
  for (const a of answers) {
    if (typeof a === "number" && a in counts) counts[a]++;
  }
  const maxCount = Math.max(1, ...Object.values(counts));
  const avg = answers.length > 0
    ? (answers.reduce((s: number, a) => s + (typeof a === "number" ? a : 0), 0) as number) / answers.length
    : 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Średnia: <span className="font-semibold text-foreground">{avg.toFixed(1)}</span></p>
      <div className="flex items-end gap-1.5">
        {range.map((n) => {
          const count = counts[n] ?? 0;
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={n} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xs text-muted-foreground">{count}</span>
              <div className="w-full bg-muted rounded-t" style={{ height: `${Math.max(4, pct * 0.8)}px` }}>
                <div className="w-full h-full bg-primary rounded-t" />
              </div>
              <span className="text-xs">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextAnswers({ answers }: { answers: unknown[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? answers : answers.slice(0, 3);

  return (
    <div className="space-y-2">
      {visible.map((a, i) => (
        <div key={i} className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-foreground">
          {typeof a === "number" ? a.toLocaleString("pl-PL") + " zł" : String(a)}
        </div>
      ))}
      {answers.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline"
        >
          Pokaż wszystkie ({answers.length})
        </button>
      )}
    </div>
  );
}

// ── Individual responses view ────────────────────────────────────────────────

function IndividualView({
  questions,
  responses,
  selected,
  onSelect,
}: {
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  selected: SurveyResponse | null;
  onSelect: (r: SurveyResponse | null) => void;
}) {
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Powrót do listy
        </button>
        <div className="bg-card border border-border rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2">
            <User size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium">
              {selected.respondentName ?? selected.respondentEmail}
            </span>
          </div>
          {selected.respondentName && (
            <p className="text-xs text-muted-foreground pl-5">{selected.respondentEmail}</p>
          )}
          <p className="text-xs text-muted-foreground pl-5">
            {new Date(selected.completedAt).toLocaleString("pl-PL")}
          </p>
        </div>
        <div className="space-y-3">
          {questions.map((q) => {
            const answer = selected.answers.find((a) => a.questionId === q.id);
            return (
              <div key={q.id} className="bg-card border border-border rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{q.label}</p>
                <AnswerDisplay value={answer?.value} type={q.type} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {responses.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="w-full bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {r.respondentName ?? r.respondentEmail}
              </p>
              {r.respondentName && (
                <p className="text-xs text-muted-foreground truncate">{r.respondentEmail}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {new Date(r.completedAt).toLocaleDateString("pl-PL")}
          </span>
        </button>
      ))}
    </div>
  );
}

type Attachment = { url: string; name: string };

function unwrapValue(value: unknown): { answer: unknown; attachments: Attachment[] } {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && "attachments" in (value as object)) {
    const v = value as { answer?: unknown; attachments: Attachment[] };
    return { answer: v.answer ?? null, attachments: v.attachments ?? [] };
  }
  return { answer: value, attachments: [] };
}

function AnswerDisplay({ value, type }: { value: unknown; type: string }) {
  const { answer, attachments } = unwrapValue(value);

  const isEmpty = answer === null || answer === undefined || answer === "" ||
    (Array.isArray(answer) && answer.length === 0);

  return (
    <div className="space-y-2">
      {isEmpty && attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Brak odpowiedzi</p>
      ) : (
        <>
          {!isEmpty && (() => {
            if (type === "multiple_choice" && Array.isArray(answer)) {
              return (
                <div className="flex flex-wrap gap-1.5">
                  {(answer as string[]).map((v) => (
                    <span key={v} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{v}</span>
                  ))}
                </div>
              );
            }
            if (type === "budget_range" && typeof answer === "number") {
              return <p className="text-sm">{answer.toLocaleString("pl-PL")} zł</p>;
            }
            return <p className="text-sm">{String(answer)}</p>;
          })()}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((f, i) => (
                <a
                  key={i}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-lg text-xs text-primary hover:underline max-w-[200px] truncate"
                >
                  📎 {f.name}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
