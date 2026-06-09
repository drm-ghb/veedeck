"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Edit2, SplitSquareHorizontal, Plus, Check, Loader2, Image, FileText, ChevronDown, ChevronRight } from "@/components/ui/icons";
import { toast } from "sonner";
import RenderComparePicker, { type PickerRenderItem } from "./RenderComparePicker";

interface SourceRender {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
  folder: { name: string } | null;
  room: { name: string } | null;
}

interface ComparisonItem {
  id: string;
  renderId: string;
  sourceRenderId: string;
  displayName: string | null;
  createdAt: string;
  sourceRender: SourceRender;
}

interface Props {
  renderId: string;
  isDesigner: boolean;
  shareToken?: string | null;
  clientProjectId?: string | null;
  renderName?: string;
  onClose: () => void;
  onCompare: (fileUrl: string, label: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ItemThumbnail({ src, fileType }: { src: string; fileType: string }) {
  if (fileType === "pdf") return (
    <div className="w-48 h-32 flex items-center justify-center bg-muted rounded-lg border border-border flex-shrink-0">
      <FileText size={24} className="text-red-400" />
    </div>
  );
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt="" className="w-48 h-32 object-cover rounded-lg border border-border flex-shrink-0" />
  );
}

export default function RenderComparePanel({ renderId, isDesigner, shareToken, clientProjectId, renderName, onClose, onCompare }: Props) {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [addingIds, setAddingIds] = useState<string[]>([]);

  const comparisonsUrl = isDesigner
    ? `/api/renders/${renderId}/comparisons`
    : clientProjectId
    ? `/api/client/${clientProjectId}/renders/${renderId}/comparisons`
    : `/api/share/${shareToken}/renders/${renderId}/comparisons`;

  const projectRendersUrl = isDesigner
    ? `/api/renders/${renderId}/project-renders`
    : clientProjectId
    ? `/api/client/${clientProjectId}/project-renders`
    : `/api/share/${shareToken}/project-renders`;

  useEffect(() => {
    fetch(comparisonsUrl)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [comparisonsUrl]);

  async function handleAdd(renders: PickerRenderItem[]) {
    setShowPicker(false);
    setAddingIds(renders.map((r) => r.id));
    const added: ComparisonItem[] = [];
    let failCount = 0;
    for (const render of renders) {
      try {
        const res = await fetch(`/api/renders/${renderId}/comparisons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceRenderId: render.id }),
        });
        if (res.ok) {
          const item = await res.json();
          added.push(item);
        } else {
          const err = await res.json().catch(() => ({}));
          console.error("Błąd dodawania porównania:", res.status, err);
          failCount++;
        }
      } catch (e) {
        console.error("Fetch error:", e);
        failCount++;
      }
    }
    setItems((prev) => [...prev, ...added]);
    setAddingIds([]);
    if (added.length > 0) toast.success(`Dodano ${added.length} ${added.length === 1 ? "plik" : "pliki"} do porównania`);
    if (failCount > 0) toast.error(`Nie udało się dodać ${failCount} ${failCount === 1 ? "pliku" : "plików"}`);
  }

  function startEdit(item: ComparisonItem) {
    setEditingId(item.id);
    setEditValue(item.displayName || "");
  }

  async function saveEdit(itemId: string) {
    setSavingId(itemId);
    try {
      const res = await fetch(`/api/renders/${renderId}/comparisons/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: editValue }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, displayName: editValue.trim() || null } : i));
      }
    } catch {}
    setEditingId(null);
    setSavingId(null);
  }

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/renders/${renderId}/comparisons/${itemId}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {}
    setDeletingId(null);
  }

  const hasItems = items.length > 0;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">Porównanie</h2>
              {renderName && <p className="text-xs text-muted-foreground mt-0.5">{renderName}</p>}
            </div>
            <div className="flex items-center gap-2">
              {isDesigner && (
                <button
                  onClick={() => setShowPicker(true)}
                  disabled={addingIds.length > 0}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-muted text-gray-700 dark:text-gray-300 hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  <Plus size={14} />
                  Dodaj plik
                </button>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Designer: no items yet */}
            {!loading && isDesigner && !hasItems && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <SplitSquareHorizontal size={32} className="text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground mb-1">Brak plików do porównania</p>
                <p className="text-xs text-muted-foreground">Kliknij „Dodaj plik", aby wybrać pliki z ProjectFlow</p>
              </div>
            )}

            {/* Client: no items → show picker inline */}
            {!loading && !isDesigner && !hasItems && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">Wybierz plik z ProjectFlow, aby porównać:</p>
                <ClientPickerInline
                  projectRendersUrl={projectRendersUrl}
                  excludeRenderId={renderId}
                  onCompare={(render) => {
                    onCompare(render.fileUrl, render.name);
                  }}
                />
              </div>
            )}

            {/* Items list */}
            {!loading && hasItems && (
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const label = item.displayName || item.sourceRender.name;
                  const location = [item.sourceRender.room?.name, item.sourceRender.folder?.name].filter(Boolean).join(" / ");
                  return (
                    <div key={item.id} className="group flex items-center gap-3 px-5 py-4">
                      <ItemThumbnail src={item.sourceRender.fileUrl} fileType={item.sourceRender.fileType} />

                      <div className="flex-1 min-w-0">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-0"
                            />
                            <button onClick={() => saveEdit(item.id)} disabled={!!savingId} className="text-primary hover:text-primary/80">
                              <Check size={16} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{label}</p>
                            {isDesigner && (
                              <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors">
                                <Edit2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                        {location && <p className="text-xs text-muted-foreground truncate mt-0.5"><span className="font-medium">Folder:</span> {location}</p>}
                        <p className="text-xs text-muted-foreground">
                          Dodano: {formatDate(item.sourceRender.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.sourceRender.fileType !== "pdf" && (
                          <button
                            onClick={() => { onCompare(item.sourceRender.fileUrl, label); }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                            title="Porównaj z oryginałem"
                          >
                            <SplitSquareHorizontal size={12} />
                            Porównaj
                          </button>
                        )}
                        {isDesigner && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                            title="Usuń"
                          >
                            {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPicker && (
        <RenderComparePicker
          projectRendersUrl={projectRendersUrl}
          excludeRenderId={renderId}
          mode="add"
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>,
    document.body
  );
}

/** Inlined picker for client (no items) — just the room/folder/render list without a modal wrapper */
function ClientPickerInline({ projectRendersUrl, excludeRenderId, onCompare }: {
  projectRendersUrl: string;
  excludeRenderId: string;
  onCompare: (render: PickerRenderItem) => void;
}) {
  const [rooms, setRooms] = useState<{ id: string; name: string; folders: { id: string; name: string; renders: PickerRenderItem[] }[]; renders: PickerRenderItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  useEffect(() => {
    fetch(projectRendersUrl)
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.map((room: { id: string; name: string; folders: { id: string; name: string; renders: PickerRenderItem[] }[]; renders: PickerRenderItem[] }) => ({
          ...room,
          renders: room.renders.filter((r: PickerRenderItem) => r.id !== excludeRenderId),
          folders: room.folders.map((f) => ({ ...f, renders: f.renders.filter((r: PickerRenderItem) => r.id !== excludeRenderId) })).filter((f) => f.renders.length > 0),
        })).filter((room: { id: string; name: string; folders: { id: string; name: string; renders: PickerRenderItem[] }[]; renders: PickerRenderItem[] }) => room.renders.length > 0 || room.folders.length > 0);
        setRooms(filtered);
        if (filtered.length > 0) setExpandedRoom(filtered[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectRendersUrl, excludeRenderId]);

  if (loading) return <p className="text-sm text-muted-foreground text-center py-4">Ładowanie…</p>;
  if (rooms.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Brak plików w projekcie</p>;

  return (
    <div className="space-y-2">
      {rooms.map((room) => {
        const allRenders = [...room.renders, ...room.folders.flatMap((f) => f.renders)];
        return (
          <div key={room.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-left hover:bg-muted/40 transition-colors"
            >
              {expandedRoom === room.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <span>{room.name}</span>
              <span className="text-xs text-muted-foreground font-normal">{allRenders.length} plików</span>
            </button>
            {expandedRoom === room.id && (
              <div className="border-t border-border divide-y divide-border">
                {room.folders.map((folder) => (
                  <div key={folder.id}>
                    <button
                      onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-left bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      {expandedFolder === folder.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span>{folder.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{folder.renders.length} plików</span>
                    </button>
                    {expandedFolder === folder.id && (
                      <div className="p-3 grid grid-cols-3 gap-2">
                        {folder.renders.map((render) => (
                          <CompareTile key={render.id} render={render} onCompare={() => onCompare(render)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {room.renders.length > 0 && (
                  <div className="p-3 grid grid-cols-3 gap-2">
                    {room.renders.map((render) => (
                      <CompareTile key={render.id} render={render} onCompare={() => onCompare(render)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompareTile({ render, onCompare }: { render: PickerRenderItem; onCompare: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg overflow-hidden border border-border bg-muted/20">
      <div className="w-full aspect-video flex items-center justify-center overflow-hidden bg-muted">
        {render.fileType === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
        ) : (
          <FileText size={24} className="text-red-400" />
        )}
      </div>
      <div className="w-full px-1.5 pb-1.5">
        <p className="text-xs text-center truncate text-foreground">{render.name}</p>
        {render.fileType !== "pdf" && (
          <button
            onClick={onCompare}
            className="mt-1 w-full flex items-center justify-center gap-1 text-xs py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <SplitSquareHorizontal size={11} />
            Porównaj
          </button>
        )}
      </div>
    </div>
  );
}

