"use client";

import { useState, useRef, useEffect } from "react";
import { X, HelpCircle, Send, Sparkles, Paperclip, Trash2, CheckCircle, ChevronDown, Maximize2 } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { useUploadThing } from "@/lib/uploadthing-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HelpWidgetProps {
  open: boolean;
  onClose: () => void;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let key = 0;

  const formatInline = (line: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      parts.push(<strong key={key++}>{match[1]}</strong>);
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      result.push(<p key={key++} className="font-semibold mt-2 mb-0.5">{line.slice(4)}</p>);
    } else if (line.startsWith("## ")) {
      result.push(<p key={key++} className="font-semibold mt-2 mb-0.5">{line.slice(3)}</p>);
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

export default function HelpWidget({ open, onClose }: HelpWidgetProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"ai" | "contact">("ai");
  const [expanded, setExpanded] = useState(false);

  // AI tab state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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
      setActiveTab("ai");
      setHelpSent(false);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Placeholder for assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Przepraszam, wystąpił błąd. Spróbuj ponownie." };
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
        updated[updated.length - 1] = { role: "assistant", content: "Przepraszam, wystąpił błąd. Spróbuj ponownie." };
        return updated;
      });
    } finally {
      setStreaming(false);
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
      className="fixed bottom-4 right-4 z-50 flex flex-col rounded-2xl shadow-2xl border border-border bg-card overflow-hidden transition-all duration-200"
      style={expanded ? { width: "50vw", height: "calc(100dvh - 80px)" } : { width: "380px", height: "600px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-primary" />
          <span className="font-semibold text-sm">Pomoc</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground transition-colors" title={expanded ? "Zmniejsz" : "Rozszerz"}>
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "ai"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Asystent AI
        </button>
        <button
          onClick={() => setActiveTab("contact")}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "contact"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Kontakt
        </button>
      </div>

      {/* AI Tab */}
      {activeTab === "ai" && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Asystent veedeck</p>
                  <p className="text-xs text-muted-foreground mt-1">Zadaj pytanie dotyczące obsługi platformy</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {["Jak udostępnić projekt klientowi?", "Jak dodać produkt do listy?", "Jak sprawdzić aktywność klienta?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
                      : "bg-muted text-foreground rounded-tl-sm space-y-0.5"
                  }`}
                >
                  {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                  {msg.role === "assistant" && msg.content === "" && streaming && (
                    <span className="inline-flex gap-0.5 items-center">
                      <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            <div className="flex items-end gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border focus-within:border-primary/40 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Napisz pytanie..."
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[22px] max-h-[120px] placeholder:text-muted-foreground/60 disabled:opacity-60"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="text-primary hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0 mb-0.5"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">Asystent odpowiada tylko na pytania o veedeck</p>
          </div>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === "contact" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {helpSent ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
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
            <div className="space-y-4">
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
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
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
                <label className={`flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors ${helpUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <Paperclip size={13} className="shrink-0" />
                  {helpUploading ? "Wgrywanie..." : "Dodaj załączniki (zdjęcia, wideo, dokumenty)"}
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
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
              </div>

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
          )}
        </div>
      )}
    </div>
  );
}
