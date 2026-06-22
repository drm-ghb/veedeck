"use client";

import { useState, useEffect } from "react";
import { X, Check, ChevronRight, ChevronDown, Image, FileText, SplitSquareHorizontal } from "@/components/ui/icons";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";

export interface PickerRenderItem {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

interface PickerFolder {
  id: string;
  name: string;
  renders: PickerRenderItem[];
}

interface PickerRoom {
  id: string;
  name: string;
  folders: PickerFolder[];
  renders: PickerRenderItem[];
}

interface Props {
  /** URL to fetch rooms/folders/renders */
  projectRendersUrl: string;
  /** Render to exclude from picker (the current one) */
  excludeRenderId?: string;
  /** "add" = multi-select + Dodaj button (designer), "compare" = compare icon per tile (client) */
  mode: "add" | "compare";
  onAdd?: (renders: PickerRenderItem[]) => void;
  onCompare?: (render: PickerRenderItem) => void;
  onClose: () => void;
}

function Thumbnail({
  render,
  mode,
  selected,
  onToggle,
  onCompare,
}: {
  render: PickerRenderItem;
  mode: "add" | "compare";
  selected: boolean;
  onToggle: () => void;
  onCompare?: () => void;
}) {
  const t = useT();
  return (
    <div className="relative flex flex-col items-center gap-1 rounded-lg overflow-hidden border border-border bg-muted/30 hover:bg-muted/60 transition-colors">
      <button
        onClick={onToggle}
        className={`w-full relative ${mode === "add" ? "cursor-pointer" : "cursor-default pointer-events-none"}`}
        tabIndex={mode === "add" ? 0 : -1}
      >
        <div className="w-full aspect-video flex items-center justify-center overflow-hidden bg-muted">
          {render.fileType === "image" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
          ) : render.fileType === "pdf" ? (
            <FileText size={28} className="text-red-400" />
          ) : (
            <Image size={28} className="text-muted-foreground" />
          )}
        </div>
        {mode === "add" && selected && (
          <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5">
            <Check size={12} className="text-primary-foreground" />
          </div>
        )}
        {mode === "add" && !selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-white/80 bg-black/20" />
        )}
      </button>
      <div className="w-full px-1.5 pb-1.5">
        <p className="text-xs text-center truncate text-foreground leading-tight">{render.name}</p>
        {mode === "compare" && (
          <button
            onClick={onCompare}
            className="mt-1 w-full flex items-center justify-center gap-1 text-xs py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <SplitSquareHorizontal size={12} />
            {t.render.compareBtn}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RenderComparePicker({ projectRendersUrl, excludeRenderId, mode, onAdd, onCompare, onClose }: Props) {
  const t = useT();
  const [rooms, setRooms] = useState<PickerRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(projectRendersUrl)
      .then((r) => r.json())
      .then((data: PickerRoom[]) => {
        const filtered = data.map((room) => ({
          ...room,
          renders: room.renders.filter((r) => r.id !== excludeRenderId),
          folders: room.folders.map((f) => ({
            ...f,
            renders: f.renders.filter((r) => r.id !== excludeRenderId),
          })).filter((f) => f.renders.length > 0),
        })).filter((room) => room.renders.length > 0 || room.folders.length > 0);
        setRooms(filtered);
        if (filtered.length > 0) setExpandedRoom(filtered[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectRendersUrl, excludeRenderId]);

  function allInRoom(room: PickerRoom) {
    return [...room.renders, ...room.folders.flatMap((f) => f.renders)];
  }

  function toggleRender(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll(renders: PickerRenderItem[]) {
    const ids = renders.map((r) => r.id);
    const allSel = ids.every((id) => selected.includes(id));
    setSelected(allSel ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  }

  function handleAdd() {
    if (!onAdd || selected.length === 0) return;
    const all = rooms.flatMap((r) => allInRoom(r));
    onAdd(all.filter((r) => selected.includes(r.id)));
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">{t.render.comparePickerTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">{t.render.compareLoading}</p>
          )}
          {!loading && rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t.render.compareNoFilesProject}</p>
          )}
          {!loading && rooms.map((room) => {
            const roomRenders = allInRoom(room);
            return (
              <div key={room.id} className="border border-border rounded-lg overflow-hidden">
                {/* Room row */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-card hover:bg-muted/40 transition-colors">
                  <button
                    onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                    className="flex-1 flex items-center gap-2 text-sm font-semibold text-left"
                  >
                    {expandedRoom === room.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>{room.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{roomRenders.length} {roomRenders.length === 1 ? t.render.compareFileSingular : roomRenders.length < 5 ? t.render.compareFileFew : t.render.compareFileMany}</span>
                  </button>
                </div>

                {expandedRoom === room.id && (
                  <div className="border-t border-border divide-y divide-border">
                    {/* Folders */}
                    {room.folders.map((folder) => (
                      <div key={folder.id}>
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted/70 transition-colors">
                          <button
                            onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}
                            className="flex-1 flex items-center gap-2 text-sm font-medium text-left"
                          >
                            {expandedFolder === folder.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{folder.name}</span>
                            <span className="text-xs text-muted-foreground font-normal">{folder.renders.length} {folder.renders.length === 1 ? t.render.compareFileSingular : folder.renders.length < 5 ? t.render.compareFileFew : t.render.compareFileMany}</span>
                          </button>
                        </div>
                        {expandedFolder === folder.id && (
                          <div className="p-3 grid grid-cols-3 gap-3">
                            {folder.renders.map((render) => (
                              <Thumbnail
                                key={render.id}
                                render={render}
                                mode={mode}
                                selected={selected.includes(render.id)}
                                onToggle={() => toggleRender(render.id)}
                                onCompare={() => onCompare?.(render)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Direct renders */}
                    {room.renders.length > 0 && (
                      <div className="p-3 grid grid-cols-3 gap-3">
                        {room.renders.map((render) => (
                          <Thumbnail
                            key={render.id}
                            render={render}
                            mode={mode}
                            selected={selected.includes(render.id)}
                            onToggle={() => toggleRender(render.id)}
                            onCompare={() => onCompare?.(render)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer — only for add mode */}
        {mode === "add" && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
              {t.common.cancel}
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.length === 0}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {selected.length > 0 ? `${t.render.compareAddSelected} (${selected.length})` : t.render.compareAddBtn}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
