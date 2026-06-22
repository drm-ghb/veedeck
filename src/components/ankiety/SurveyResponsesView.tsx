"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Download, Bell, User, FileText, Sparkles, RefreshCw } from "@/components/ui/icons";
import type { SurveyQuestion, SurveySection } from "./SurveyEditor";
import { useT } from "@/lib/i18n";

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

type Tab = "agregacja" | "indywidualne" | "ai";

export default function SurveyResponsesView({ survey }: Props) {
  const t = useT();
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("agregacja");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiMarkdown, setAiMarkdown] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInitialized, setAiInitialized] = useState(false);
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

  useEffect(() => {
    if (tab !== "ai" || aiInitialized) return;
    setAiInitialized(true);
    setAiLoading(true);
    fetch(`/api/surveys/${survey.id}/ai-summary`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.summary) {
          setAiSummary(data.summary);
          setAiMarkdown(data.markdown ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [tab, aiInitialized, survey.id]);

  async function generateAiSummary() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/ai-summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? t.ankiety.aiSummaryError); return; }
      setAiSummary(data.summary);
      setAiMarkdown(data.markdown ?? null);
    } catch {
      setAiError(t.ankiety.serverError);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleRemind() {
    const emails = reminderEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
    if (emails.length === 0) { setReminderMsg(t.ankiety.reminderEmailRequired); return; }
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
        setReminderMsg(data.error ?? t.ankiety.reminderError);
      } else {
        setReminderMsg(`${data.sent}`);
        setReminderEmails("");
      }
    } catch {
      setReminderMsg(t.ankiety.reminderServerError);
    } finally {
      setReminding(false);
    }
  }

  const totalResponses = responses.length;

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
        <Link href="/ankiety" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{survey.name}</h1>
          <p className="text-xs text-muted-foreground">
            {totalResponses} {totalResponses === 1 ? t.ankiety.responseCountSingular : t.ankiety.responseCountPlural}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/surveys/${survey.id}/export`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} />
            {t.ankiety.exportCsv}
          </Link>
          <Link
            href={`/ankiety/${survey.id}/edytuj`}
            className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t.common.edit}
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {(["agregacja", "indywidualne", "ai"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === tabKey ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabKey === "ai" && <Sparkles size={14} />}
              {tabKey === "agregacja" ? t.ankiety.aggregationTab : tabKey === "indywidualne" ? t.ankiety.individualTab : t.ankiety.aiSummaryTab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">{t.common.loading}</div>
        ) : totalResponses === 0 ? (
          <EmptyState surveyId={survey.id} shareToken={survey.shareToken} />
        ) : tab === "agregacja" ? (
          <AggregationView questions={survey.questions} responses={responses} />
        ) : tab === "indywidualne" ? (
          <IndividualView
            questions={survey.questions}
            responses={responses}
            selected={selectedResponse}
            onSelect={setSelectedResponse}
          />
        ) : (
          <AiSummaryView
            key={aiSummary ? "ai-content" : "ai-empty"}
            surveyId={survey.id}
            surveyName={survey.name}
            summary={aiSummary}
            markdown={aiMarkdown}
            loading={aiLoading}
            error={aiError}
            onGenerate={generateAiSummary}
          />
        )}

        {/* Reminder panel — hidden when survey has been completed and on AI tab */}
        {tab !== "ai" && !responses.some(r => r.completedAt) && <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell size={15} />
            {t.ankiety.sendReminders}
          </div>
          <p className="text-xs text-muted-foreground">
            {t.ankiety.reminderDesc}
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
            {reminding ? t.ankiety.sendingReminders : t.ankiety.sendReminders}
          </button>
        </div>}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ surveyId, shareToken }: { surveyId: string; shareToken: string }) {
  const t = useT();
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/survey/${shareToken}`
    : `/share/survey/${shareToken}`;

  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
      <p className="text-sm font-medium">{t.ankiety.noResponses}</p>
      <p className="text-xs text-muted-foreground">{t.ankiety.noResponsesHint}</p>
      <button
        onClick={() => navigator.clipboard.writeText(shareUrl)}
        className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
      >
        {t.ankiety.copyLinkSurvey}
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
  const t = useT();
  const answers = responses
    .map((r) => r.answers.find((a) => a.questionId === question.id)?.value)
    .filter((v) => v !== undefined && v !== null && v !== "");

  const total = answers.length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold">{question.label}</p>
        <p className="text-xs text-muted-foreground">{total} {total === 1 ? t.ankiety.responseCountSingular : t.ankiety.responseCountPlural}</p>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t.ankiety.noResponses}</p>
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
  const t = useT();
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
      <p className="text-xs text-muted-foreground">{t.ankiety.avgRating} <span className="font-semibold text-foreground">{avg.toFixed(1)}</span></p>
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

function isImage(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
}

function AttachmentsGrid({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {attachments.map((f, i) => (
        <a
          key={i}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          download={f.name}
          className="group relative block rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
          title={f.name}
        >
          {isImage(f.name) ? (
            <div className="w-20 h-20 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Download size={16} className="text-white" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 transition-colors">
              <FileText size={12} className="text-muted-foreground flex-shrink-0" />
              <span className="text-xs max-w-[140px] truncate">{f.name}</span>
              <Download size={11} className="text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function TextAnswers({ answers }: { answers: unknown[] }) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  const unwrapped = answers.map((a) => unwrapValue(a));
  const textAnswers = unwrapped.filter(
    (u) => u.answer !== null && u.answer !== undefined && u.answer !== "" && !(Array.isArray(u.answer) && u.answer.length === 0)
  );
  const allAttachments = unwrapped.flatMap((u) => u.attachments);

  const visible = showAll ? textAnswers : textAnswers.slice(0, 3);

  return (
    <div className="space-y-2">
      {visible.map((u, i) => (
        <div key={i} className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-foreground">
          {typeof u.answer === "number" ? u.answer.toLocaleString("pl-PL") + " zł" : String(u.answer)}
        </div>
      ))}
      {textAnswers.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline"
        >
          {t.ankiety.showAll} ({textAnswers.length})
        </button>
      )}
      {allAttachments.length > 0 && (
        <AttachmentsGrid attachments={allAttachments} />
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
  const t = useT();
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          {t.ankiety.backToList}
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
            {new Date(selected.completedAt).toLocaleString()}
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
            {new Date(r.completedAt).toLocaleDateString()}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderMarkdown(md: string): string {
  const out: string[] = [];
  let inUl = false;
  let inTable = false;
  let tableHead = true;
  let prevWasEmpty = false;

  const closeBlocks = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inTable) { out.push("</tbody></table></div>"); inTable = false; }
  };

  for (const raw of md.split("\n")) {
    // Table row
    if (raw.startsWith("|")) {
      prevWasEmpty = false;
      if (!inTable) {
        if (inUl) { out.push("</ul>"); inUl = false; }
        out.push('<div class="overflow-x-auto my-4 rounded-lg border border-border"><table class="w-full text-sm border-collapse">');
        inTable = true;
        tableHead = true;
      }
      const cells = raw.split("|").slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        out.push("</thead><tbody>");
        tableHead = false;
        continue;
      }
      if (tableHead) {
        out.push(`<thead><tr>${cells.map(c => `<th class="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground bg-muted/50">${inline(esc(c))}</th>`).join("")}</tr>`);
      } else {
        out.push(`<tr class="border-t border-border hover:bg-muted/20 transition-colors">${cells.map(c => `<td class="px-4 py-2.5 text-sm">${inline(esc(c))}</td>`).join("")}</tr>`);
      }
      continue;
    }
    if (inTable) { out.push("</tbody></table></div>"); inTable = false; }

    // List item
    if (/^[*\-] /.test(raw)) {
      prevWasEmpty = false;
      if (!inUl) { out.push('<ul class="my-2 space-y-1 pl-1">'); inUl = true; }
      out.push(`<li class="flex gap-2 text-sm leading-relaxed"><span class="text-violet-500 font-bold mt-0.5 flex-shrink-0">•</span><span>${inline(esc(raw.slice(2)))}</span></li>`);
      continue;
    }
    if (inUl) { out.push("</ul>"); inUl = false; }

    // Empty line — collapse multiple blank lines into one
    if (!raw.trim()) {
      if (!prevWasEmpty) { out.push('<div class="h-2"/>'); prevWasEmpty = true; }
      continue;
    }
    prevWasEmpty = false;

    // Headings — h1 is the document title; h2 is section header; h3 is sub-header
    if (raw.startsWith("### ")) { out.push(`<h3 class="text-sm font-semibold mt-4 mb-1 text-foreground">${inline(esc(raw.slice(4)))}</h3>`); continue; }
    if (raw.startsWith("## ")) { out.push(`<h2 class="text-base font-semibold mt-6 mb-2 text-foreground">${inline(esc(raw.slice(3)))}</h2>`); continue; }
    if (raw.startsWith("# ")) { out.push(`<h1 class="text-xl font-bold mb-0.5 text-foreground">${inline(esc(raw.slice(2)))}</h1>`); continue; }

    // HR — no visible line, just spacing
    if (/^---+$/.test(raw.trim())) { out.push('<div class="h-2"/>'); continue; }

    // Blockquote
    if (raw.startsWith("> ")) {
      out.push(`<blockquote class="pl-4 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-r-lg py-2.5 pr-4 my-3 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">${inline(esc(raw.slice(2)))}</blockquote>`);
      continue;
    }

    // Paragraph
    out.push(`<p class="text-sm leading-relaxed my-1">${inline(esc(raw))}</p>`);
  }

  closeBlocks();
  return out.join("\n");
}

function printSummaryAsPdf(summary: string, surveyName: string) {
  const html = renderMarkdown(summary);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Podsumowanie AI — ${esc(surveyName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 32px; color: #111; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 1.35rem; font-weight: 700; margin: 0 0 4px; }
    h2 { font-size: 1.05rem; font-weight: 600; margin: 28px 0 8px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    h3 { font-size: 0.9rem; font-weight: 600; margin: 16px 0 4px; }
    p { margin: 4px 0; }
    ul { margin: 6px 0; padding: 0; list-style: none; }
    li { display: flex; gap: 8px; margin-bottom: 4px; }
    li span:first-child { color: #7c3aed; font-weight: 700; flex-shrink: 0; }
    blockquote { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 10px 14px; margin: 12px 0; border-radius: 0 6px 6px 0; color: #78350f; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { text-align: left; padding: 8px 12px; font-size: 0.8rem; font-weight: 600; color: #6b7280; background: #f9fafb; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    .h-2 { height: 6px; }
    @media print { body { margin: 20px 32px; } @page { margin: 2cm; } }
  </style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ── AI Summary view ──────────────────────────────────────────────────────────

function AiSummaryView({
  surveyId,
  surveyName,
  summary,
  markdown,
  loading,
  error,
  onGenerate,
}: {
  surveyId: string;
  surveyName: string;
  summary: string | null;
  markdown: string | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const t = useT();
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Sparkles size={20} className="text-violet-600 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-medium">{t.ankiety.aiAnalyzing}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.ankiety.aiAnalyzingDesc}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Sparkles size={22} className="text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold">{t.ankiety.aiSummaryTab}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t.ankiety.aiSummaryDesc}
          </p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Sparkles size={15} />
          {t.ankiety.generateSummary}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 pb-10 md:p-8 md:pb-12 space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
          <Sparkles size={15} />
          {t.ankiety.aiSummaryTab}
        </div>
        <div className="flex items-center gap-2">
          {markdown && (
            <button
              onClick={() => {
                const blob = new Blob([markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ankieta-odpowiedzi-${surveyId}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Download size={12} />
              {t.ankiety.downloadMd}
            </button>
          )}
          {summary && (
            <button
              onClick={() => printSummaryAsPdf(summary, surveyName)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Download size={12} />
              {t.ankiety.downloadPdf}
            </button>
          )}
          <button
            onClick={onGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={12} />
            {t.ankiety.regenerateSummary}
          </button>
        </div>
      </div>
      <div className="border-t border-border" />
      {/* Content */}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }} />
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
  const t = useT();
  const { answer, attachments } = unwrapValue(value);

  const isEmpty = answer === null || answer === undefined || answer === "" ||
    (Array.isArray(answer) && answer.length === 0);

  return (
    <div className="space-y-2">
      {isEmpty && attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t.ankiety.noResponses}</p>
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
            <AttachmentsGrid attachments={attachments} />
          )}
        </>
      )}
    </div>
  );
}
