"use client";

import { Archive, FolderInput, Loader2, Trash2, X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  loading: boolean;
  onArchive: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BulkActionBar({ count, loading, onArchive, onMove, onDelete, onCancel }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 text-sm">
      <span className="font-medium pr-2 border-r border-white/20 mr-1">
        {count} {count === 1 ? "plik" : count < 5 ? "pliki" : "plików"}
      </span>
      <button
        onClick={onArchive}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
        Archiwizuj
      </button>
      <button
        onClick={onMove}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        <FolderInput size={14} />
        Przenieś
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/30 text-red-300 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
        Usuń
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        className="ml-1 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  );
}
