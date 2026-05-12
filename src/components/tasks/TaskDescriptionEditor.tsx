"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered } from "@/components/ui/icons";

interface TaskDescriptionEditorProps {
  content: string;
  contentKey: string;
  onChange: (html: string) => void;
  onBlur: () => void;
  placeholder?: string;
}

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function TaskDescriptionEditor({
  content,
  contentKey,
  onChange,
  onBlur,
  placeholder,
}: TaskDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? "Dodaj opis..." }),
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onBlur() {
      onBlur();
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/30">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Pogrubienie (Ctrl+B)">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursywa (Ctrl+I)">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Podkreślenie (Ctrl+U)">
          <UnderlineIcon size={13} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Przekreślenie">
          <Strikethrough size={13} />
        </ToolBtn>
        <div className="w-px h-3.5 bg-border mx-0.5" />
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista punktowana">
          <List size={13} />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerowana">
          <ListOrdered size={13} />
        </ToolBtn>
      </div>
      <EditorContent
        editor={editor}
        className="task-description-editor px-3 py-2 text-sm min-h-[80px] max-h-[240px] overflow-y-auto"
      />
    </div>
  );
}
