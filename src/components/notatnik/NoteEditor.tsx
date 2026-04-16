"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing-client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Paperclip,
  Loader2,
  PenLine,
} from "lucide-react";

const DrawingCanvas = lazy(() =>
  import("./DrawingCanvas").then((m) => ({ default: m.DrawingCanvas }))
);

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|svg|heif|heic)$/i;
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "image/heif", "image/heic"];

interface NoteEditorProps {
  content: string;
  contentKey: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  noteId?: string | null;
  onAttachmentAdded?: () => void;
  createdAt?: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function NoteEditor({
  content,
  contentKey,
  onChange,
  placeholder,
  autoFocus,
  noteId,
  onAttachmentAdded,
}: NoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<{ isImage: boolean; name: string } | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);

  const { startUpload, isUploading } = useUploadThing("noteAttachmentUploader", {
    onClientUploadComplete: (res) => {
      const f = res?.[0];
      if (!f || !pendingFileRef.current) return;
      const { isImage, name } = pendingFileRef.current;
      pendingFileRef.current = null;

      if (isImage) {
        editor?.chain().focus().setImage({ src: f.url, alt: name }).run();
      } else {
        fetch(`/api/notes/${noteId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, url: f.url, key: f.key }),
        }).then((r) => {
          if (r.ok) onAttachmentAdded?.();
          else toast.error("Błąd zapisywania załącznika");
        });
      }
    },
    onUploadError: () => {
      pendingFileRef.current = null;
      toast.error("Błąd przesyłania pliku");
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content,
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(content, { emitUpdate: false });
      if (autoFocus) editor.commands.focus("end");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  async function handleDrawingSave(blob: Blob, filename: string) {
    setDrawingOpen(false);
    if (!noteId) return;
    const file = new File([blob], filename, { type: "image/png" });
    pendingFileRef.current = { isImage: true, name: filename };
    startUpload([file]);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    const isImage =
      IMAGE_EXTENSIONS.test(file.name) || IMAGE_MIME_TYPES.includes(file.type);

    pendingFileRef.current = { isImage, name: file.name };
    startUpload([file]);
    e.target.value = "";
  }

  if (!editor) return null;

  const canAttach = !!noteId && !isUploading;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-border/60 flex-wrap shrink-0">
        <ToolBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Pogrubienie (Ctrl+B)"
        >
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursywa (Ctrl+I)"
        >
          <Italic size={15} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Podkreślenie (Ctrl+U)"
        >
          <UnderlineIcon size={15} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Przekreślenie"
        >
          <Strikethrough size={15} />
        </ToolBtn>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista punktowana"
        >
          <List size={15} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerowana"
        >
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklista"
        >
          <ListChecks size={15} />
        </ToolBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Drawing */}
        <button
          type="button"
          title={noteId ? "Dodaj rysunek (rysik / mysz)" : "Zapisz notatkę, aby dodać rysunek"}
          disabled={!canAttach}
          onClick={() => setDrawingOpen(true)}
          className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PenLine size={15} />
        </button>

        {/* File attachment */}
        <button
          type="button"
          title={noteId ? "Załącz plik" : "Zapisz notatkę, aby załączyć plik"}
          disabled={!canAttach}
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
          accept=".jpg,.jpeg,.png,.svg,.heif,.heic,.pdf,.csv,.xlsx,.xls,.doc,.docx,.mp4,.mov,.avi,.mkv"
        />
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="note-editor flex-1 overflow-y-auto px-6 py-4"
      />

      {/* Drawing canvas modal */}
      {drawingOpen && (
        <Suspense fallback={null}>
          <DrawingCanvas
            onSave={handleDrawingSave}
            onClose={() => setDrawingOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
