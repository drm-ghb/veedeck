"use client";

import { useState, useRef, useEffect } from "react";
import { X, HelpCircle, Sparkles, Paperclip, Trash2, CheckCircle, ChevronDown, Maximize2, RotateCcw, ArrowUp, Share2, Activity, BarChart2, AddShoppingCart } from "@/components/ui/icons";
import { useT, useLang } from "@/lib/i18n";
import { useUploadThing } from "@/lib/uploadthing-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HelpWidgetProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "knowledge" | "ai" | "contact";
  initialCategory?: string;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let key = 0;

  const formatInline = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\[(.+?)\]\(([^)]+)\)/g;
    let last = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      if (match[1] !== undefined) {
        parts.push(<strong key={key++}>{match[1]}</strong>);
      } else {
        parts.push(
          <a key={key++} href={match[3]} className="text-primary underline underline-offset-2 hover:opacity-75 transition-opacity">
            {match[2]}
          </a>
        );
      }
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      result.push(<p key={key++} className="font-semibold mt-2 mb-0.5">{formatInline(line.slice(4))}</p>);
    } else if (line.startsWith("## ")) {
      result.push(<p key={key++} className="font-semibold mt-2 mb-0.5">{formatInline(line.slice(3))}</p>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      result.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)![1];
      result.push(
        <div key={key++} className="flex gap-1.5 items-start">
          <span className="shrink-0 opacity-60 tabular-nums">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      if (i > 0 && lines[i - 1].trim() !== "") result.push(<div key={key++} className="h-1.5" />);
    } else {
      result.push(<p key={key++}>{formatInline(line)}</p>);
    }
  }
  return result;
}

export default function HelpWidget({ open, onClose, initialTab, initialCategory }: HelpWidgetProps) {
  const t = useT();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<"knowledge" | "ai" | "contact">("knowledge");
  const [expanded, setExpanded] = useState(false);

  // AI tab state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showBetaDialog, setShowBetaDialog] = useState(false);
  const [limitResetAt, setLimitResetAt] = useState<string | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Contact tab state
  const [helpCategory, setHelpCategory] = useState("");
  const [helpCategoryOpen, setHelpCategoryOpen] = useState(false);
  const helpCategoryRef = useRef<HTMLDivElement>(null);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [helpAttachments, setHelpAttachments] = useState<{ url: string; name: string }[]>([]);
  const [helpUploading, setHelpUploading] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const { startUpload } = useUploadThing("helpAttachmentUploader");

  useEffect(() => {
    if (!helpCategoryOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (helpCategoryRef.current && !helpCategoryRef.current.contains(e.target as Node)) {
        setHelpCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [helpCategoryOpen]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab ?? "knowledge");
      setHelpSent(false);
      setHelpCategory(initialCategory ?? "");
    }
  }, [open, initialTab, initialCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "ai") return;
    if (!localStorage.getItem("veedeck-ai-beta-seen")) setShowBetaDialog(true);
    fetch("/api/ai-assistant")
      .then((r) => r.json())
      .then((d) => {
        setAiRemaining(d.remaining ?? null);
        if (d.resetAt) setLimitResetAt(d.resetAt);
      })
      .catch(() => {});
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setStreaming(true);

    // Placeholder for assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, locale: lang }),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        if (data.resetAt) setLimitResetAt(data.resetAt);
        setAiRemaining(0);
        setMessages((prev) => prev.slice(0, -1)); // remove empty placeholder
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: t.nav.aiError };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const current = accumulated;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: current };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: t.nav.aiError };
        return updated;
      });
    } finally {
      setStreaming(false);
      setAiRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex flex-col shadow-2xl bg-card overflow-hidden transition-all duration-200 inset-0 rounded-none border-0 sm:inset-auto sm:border sm:border-border sm:bottom-4 sm:right-4 sm:w-[380px] sm:h-[660px] sm:rounded-2xl"
      style={expanded ? { width: "50vw", height: "calc(100dvh - 80px)", borderRadius: "1rem" } : undefined}
    >
      {/* Header — hidden when AI tab (AI tab has its own gradient header) */}
      {activeTab !== "ai" && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-primary" />
            <span className="font-semibold text-sm">{t.nav.help}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground transition-colors" title={expanded ? t.nav.aiShrink : t.nav.aiExpand}>
              <Maximize2 size={14} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs — only for Pomoc mode (knowledge + contact) */}
      {activeTab !== "ai" && (
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "knowledge"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nav.aiKnowledgeBase}
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "contact"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nav.aiContact}
          </button>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === "knowledge" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 py-5 gap-4">
          <p className="text-sm text-muted-foreground">{lang === "pl" ? "Znajdź odpowiedzi na najczęstsze pytania dotyczące obsługi platformy." : "Find answers to frequently asked questions about the platform."}</p>
          <a
            href={lang === "pl" ? "https://veedeck.com/pomoc/dla-projektantow/" : "https://veedeck.com/en/help/for-designers/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.nav.aiHelpDesigners}</p>
              <p className="text-xs text-muted-foreground truncate">{lang === "pl" ? "veedeck.com/pomoc/dla-projektantow" : "veedeck.com/en/help/for-designers"}</p>
            </div>
            <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === "ai" && (
        <div className="flex flex-col flex-1 min-h-0 relative bg-background">
          {/* Gradient Header */}
          <div
            className="relative overflow-hidden shrink-0"
            style={{ background: "linear-gradient(160deg, #4F46E5 0%, #6D5FEF 55%, #8B7CF6 100%)" }}
          >
            {/* Decorative background orb */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                top: -90,
                right: -60,
                background: "radial-gradient(circle, rgba(255,255,255,.28), transparent 70%)",
              }}
            />

            {/* Thin bar — always visible */}
            <div className="relative flex items-center justify-between h-[52px] px-5 sm:px-6">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={20}
                  style={{ color: "#fff", opacity: messages.length > 0 ? 1 : 0, transition: "opacity 200ms" }}
                />
                <span
                  className="font-semibold text-white transition-opacity duration-200"
                  style={{ fontSize: 15, opacity: messages.length > 0 ? 1 : 0 }}
                >
                  {t.nav.aiTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="transition-opacity hover:opacity-100"
                    style={{ color: "rgba(255,255,255,.8)", opacity: 0.8 }}
                    title={t.nav.aiResetTooltip}
                  >
                    <RotateCcw size={20} />
                  </button>
                )}
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="transition-opacity hover:opacity-100"
                  style={{ color: "rgba(255,255,255,.8)", opacity: 0.8 }}
                  title={expanded ? t.nav.aiShrink : t.nav.aiExpand}
                >
                  <Maximize2 size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="transition-opacity hover:opacity-100"
                  style={{ color: "rgba(255,255,255,.8)", opacity: 0.8 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Collapsing section — orb + title + subtitle */}
            <div
              className="overflow-hidden"
              style={{
                maxHeight: messages.length > 0 ? 0 : 160,
                transition: "max-height 250ms ease",
              }}
            >
              <div className="relative px-5 pb-[22px] sm:px-6">
                {/* Orb icon */}
                <div
                  className="flex items-center justify-center mb-3.5"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "rgba(255,255,255,.16)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <Sparkles size={26} style={{ color: "#fff" }} />
                </div>
                {/* Title */}
                <p className="font-bold text-white" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
                  {t.nav.aiTitle}
                </p>
                {/* Subtitle */}
                <p className="mt-1" style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.4 }}>
                  {t.nav.aiSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Beta info dialog — shown on first open */}
          {showBetaDialog && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6">
              <div className="flex flex-col gap-4 max-w-xs text-center">
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{ width: 52, height: 52, borderRadius: 16, background: "#EEF2FF" }}
                >
                  <Sparkles size={26} style={{ color: "#4F46E5" }} />
                </div>
                <div>
                  <p className="font-semibold text-base">{t.nav.aiBetaTitle}</p>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    {t.nav.aiBetaDesc1}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: t.nav.aiBetaDesc2 }} />
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {t.nav.aiBetaDesc3}
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("veedeck-ai-beta-seen", "1");
                    setShowBetaDialog(false);
                  }}
                  className="w-full py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "#4F46E5" }}
                >
                  {t.nav.aiBetaCta}
                </button>
              </div>
            </div>
          )}

          {/* Body: suggested questions or conversation */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col" style={{ padding: "20px 22px", gap: 12 }}>
            {messages.length === 0 ? (
              <>
                {aiRemaining !== null && (
                  <span
                    className={`self-end text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      aiRemaining === 0
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {aiRemaining}/10
                  </span>
                )}
                <p
                  className="text-muted-foreground font-bold uppercase"
                  style={{ fontSize: 11, letterSpacing: "0.05em", margin: "6px 0 -2px" }}
                >
                  {t.nav.aiPopularQuestions}
                </p>
                {(
                  [
                    { q: t.nav.aiSuggest1, Icon: BarChart2 },
                    { q: t.nav.aiSuggest2, Icon: Share2 },
                    { q: t.nav.aiSuggest3, Icon: AddShoppingCart },
                    { q: t.nav.aiSuggest4, Icon: Activity },
                  ] as const
                ).map(({ q, Icon }) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="flex items-center gap-2.5 text-left rounded-[14px] border border-border bg-background transition-colors"
                    style={{ padding: "12px 14px" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#4F46E5";
                      (e.currentTarget as HTMLButtonElement).style.background = "#EEF2FF";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "";
                      (e.currentTarget as HTMLButtonElement).style.background = "";
                    }}
                  >
                    <Icon size={19} style={{ color: "#4F46E5", flexShrink: 0 }} />
                    <span
                      className="font-semibold"
                      style={{ fontSize: 13, color: "#24252B", lineHeight: 1.35 }}
                    >
                      {q}
                    </span>
                  </button>
                ))}
              </>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 items-end ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 24, height: 24, borderRadius: "50%", background: "#EEF2FF", marginTop: 2 }}
                    >
                      <Sparkles size={13} style={{ color: "#4F46E5" }} />
                    </div>
                  )}
                  <div
                    className={`space-y-0.5 ${msg.role === "user" ? "whitespace-pre-wrap" : ""}`}
                    style={{
                      maxWidth: "84%",
                      padding: "11px 15px",
                      borderRadius: 16,
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      ...(msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #4F46E5, #7C6EF0)",
                            color: "#fff",
                            borderBottomRightRadius: 4,
                            alignSelf: "flex-end",
                          }
                        : {
                            background: "#EEF2FF",
                            color: "#24252B",
                            borderBottomLeftRadius: 4,
                          }),
                    }}
                  >
                    {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                    {msg.role === "assistant" && msg.content === "" && streaming && (
                      <span className="inline-flex gap-0.5 items-center">
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#4F46E5" }} />
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#4F46E5" }} />
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#4F46E5" }} />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer: hint + input */}
          <div className="shrink-0 bg-background">
            {limitResetAt ? (
              <div className="flex flex-col items-center gap-1.5 py-4 px-6 text-center">
                <p className="text-sm font-medium">{t.nav.aiLimitReached}</p>
                <p className="text-xs text-muted-foreground">
                  {t.nav.aiLimitResetPrefix}{" "}
                  <strong>
                    {new Date(limitResetAt).toLocaleTimeString(lang === "pl" ? "pl-PL" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                  {" "}
                  ({new Date(limitResetAt).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", { day: "numeric", month: "long" })})
                </p>
              </div>
            ) : (
              <>
                <p
                  className="text-center text-muted-foreground"
                  style={{ fontSize: 10.5, margin: "-12px 0 14px" }}
                >
                  {t.nav.aiScopeHint}
                </p>
                <div
                  className="flex items-center gap-2.5 focus-within:border-primary transition-colors"
                  style={{
                    margin: "0 20px 20px",
                    border: "1.5px solid #E0E7FF",
                    borderRadius: 100,
                    padding: "8px 8px 8px 18px",
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={t.nav.aiInputPlaceholder}
                    rows={1}
                    disabled={streaming}
                    className="flex-1 bg-transparent resize-none outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
                    style={{ fontSize: 13.5, minHeight: 22, maxHeight: 120 }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || streaming}
                    className="flex items-center justify-center shrink-0 transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#4F46E5",
                      opacity: !input.trim() || streaming ? 0.45 : 1,
                    }}
                  >
                    <ArrowUp size={18} style={{ color: "#fff" }} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === "contact" && (
        <div className="flex flex-col flex-1 min-h-0">
          {helpSent ? (
            <div className="flex flex-col items-center text-center py-8 gap-3 px-4">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-lg">{t.nav.helpSent}</p>
              <p className="text-sm text-muted-foreground">{t.nav.helpSentDesc}</p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {t.common.close}
              </button>
            </div>
          ) : (
            <>
              {/* Scrollable fields */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-0 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <a href="mailto:support@veedeck.com" className="text-primary font-medium hover:underline">support@veedeck.com</a>
                </div>

                <div className="relative space-y-1" ref={helpCategoryRef}>
                  <label className="text-sm font-medium">{t.nav.helpCategory}</label>
                  <button
                    type="button"
                    onClick={() => setHelpCategoryOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-left"
                  >
                    <span className={helpCategory ? "text-foreground" : "text-muted-foreground"}>
                      {helpCategory || t.nav.helpCategoryPlaceholder}
                    </span>
                    <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${helpCategoryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {helpCategoryOpen && (
                    <div className="absolute z-10 top-full left-0 w-full bg-popover border border-border rounded-lg shadow-md p-1">
                      {t.nav.helpCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setHelpCategory(cat); setHelpCategoryOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                            helpCategory === cat
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-accent text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{t.nav.helpSubject}</label>
                  <input
                    type="text"
                    value={helpSubject}
                    onChange={(e) => setHelpSubject(e.target.value)}
                    placeholder={t.nav.helpSubjectPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{t.nav.helpDescription}</label>
                  <textarea
                    value={helpDesc}
                    onChange={(e) => setHelpDesc(e.target.value)}
                    placeholder={t.nav.helpDescriptionPlaceholder}
                    className="w-full min-h-[120px] px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  {helpAttachments.length > 0 && (
                    <div className="space-y-1 max-h-[160px] overflow-y-auto">
                      {helpAttachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
                          <Paperclip size={13} className="text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate text-foreground text-xs">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => setHelpAttachments((prev) => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {helpAttachments.length < 10 && (
                    <label className={`flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors ${helpUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      <Paperclip size={13} className="shrink-0" />
                      {helpUploading ? t.nav.aiUploading : helpAttachments.length > 0 ? `${t.nav.aiAddMore} (${helpAttachments.length}/10)` : t.nav.aiAddAttachments}
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []).slice(0, 10 - helpAttachments.length);
                          if (!files.length) return;
                          setHelpUploading(true);
                          try {
                            const results = await startUpload(files);
                            if (results) {
                              setHelpAttachments((prev) => [
                                ...prev,
                                ...results.map((r, i) => ({ url: r.url, name: files[i]?.name ?? r.name ?? "plik" })),
                              ]);
                            }
                          } finally {
                            setHelpUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit — fixed at bottom */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <button
                  onClick={async () => {
                    if (!helpSubject.trim() && !helpDesc.trim()) return;
                    await fetch("/api/help-requests", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        category: helpCategory,
                        subject: helpSubject,
                        message: helpDesc,
                        attachmentUrl: helpAttachments[0]?.url ?? null,
                        attachmentName: helpAttachments[0]?.name ?? null,
                        attachments: helpAttachments.length > 0 ? helpAttachments : null,
                      }),
                    });
                    setHelpSent(true);
                  }}
                  disabled={(!helpSubject.trim() && !helpDesc.trim()) || helpUploading}
                  className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.nav.helpSend}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
