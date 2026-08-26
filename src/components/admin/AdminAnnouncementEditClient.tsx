"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Send,
  Trash2,
  X,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import AnnouncementPreviewModal from "./AnnouncementPreviewModal";

type Announcement = {
  id: string;
  title: string;
  content: string;
  status: string;
  frequency: string;
  intervalDays: number | null;
  publishAt: string | Date | null;
  endAt: string | Date | null;
  recipientType: string;
  recipientIds: string[];
  _count: { dismissals: number };
};

type Designer = {
  id: string;
  email: string;
  fullName: string | null;
  name: string | null;
};

function toLocalDatetime(iso: string | Date | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminAnnouncementEditClient({
  announcement: initial,
}: {
  announcement: Announcement;
}) {
  const t = useT();
  const router = useRouter();
  const isSent = initial.status === "sent";

  const [title, setTitle] = useState(initial.title);
  const [frequency, setFrequency] = useState(initial.frequency);
  const [intervalDays, setIntervalDays] = useState(initial.intervalDays ?? 7);
  const [publishAt, setPublishAt] = useState(toLocalDatetime(initial.publishAt));
  const [endAt, setEndAt] = useState(toLocalDatetime(initial.endAt));
  const [recipientType, setRecipientType] = useState(initial.recipientType);
  const [recipientIds, setRecipientIds] = useState<string[]>(initial.recipientIds);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [designerSearch, setDesignerSearch] = useState("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: initial.content,
    editable: !isSent,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none",
      },
    },
  });

  // Load designers when recipientType is "selected"
  useEffect(() => {
    if (recipientType === "selected" && designers.length === 0) {
      fetch("/api/admin/announcements/designers")
        .then((r) => r.json())
        .then(setDesigners)
        .catch(() => {});
    }
  }, [recipientType, designers.length]);

  const saveField = useCallback(
    (data: Record<string, unknown>) => {
      if (isSent) return;
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          await fetch(`/api/admin/announcements/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        } catch {
          // silent
        }
      }, 500);
    },
    [initial.id, isSent]
  );

  // Auto-save content on editor changes
  useEffect(() => {
    if (!editor || isSent) return;
    const handler = () => {
      saveField({ content: editor.getHTML() });
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, saveField, isSent]);

  function updateAndSave<T>(setter: (v: T) => void, field: string, value: T) {
    setter(value);
    saveField({ [field]: value });
  }

  async function handleSend() {
    if (!title.trim()) {
      toast.error(t.admin.titleRequired);
      return;
    }
    if (!editor?.getHTML() || editor.getHTML() === "<p></p>") {
      toast.error(t.admin.contentRequired);
      return;
    }

    // Save all fields first
    await fetch(`/api/admin/announcements/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: editor.getHTML(),
        frequency,
        intervalDays: frequency === "recurring" ? intervalDays : null,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
        endAt: frequency === "recurring" && endAt ? new Date(endAt).toISOString() : null,
        recipientType,
        recipientIds: recipientType === "selected" ? recipientIds : [],
      }),
    });

    setSending(true);
    try {
      const res = await fetch(`/api/admin/announcements/${initial.id}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t.admin.announcementSendError);
        return;
      }
      toast.success(t.admin.announcementSentSuccess);
      router.push("/admin/komunikaty");
      router.refresh();
    } catch {
      toast.error(t.admin.announcementSendError);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t.admin.deleteAnnouncementConfirm)) return;
    await fetch(`/api/admin/announcements/${initial.id}`, { method: "DELETE" });
    toast.success(t.admin.announcementDeleted);
    router.push("/admin/komunikaty");
    router.refresh();
  }

  function toggleDesigner(id: string) {
    const next = recipientIds.includes(id)
      ? recipientIds.filter((r) => r !== id)
      : [...recipientIds, id];
    setRecipientIds(next);
    saveField({ recipientIds: next });
  }

  function addLink() {
    const url = prompt("URL:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  const filteredDesigners = designers.filter((d) => {
    const q = designerSearch.toLowerCase();
    return (
      d.email.toLowerCase().includes(q) ||
      (d.fullName ?? "").toLowerCase().includes(q) ||
      (d.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/komunikaty")}
          className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">
            {t.admin.editAnnouncement}
          </h1>
          {isSent && (
            <p className="text-xs text-emerald-400 mt-0.5">
              {t.admin.announcementSent} · {initial._count.dismissals}{" "}
              {t.admin.dismissals.toLowerCase()}
            </p>
          )}
        </div>
        {!isSent && (
          <button
            onClick={handleDelete}
            className="p-2 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Title */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            {t.admin.announcementTitle}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateAndSave(setTitle, "title", e.target.value)}
            disabled={isSent}
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 disabled:opacity-50"
            placeholder="Tytuł komunikatu..."
          />
        </div>

        {/* Content — Tiptap editor */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            {t.admin.announcementContent}
          </label>
          {/* Toolbar */}
          {!isSent && editor && (
            <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white/[0.04] border border-white/8 border-b-0 rounded-t-lg">
              <ToolbarButton
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold size={14} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic size={14} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("underline")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon size={14} />
              </ToolbarButton>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <ToolbarButton
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List size={14} />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered size={14} />
              </ToolbarButton>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <ToolbarButton
                active={editor.isActive("link")}
                onClick={addLink}
              >
                <LinkIcon size={14} />
              </ToolbarButton>
            </div>
          )}
          <div
            className={`bg-white/[0.04] border border-white/8 ${
              !isSent && editor ? "rounded-b-lg" : "rounded-lg"
            } ${isSent ? "opacity-50" : ""}`}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Publish date */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            {t.admin.announcementPublishAt}
          </label>
          <input
            type="datetime-local"
            value={publishAt}
            onChange={(e) =>
              updateAndSave(setPublishAt, "publishAt", e.target.value)
            }
            disabled={isSent}
            className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 disabled:opacity-50 [color-scheme:dark]"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            {t.admin.announcementFrequency}
          </label>
          <div className="flex gap-2">
            <FrequencyButton
              active={frequency === "once"}
              onClick={() => updateAndSave(setFrequency, "frequency", "once")}
              disabled={isSent}
            >
              {t.admin.frequencyOnce}
            </FrequencyButton>
            <FrequencyButton
              active={frequency === "recurring"}
              onClick={() =>
                updateAndSave(setFrequency, "frequency", "recurring")
              }
              disabled={isSent}
            >
              {t.admin.frequencyRecurring}
            </FrequencyButton>
          </div>
        </div>

        {/* Interval days (recurring only) */}
        {frequency === "recurring" && (
          <>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">
                {t.admin.intervalDaysLabel}
              </label>
              <input
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) =>
                  updateAndSave(
                    setIntervalDays,
                    "intervalDays",
                    parseInt(e.target.value) || 7
                  )
                }
                disabled={isSent}
                className="w-32 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 disabled:opacity-50"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs text-white/40 mb-1.5">
                {t.admin.announcementEndAt}
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) =>
                  updateAndSave(setEndAt, "endAt", e.target.value)
                }
                disabled={isSent}
                className="bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 disabled:opacity-50 [color-scheme:dark]"
              />
            </div>
          </>
        )}

        {/* Recipients */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            {t.admin.recipientType}
          </label>
          <div className="flex gap-2 mb-3">
            <FrequencyButton
              active={recipientType === "all"}
              onClick={() =>
                updateAndSave(setRecipientType, "recipientType", "all")
              }
              disabled={isSent}
            >
              {t.admin.recipientAll}
            </FrequencyButton>
            <FrequencyButton
              active={recipientType === "selected"}
              onClick={() =>
                updateAndSave(setRecipientType, "recipientType", "selected")
              }
              disabled={isSent}
            >
              {t.admin.recipientSelected}
            </FrequencyButton>
          </div>

          {recipientType === "selected" && !isSent && (
            <div className="border border-white/8 rounded-lg overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                <Search size={14} className="text-white/20" />
                <input
                  type="text"
                  value={designerSearch}
                  onChange={(e) => setDesignerSearch(e.target.value)}
                  placeholder={t.admin.searchDesigners}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                />
              </div>
              {/* Selected pills */}
              {recipientIds.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/5">
                  {recipientIds.map((id) => {
                    const d = designers.find((dd) => dd.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs"
                      >
                        {d?.fullName ?? d?.name ?? d?.email ?? id}
                        <button
                          onClick={() => toggleDesigner(id)}
                          className="hover:text-white"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* List */}
              <div className="max-h-48 overflow-y-auto">
                {filteredDesigners.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toggleDesigner(d.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors ${
                      recipientIds.includes(d.id)
                        ? "text-blue-400"
                        : "text-white/60"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        recipientIds.includes(d.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-white/20"
                      }`}
                    >
                      {recipientIds.includes(d.id) && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">
                      {d.fullName ?? d.name ?? d.email}
                    </span>
                    {(d.fullName || d.name) && (
                      <span className="text-white/20 text-xs truncate">
                        {d.email}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview + Send buttons */}
        <div className="pt-4 border-t border-white/5 flex items-center gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/[0.1] hover:text-white/80 transition-colors"
          >
            <Eye size={15} />
            Podgląd
          </button>
          {!isSent && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              {sending ? t.admin.sending : t.admin.sendAnnouncement}
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <AnnouncementPreviewModal
          title={title}
          content={editor?.getHTML() ?? ""}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-white/40 hover:text-white/70 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function FrequencyButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 ${
        active
          ? "bg-blue-500/15 text-blue-400 font-medium"
          : "bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}
