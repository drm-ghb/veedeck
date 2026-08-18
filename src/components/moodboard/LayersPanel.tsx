"use client";

import { useRef, useState } from "react";
import {
  DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CanvasElement } from "./MoodboardCanvas";
import {
  X, ChevronRight, ChevronDown, Square, Circle, Type, Image, Minus, ArrowRight,
  StickyNote, Pen, GripVertical, Frame as FrameIcon,
} from "@/components/ui/icons";

// ── helpers ──────────────────────────────────────────────────────────────────

function getLabel(el: CanvasElement): string {
  switch (el.type) {
    case "frame":      return el.frameName || "Frame";
    case "text":       return el.text ? el.text.slice(0, 24) : "Tekst";
    case "note":       return el.text ? el.text.slice(0, 24) : "Notatka";
    case "image":      return "Obraz";
    case "rect":       return "Prostokąt";
    case "ellipse":    return "Elipsa";
    case "triangle":   return "Trójkąt";
    case "arrow":      return "Strzałka";
    case "line":       return "Linia";
    case "freehand":
    case "pen":        return "Rysunek";
    case "connection": return "Połączenie";
    default:           return "Element";
  }
}

function getIcon(type: string) {
  const cls = "text-muted-foreground shrink-0";
  switch (type) {
    case "frame":     return <FrameIcon size={12} className={cls} />;
    case "rect":      return <Square size={12} className={cls} />;
    case "ellipse":   return <Circle size={12} className={cls} />;
    case "text":      return <Type size={12} className={cls} />;
    case "image":     return <Image size={12} className={cls} />;
    case "note":      return <StickyNote size={12} className={cls} />;
    case "arrow":     return <ArrowRight size={12} className={cls} />;
    case "line":      return <Minus size={12} className={cls} />;
    case "freehand":
    case "pen":       return <Pen size={12} className={cls} />;
    case "triangle":  return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}>
        <path d="M3 20h18L12 4z" />
      </svg>
    );
    default: return <Square size={12} className={cls} />;
  }
}

// ── data helpers ──────────────────────────────────────────────────────────────

type LayerGroup =
  | { type: "frame";   id: string; frame: CanvasElement; children: CanvasElement[] }
  | { type: "element"; id: string; el: CanvasElement };

/**
 * Build display groups from the flat elements array.
 * Groups are ordered top-layer-first (highest z-index = position in array).
 * Frame children within each group are also ordered top-first.
 */
function buildGroups(elements: CanvasElement[]): LayerGroup[] {
  const processedIds = new Set<string>();
  const frameChildMap = new Map<string, CanvasElement[]>();

  for (const el of elements) {
    if (el.frameId) {
      const arr = frameChildMap.get(el.frameId) ?? [];
      arr.push(el);
      frameChildMap.set(el.frameId, arr);
    }
  }

  const items: { maxIndex: number; group: LayerGroup }[] = [];

  for (const el of elements) {
    if (processedIds.has(el.id)) continue;

    if (el.type === "frame") {
      const rawChildren = frameChildMap.get(el.id) ?? [];
      const frameIdx = elements.indexOf(el);
      const maxIdx = rawChildren.length > 0
        ? Math.max(frameIdx, ...rawChildren.map(c => elements.indexOf(c)))
        : frameIdx;
      // children displayed top-first (descending array index)
      const children = [...rawChildren].sort((a, b) => elements.indexOf(b) - elements.indexOf(a));
      items.push({ maxIndex: maxIdx, group: { type: "frame", id: el.id, frame: el, children } });
      processedIds.add(el.id);
      rawChildren.forEach(c => processedIds.add(c.id));
    } else if (!el.frameId) {
      items.push({ maxIndex: elements.indexOf(el), group: { type: "element", id: el.id, el } });
      processedIds.add(el.id);
    }
  }

  // Catch orphan children whose frame was deleted
  for (const el of elements) {
    if (!processedIds.has(el.id)) {
      items.push({ maxIndex: elements.indexOf(el), group: { type: "element", id: el.id, el } });
    }
  }

  items.sort((a, b) => b.maxIndex - a.maxIndex);
  return items.map(i => i.group);
}

/** Reconstruct flat elements array from groups (groups are top-first, array is bottom-first). */
function groupsToElements(groups: LayerGroup[]): CanvasElement[] {
  const result: CanvasElement[] = [];
  for (const group of [...groups].reverse()) {
    if (group.type === "frame") {
      result.push(group.frame);
      result.push(...[...group.children].reverse()); // children: bottom-first in array
    } else {
      result.push(group.el);
    }
  }
  return result;
}

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableRowProps {
  sortableId: string;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  indent?: boolean;
  onClick: () => void;
  rightSlot?: React.ReactNode;
  readOnly?: boolean;
}

function SortableRow({ sortableId, label, icon, isSelected, indent = false, onClick, rightSlot, readOnly }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId, disabled: readOnly });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`group flex items-center gap-1 px-1 py-[3px] rounded-lg cursor-pointer select-none transition-colors ${
        indent ? "pl-5" : ""
      } ${isSelected ? "bg-primary/10" : "hover:bg-muted"}`}
      onClick={onClick}
    >
      {!readOnly && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 p-0.5 text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical size={11} />
        </button>
      )}
      {readOnly && <span className="w-4 shrink-0" />}
      {icon}
      <span className={`text-xs truncate flex-1 min-w-0 ${isSelected ? "text-primary font-medium" : "text-foreground"}`}>
        {label}
      </span>
      {rightSlot}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export interface LayersPanelProps {
  elements: CanvasElement[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onUpdateElements: (els: CanvasElement[]) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function LayersPanel({ elements, selectedIds, onSelect, onUpdateElements, onClose, readOnly }: LayersPanelProps) {
  const [collapsedFrames, setCollapsedFrames] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeOverlayLabel, setActiveOverlayLabel] = useState<string | null>(null);
  const [activeOverlayIcon, setActiveOverlayIcon] = useState<React.ReactNode>(null);
  const dragSourceFrameId = useRef<string | null>(null);

  // Always derive groups from props (no local groups state to avoid stale data)
  const groups = buildGroups(elements);

  function toggleCollapse(frameId: string) {
    setCollapsedFrames(prev => {
      const next = new Set(prev);
      next.has(frameId) ? next.delete(frameId) : next.add(frameId);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    if (id.startsWith("toplevel:")) {
      const elId = id.slice(9);
      const group = groups.find(g => g.id === elId);
      if (group) {
        setActiveOverlayLabel(group.type === "frame" ? (group.frame.frameName || "Frame") : getLabel(group.el));
        setActiveOverlayIcon(getIcon(group.type === "frame" ? "frame" : group.el.type));
      }
      dragSourceFrameId.current = null;
    } else if (id.startsWith("child:")) {
      const elId = id.slice(6);
      const el = elements.find(e => e.id === elId);
      if (el) {
        setActiveOverlayLabel(getLabel(el));
        setActiveOverlayIcon(getIcon(el.type));
        dragSourceFrameId.current = el.frameId ?? null;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveOverlayLabel(null);
    setActiveOverlayIcon(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith("toplevel:") && overId.startsWith("toplevel:")) {
      const fromId = activeId.slice(9);
      const toId = overId.slice(9);
      const fromIdx = groups.findIndex(g => g.id === fromId);
      const toIdx = groups.findIndex(g => g.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      onUpdateElements(groupsToElements(arrayMove(groups, fromIdx, toIdx)));
    } else if (activeId.startsWith("child:") && overId.startsWith("child:")) {
      const fromChildId = activeId.slice(6);
      const toChildId = overId.slice(6);
      const frameId = dragSourceFrameId.current;
      if (!frameId) return;
      const frameGroup = groups.find(g => g.type === "frame" && g.id === frameId);
      if (!frameGroup || frameGroup.type !== "frame") return;
      const fromIdx = frameGroup.children.findIndex(c => c.id === fromChildId);
      const toIdx = frameGroup.children.findIndex(c => c.id === toChildId);
      if (fromIdx === -1 || toIdx === -1) return;
      frameGroup.children = arrayMove(frameGroup.children, fromIdx, toIdx);
      onUpdateElements(groupsToElements(groups));
    }
    dragSourceFrameId.current = null;
  }

  const topLevelIds = groups.map(g => `toplevel:${g.id}`);

  return (
    <div
      className="absolute left-4 top-[60px] bottom-4 w-52 z-20 bg-card border border-border rounded-2xl shadow-lg flex flex-col overflow-hidden pointer-events-auto"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">Warstwy</span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
            {groups.map(group => {
              if (group.type === "frame") {
                const isCollapsed = collapsedFrames.has(group.id);
                const childIds = group.children.map(c => `child:${c.id}`);
                return (
                  <div key={group.id} className="mb-0.5">
                    <SortableRow
                      sortableId={`toplevel:${group.id}`}
                      label={group.frame.frameName || "Frame"}
                      icon={getIcon("frame")}
                      isSelected={selectedIds.includes(group.id)}
                      readOnly={readOnly}
                      onClick={() => onSelect([group.id])}
                      rightSlot={
                        <button
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                          onClick={e => { e.stopPropagation(); toggleCollapse(group.id); }}
                          tabIndex={-1}
                        >
                          {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                        </button>
                      }
                    />
                    {!isCollapsed && group.children.length > 0 && (
                      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
                        {group.children.map(child => (
                          <SortableRow
                            key={child.id}
                            sortableId={`child:${child.id}`}
                            label={getLabel(child)}
                            icon={getIcon(child.type)}
                            isSelected={selectedIds.includes(child.id)}
                            indent
                            readOnly={readOnly}
                            onClick={() => onSelect([child.id])}
                          />
                        ))}
                      </SortableContext>
                    )}
                    {!isCollapsed && group.children.length === 0 && (
                      <p className="text-[10px] text-muted-foreground pl-9 py-0.5 italic">Pusty frame</p>
                    )}
                  </div>
                );
              }

              return (
                <SortableRow
                  key={group.id}
                  sortableId={`toplevel:${group.id}`}
                  label={getLabel(group.el)}
                  icon={getIcon(group.el.type)}
                  isSelected={selectedIds.includes(group.id)}
                  readOnly={readOnly}
                  onClick={() => onSelect([group.id])}
                />
              );
            })}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeOverlayLabel !== null && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-card border border-primary/50 rounded-lg shadow-xl text-xs text-foreground max-w-[180px]">
                {activeOverlayIcon}
                <span className="truncate">{activeOverlayLabel}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10 px-3">
            Brak elementów na tablicy.
          </p>
        )}
      </div>
    </div>
  );
}
