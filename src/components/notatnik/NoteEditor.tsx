"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
} from "lucide-react";

interface NoteEditorProps {
  content: string;
  contentKey: string; // when note changes → reset editor
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
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
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
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
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Reset content when selected note changes (contentKey changes)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(content, { emitUpdate: false });
      if (autoFocus) editor.commands.focus("end");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  if (!editor) return null;

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
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="note-editor flex-1 overflow-y-auto px-6 py-4"
      />
    </div>
  );
}
