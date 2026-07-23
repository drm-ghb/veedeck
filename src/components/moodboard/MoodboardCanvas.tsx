"use client";

import { useRef, useState, useCallback, useEffect, type KeyboardEvent } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Arrow, Line, Image as KonvaImage, Transformer, Group } from "react-konva";
import type Konva from "konva";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft, MousePointer, Hand, Square, Circle, Type, ArrowRight, Minus,
  Trash2, ZoomIn, ZoomOut, Undo2, Redo2, Share2, Check, Image, StickyNote,
  ChevronRight, Search, Package, PushPin, X,
} from "@/components/ui/icons";

// ── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "hand" | "rect" | "ellipse" | "text" | "arrow" | "line" | "note" | "image";

export interface CanvasElement {
  id: string;
  type: "rect" | "ellipse" | "text" | "arrow" | "line" | "note" | "image";
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // text / note
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  textAlign?: string;
  noteColor?: string;
  // arrow / line (relative points from x,y)
  points?: number[];
  // image
  imageUrl?: string;
  zIndex?: number;
}

interface CanvasData {
  elements: CanvasElement[];
  viewport?: { x: number; y: number; scale: number };
}

// ── Constants ──────────────────────────────────────────────────────────────

const FILL_COLORS = [
  "transparent", "#ffffff", "#f8fafc", "#e2e8f0",
  "#fef2f2", "#fee2e2", "#fca5a5",
  "#fff7ed", "#fed7aa", "#fb923c",
  "#fefce8", "#fef08a", "#facc15",
  "#f0fdf4", "#bbf7d0", "#4ade80",
  "#eff6ff", "#bfdbfe", "#60a5fa",
  "#faf5ff", "#e9d5ff", "#a855f7",
  "#1e293b", "#334155", "#475569",
];

const STROKE_COLORS = [
  "#000000", "#334155", "#64748b", "#94a3b8",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

const NOTE_COLORS = [
  { bg: "#fef08a", stroke: "#ca8a04", label: "Żółty" },
  { bg: "#bbf7d0", stroke: "#16a34a", label: "Zielony" },
  { bg: "#bfdbfe", stroke: "#2563eb", label: "Niebieski" },
  { bg: "#fca5a5", stroke: "#dc2626", label: "Czerwony" },
  { bg: "#e9d5ff", stroke: "#7c3aed", label: "Fioletowy" },
  { bg: "#fed7aa", stroke: "#ea580c", label: "Pomarańczowy" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Image cache ────────────────────────────────────────────────────────────

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string, cb: (img: HTMLImageElement) => void) {
  if (imageCache.has(url)) { cb(imageCache.get(url)!); return; }
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.onload = () => { imageCache.set(url, img); cb(img); };
  img.src = url;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CanvasImageNode({ el, isSelected, onSelect, onDragEnd, onTransformEnd }: {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (attrs: Partial<CanvasElement>) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (el.imageUrl) loadImage(el.imageUrl, setImg);
  }, [el.imageUrl]);

  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={el.x} y={el.y}
      width={el.width ?? 200} height={el.height ?? 150}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => {
        const node = e.target;
        onTransformEnd({
          x: node.x(), y: node.y(),
          width: Math.max(10, node.width() * node.scaleX()),
          height: Math.max(10, node.height() * node.scaleY()),
          rotation: node.rotation(),
        });
        node.scaleX(1); node.scaleY(1);
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  id: string;
  title: string;
  canvasData: object;
  isSharedWithClient: boolean;
  client: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
}

export default function MoodboardCanvas({ id, title: initialTitle, canvasData: initial, isSharedWithClient: initialShared, client, project }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textEditRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse initial data
  const parsed = initial as CanvasData;
  const initElements: CanvasElement[] = parsed?.elements ?? [];
  const initViewport = parsed?.viewport ?? { x: 0, y: 0, scale: 1 };

  // State
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<CanvasElement[]>(initElements);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stagePos, setStagePos] = useState({ x: initViewport.x, y: initViewport.y });
  const [stageScale, setStageScale] = useState(initViewport.scale);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingTextPos, setEditingTextPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [title, setTitle] = useState(initialTitle);
  const [isSharedWithClient, setIsSharedWithClient] = useState(initialShared);
  const [history, setHistory] = useState<CanvasElement[][]>([initElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"projectflow" | "products">("projectflow");
  const [renders, setRenders] = useState<{ id: string; name: string; fileUrl: string; fileType: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load sidebar data when opened
  useEffect(() => {
    if (!rightSidebarOpen) return;
    if (rightTab === "projectflow" && project?.id) {
      fetch(`/api/projects/${project.id}/project-renders`).then(r => r.ok ? r.json() : []).then(setRenders).catch(() => {});
    }
    if (rightTab === "products") {
      fetch("/api/products").then(r => r.ok ? r.json() : []).then((data: { id: string; name: string; imageUrl: string | null }[]) => setProducts(data)).catch(() => {});
    }
  }, [rightSidebarOpen, rightTab, project?.id]);

  // Push history
  function pushHistory(els: CanvasElement[]) {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, els];
    });
    setHistoryIndex((prev) => prev + 1);
  }

  function updateElements(newEls: CanvasElement[]) {
    setElements(newEls);
    pushHistory(newEls);
    scheduleSave(newEls);
  }

  // Auto-save
  function scheduleSave(els: CanvasElement[], vp?: { x: number; y: number; scale: number }) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const viewport = vp ?? { x: stagePos.x, y: stagePos.y, scale: stageScale };
      fetch(`/api/moodboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasData: { elements: els, viewport } }),
      }).catch(() => {});
    }, 800);
  }

  // Undo / Redo
  function undo() {
    if (historyIndex <= 0) return;
    const ni = historyIndex - 1;
    setHistoryIndex(ni);
    setElements(history[ni]);
    setSelectedIds([]);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const ni = historyIndex + 1;
    setHistoryIndex(ni);
    setElements(history[ni]);
    setSelectedIds([]);
  }

  // Coordinate conversion
  function stagePoint(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.container().getBoundingClientRect();
    return {
      x: (clientX - rect.left - stagePos.x) / stageScale,
      y: (clientY - rect.top - stagePos.y) / stageScale,
    };
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (editingTextId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          updateElements(elements.filter((el) => !selectedIds.includes(el.id)));
          setSelectedIds([]);
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key === "y") || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
      }
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "v" || e.key === "Escape") setTool("select");
        if (e.key === "h") setTool("hand");
        if (e.key === "r") setTool("rect");
        if (e.key === "o") setTool("ellipse");
        if (e.key === "t") setTool("text");
        if (e.key === "a") setTool("arrow");
        if (e.key === "l") setTool("line");
        if (e.key === "n") setTool("note");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, elements, editingTextId, historyIndex, history]);

  // Update transformer when selection changes
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const stage = stageRef.current;
    if (!stage) return;
    const nodes = selectedIds.map((sid) => stage.findOne("#" + sid)).filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  // Zoom with wheel
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition()!;
    const scaleBy = 1.08;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(Math.max(newScale, 0.1), 5);
    const mousePointTo = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale };
    const newPos = { x: pointer.x - mousePointTo.x * clamped, y: pointer.y - mousePointTo.y * clamped };
    setStageScale(clamped);
    setStagePos(newPos);
    scheduleSave(elements, { ...newPos, scale: clamped });
  }

  // Stage mouse events
  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const isStage = e.target === e.target.getStage();

    // Middle mouse or hand tool = pan
    if (e.evt.button === 1 || tool === "hand") {
      setIsPanning(true);
      return;
    }

    if (tool === "select") {
      if (isStage) setSelectedIds([]);
      return;
    }

    if (tool === "text" || tool === "note") {
      if (!isStage) return;
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      const defaultNote = NOTE_COLORS[0];
      const newEl: CanvasElement = tool === "note"
        ? { id: uid(), type: "note", x: pos.x - 75, y: pos.y - 75, width: 150, height: 150, text: "", fontSize: 13, noteColor: defaultNote.bg, stroke: defaultNote.stroke, strokeWidth: 1, fill: defaultNote.bg, opacity: 1 }
        : { id: uid(), type: "text", x: pos.x, y: pos.y, width: 200, height: 30, text: "Text", fontSize: 16, fill: "#1e293b", opacity: 1 };
      const next = [...elements, newEl];
      updateElements(next);
      setSelectedIds([newEl.id]);
      startTextEdit(newEl, pos);
      setTool("select");
      return;
    }

    if (!isStage) return;
    const pos = stagePoint(e.evt.clientX, e.evt.clientY);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage) return;
      const newPos = { x: stagePos.x + e.evt.movementX, y: stagePos.y + e.evt.movementY };
      setStagePos(newPos);
      scheduleSave(elements, { ...newPos, scale: stageScale });
      return;
    }
    if (!isDrawing || !drawStart) return;
    const pos = stagePoint(e.evt.clientX, e.evt.clientY);
    setDrawRect({ x: Math.min(pos.x, drawStart.x), y: Math.min(pos.y, drawStart.y), w: Math.abs(pos.x - drawStart.x), h: Math.abs(pos.y - drawStart.y) });
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isPanning) { setIsPanning(false); return; }
    if (!isDrawing || !drawStart || !drawRect) { setIsDrawing(false); return; }
    setIsDrawing(false);

    const w = drawRect.w || 120;
    const h = drawRect.h || 80;
    if (w < 5 && h < 5) { setDrawRect(null); return; }

    const pos = { x: drawRect.x, y: drawRect.y };
    let newEl: CanvasElement | null = null;

    if (tool === "rect") {
      newEl = { id: uid(), type: "rect", x: pos.x, y: pos.y, width: w, height: h, fill: "#e2e8f0", stroke: "#94a3b8", strokeWidth: 1.5, opacity: 1, rotation: 0 };
    } else if (tool === "ellipse") {
      newEl = { id: uid(), type: "ellipse", x: pos.x + w / 2, y: pos.y + h / 2, width: w, height: h, fill: "#e2e8f0", stroke: "#94a3b8", strokeWidth: 1.5, opacity: 1, rotation: 0 };
    } else if (tool === "arrow") {
      const end = stagePoint(e.evt.clientX, e.evt.clientY);
      newEl = { id: uid(), type: "arrow", x: drawStart.x, y: drawStart.y, points: [0, 0, end.x - drawStart.x, end.y - drawStart.y], stroke: "#334155", strokeWidth: 2, opacity: 1 };
    } else if (tool === "line") {
      const end = stagePoint(e.evt.clientX, e.evt.clientY);
      newEl = { id: uid(), type: "line", x: drawStart.x, y: drawStart.y, points: [0, 0, end.x - drawStart.x, end.y - drawStart.y], stroke: "#334155", strokeWidth: 2, opacity: 1 };
    }

    if (newEl) {
      const next = [...elements, newEl];
      updateElements(next);
      setSelectedIds([newEl.id]);
      setTool("select");
    }
    setDrawRect(null);
    setDrawStart(null);
  }

  // Text editing overlay
  function startTextEdit(el: CanvasElement, _pos?: { x: number; y: number }) {
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne("#" + el.id);
    let absX = 0, absY = 0, w = el.width ?? 200, h = el.height ?? 30;
    if (node) {
      const box = node.getClientRect();
      const stageRect = stage.container().getBoundingClientRect();
      absX = box.x - stageRect.left + stageRect.left;
      absY = box.y - stageRect.top + stageRect.top;
      w = box.width; h = box.height;
    } else {
      const stageRect = stage.container().getBoundingClientRect();
      absX = stageRect.left + (el.x * stageScale + stagePos.x);
      absY = stageRect.top + (el.y * stageScale + stagePos.y);
      w = (el.width ?? 200) * stageScale;
      h = (el.height ?? 30) * stageScale;
    }
    setEditingTextId(el.id);
    setEditingTextValue(el.text ?? "");
    setEditingTextPos({ x: absX, y: absY, w, h });
    setTimeout(() => textEditRef.current?.focus(), 30);
  }

  function commitTextEdit() {
    if (!editingTextId) return;
    const next = elements.map((el) => el.id === editingTextId ? { ...el, text: editingTextValue } : el);
    updateElements(next);
    setEditingTextId(null);
  }

  // Update element property
  function updateEl(elId: string, patch: Partial<CanvasElement>) {
    const next = elements.map((el) => el.id === elId ? { ...el, ...patch } : el);
    updateElements(next);
  }

  function updateSelected(patch: Partial<CanvasElement>) {
    const next = elements.map((el) => selectedIds.includes(el.id) ? { ...el, ...patch } : el);
    updateElements(next);
  }

  const selected = elements.filter((el) => selectedIds.includes(el.id));
  const firstSelected = selected[0];

  // Share toggle
  async function toggleShare() {
    const next = !isSharedWithClient;
    const res = await fetch(`/api/moodboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSharedWithClient: next }),
    });
    if (res.ok) {
      setIsSharedWithClient(next);
      toast.success(next ? "Tablica udostępniona klientowi" : "Cofnięto udostępnianie");
    }
  }

  // Image upload
  async function handleImageUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    // Use uploadthing or a simple base64 for now
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 400, maxH = 300;
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
        const pos = stagePoint(containerSize.w / 2, containerSize.h / 2);
        const newEl: CanvasElement = { id: uid(), type: "image", x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, imageUrl: url, opacity: 1, rotation: 0 };
        const next = [...elements, newEl];
        updateElements(next);
        setSelectedIds([newEl.id]);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  // Add render from sidebar
  function addRenderToCanvas(url: string, name: string) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = 350, maxH = 260;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
      const pos = stagePoint(containerSize.w / 2, containerSize.h / 2);
      const newEl: CanvasElement = { id: uid(), type: "image", x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, imageUrl: url, opacity: 1, rotation: 0 };
      const next = [...elements, newEl];
      updateElements(next);
      setSelectedIds([newEl.id]);
    };
    img.onerror = () => {
      const pos = stagePoint(containerSize.w / 2, containerSize.h / 2);
      const newEl: CanvasElement = { id: uid(), type: "image", x: pos.x - 175, y: pos.y - 130, width: 350, height: 260, imageUrl: url, opacity: 1, rotation: 0 };
      const next = [...elements, newEl];
      updateElements(next);
    };
    img.src = url;
  }

  // Add product image from sidebar
  function addProductToCanvas(imageUrl: string, name: string) {
    addRenderToCanvas(imageUrl, name);
  }

  const zoomPct = Math.round(stageScale * 100);
  const cursorMap: Record<Tool, string> = {
    select: "default",
    hand: isPanning ? "grabbing" : "grab",
    rect: "crosshair",
    ellipse: "crosshair",
    text: "text",
    arrow: "crosshair",
    line: "crosshair",
    note: "crosshair",
    image: "crosshair",
  };

  const filteredRenders = renders.filter(r => r.name.toLowerCase().includes(sidebarQuery.toLowerCase()));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(sidebarQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full select-none">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background shrink-0 z-10">
        <Link href="/moodboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft size={16} /> Moodboard
        </Link>
        <div className="w-px h-4 bg-border mx-1" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
            if (title.trim()) {
              await fetch(`/api/moodboards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
            }
          }}
          className="text-sm font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-0.5 min-w-[120px] max-w-[280px]"
        />
        <div className="flex-1" />
        {/* Undo / Redo */}
        <button onClick={undo} disabled={historyIndex <= 0} title="Cofnij (Ctrl+Z)" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
          <Undo2 size={16} />
        </button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Ponów (Ctrl+Y)" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
          <Redo2 size={16} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        {/* Share */}
        {client && (
          <button
            onClick={toggleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSharedWithClient ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            {isSharedWithClient ? <Check size={14} /> : <Share2 size={14} />}
            {isSharedWithClient ? "Udostępnione" : "Udostępnij klientowi"}
          </button>
        )}
        {/* Right sidebar toggle */}
        <button
          onClick={() => setRightSidebarOpen((v) => !v)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${rightSidebarOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Panel zasobów"
        >
          {rightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <div className="flex flex-col items-center gap-1 p-1.5 border-r border-border bg-background shrink-0 z-10">
          {(
            [
              { t: "select", icon: <MousePointer size={18} />, label: "Zaznaczanie (V)" },
              { t: "hand", icon: <Hand size={18} />, label: "Przesuwanie (H)" },
              null,
              { t: "rect", icon: <Square size={18} />, label: "Prostokąt (R)" },
              { t: "ellipse", icon: <Circle size={18} />, label: "Elipsa (O)" },
              { t: "note", icon: <StickyNote size={18} />, label: "Notka (N)" },
              null,
              { t: "text", icon: <Type size={18} />, label: "Tekst (T)" },
              { t: "arrow", icon: <ArrowRight size={18} />, label: "Strzałka (A)" },
              { t: "line", icon: <Minus size={18} />, label: "Linia (L)" },
              null,
              { t: "image", icon: <Image size={18} />, label: "Obraz" },
            ] as (null | { t: Tool; icon: React.ReactNode; label: string })[]
          ).map((item, idx) =>
            item === null ? (
              <div key={idx} className="w-8 h-px bg-border my-0.5" />
            ) : (
              <button
                key={item.t}
                onClick={() => {
                  if (item.t === "image") { fileInputRef.current?.click(); return; }
                  setTool(item.t as Tool);
                }}
                title={item.label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${tool === item.t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {item.icon}
              </button>
            )
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ cursor: cursorMap[tool] }}>
          {/* Dot grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x={stagePos.x % (20 * stageScale)} y={stagePos.y % (20 * stageScale)} width={20 * stageScale} height={20 * stageScale} patternUnits="userSpaceOnUse">
                <circle cx={1} cy={1} r={1} fill="currentColor" className="text-border" opacity={0.5} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>

          <Stage
            ref={stageRef}
            width={containerSize.w}
            height={containerSize.h}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={stageScale}
            scaleY={stageScale}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Layer>
              {elements.map((el) => {
                const isSel = selectedIds.includes(el.id);
                const commonProps = {
                  id: el.id,
                  opacity: el.opacity ?? 1,
                  rotation: el.rotation ?? 0,
                  draggable: tool === "select",
                  onClick: () => {
                    if (tool === "select") setSelectedIds([el.id]);
                  },
                  onTap: () => {
                    if (tool === "select") setSelectedIds([el.id]);
                  },
                  onDblClick: () => {
                    if (el.type === "text" || el.type === "note") startTextEdit(el);
                  },
                  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                    updateEl(el.id, { x: e.target.x(), y: e.target.y() });
                  },
                  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                    const node = e.target;
                    const patch: Partial<CanvasElement> = {
                      x: node.x(), y: node.y(),
                      rotation: node.rotation(),
                    };
                    if (el.type !== "arrow" && el.type !== "line") {
                      patch.width = Math.max(5, (el.width ?? 100) * node.scaleX());
                      patch.height = Math.max(5, (el.height ?? 40) * node.scaleY());
                      node.scaleX(1); node.scaleY(1);
                    }
                    updateEl(el.id, patch);
                  },
                };

                if (el.type === "rect") return (
                  <Rect key={el.id} {...commonProps} x={el.x} y={el.y} width={el.width ?? 120} height={el.height ?? 80}
                    fill={el.fill ?? "#e2e8f0"} stroke={el.stroke ?? "#94a3b8"} strokeWidth={el.strokeWidth ?? 1.5} cornerRadius={4} />
                );

                if (el.type === "ellipse") return (
                  <Ellipse key={el.id} {...commonProps} x={el.x} y={el.y} radiusX={(el.width ?? 120) / 2} radiusY={(el.height ?? 80) / 2}
                    fill={el.fill ?? "#e2e8f0"} stroke={el.stroke ?? "#94a3b8"} strokeWidth={el.strokeWidth ?? 1.5} />
                );

                if (el.type === "text") return (
                  <Text key={el.id} {...commonProps} x={el.x} y={el.y} width={el.width ?? 200}
                    text={el.id === editingTextId ? "" : (el.text || "Text")}
                    fontSize={el.fontSize ?? 16} fill={el.fill ?? "#1e293b"}
                    fontFamily={el.fontFamily ?? "Inter, sans-serif"}
                    fontStyle={el.fontStyle ?? "normal"} />
                );

                if (el.type === "note") return (
                  <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                    <Rect width={el.width ?? 150} height={el.height ?? 150}
                      fill={el.noteColor ?? "#fef08a"} stroke={el.stroke ?? "#ca8a04"} strokeWidth={1} cornerRadius={6} />
                    <Text x={8} y={8} width={(el.width ?? 150) - 16} height={(el.height ?? 150) - 16}
                      text={el.id === editingTextId ? "" : (el.text || "")}
                      fontSize={el.fontSize ?? 13} fill="#1e293b" wrap="word" />
                  </Group>
                );

                if (el.type === "arrow") return (
                  <Arrow key={el.id} {...commonProps} x={el.x} y={el.y}
                    points={el.points ?? [0, 0, 80, 0]}
                    stroke={el.stroke ?? "#334155"} strokeWidth={el.strokeWidth ?? 2}
                    fill={el.stroke ?? "#334155"} pointerLength={10} pointerWidth={8} />
                );

                if (el.type === "line") return (
                  <Line key={el.id} {...commonProps} x={el.x} y={el.y}
                    points={el.points ?? [0, 0, 80, 0]}
                    stroke={el.stroke ?? "#334155"} strokeWidth={el.strokeWidth ?? 2} lineCap="round" />
                );

                if (el.type === "image") return (
                  <CanvasImageNode key={el.id} el={el} isSelected={isSel}
                    onSelect={() => setSelectedIds([el.id])}
                    onDragEnd={(x, y) => updateEl(el.id, { x, y })}
                    onTransformEnd={(attrs) => updateEl(el.id, attrs)} />
                );

                return null;
              })}

              {/* Preview rect while drawing */}
              {isDrawing && drawRect && (tool === "rect" || tool === "note") && (
                <Rect x={drawRect.x} y={drawRect.y} width={drawRect.w} height={drawRect.h}
                  fill={tool === "note" ? "#fef08a40" : "#e2e8f040"} stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />
              )}
              {isDrawing && drawRect && tool === "ellipse" && (
                <Ellipse x={drawRect.x + drawRect.w / 2} y={drawRect.y + drawRect.h / 2}
                  radiusX={drawRect.w / 2} radiusY={drawRect.h / 2}
                  fill="#e2e8f040" stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />
              )}

              <Transformer ref={transformerRef} rotateEnabled keepRatio={false} borderStroke="#6366f1" anchorStroke="#6366f1" anchorFill="#fff" anchorSize={8} borderStrokeWidth={1.5} />
            </Layer>
          </Stage>

          {/* Text editing overlay */}
          {editingTextId && (() => {
            const el = elements.find(e => e.id === editingTextId);
            if (!el) return null;
            const stageRect = stageRef.current?.container().getBoundingClientRect();
            if (!stageRect) return null;
            const absX = stageRect.left + el.x * stageScale + stagePos.x;
            const absY = stageRect.top + el.y * stageScale + stagePos.y;
            const w = Math.max(100, (el.width ?? 200) * stageScale);
            const h = Math.max(30, (el.height ?? 30) * stageScale);
            return (
              <textarea
                ref={textEditRef}
                value={editingTextValue}
                onChange={(e) => setEditingTextValue(e.target.value)}
                onBlur={commitTextEdit}
                onKeyDown={(e) => { if (e.key === "Escape") commitTextEdit(); if (e.key === "Enter" && !e.shiftKey && el.type !== "note") { e.preventDefault(); commitTextEdit(); } }}
                style={{
                  position: "fixed",
                  left: absX,
                  top: absY,
                  width: w,
                  minHeight: h,
                  fontSize: (el.fontSize ?? 16) * stageScale,
                  fontFamily: el.fontFamily ?? "Inter, sans-serif",
                  background: el.type === "note" ? (el.noteColor ?? "#fef08a") : "transparent",
                  border: "1.5px solid #6366f1",
                  borderRadius: el.type === "note" ? 6 : 2,
                  padding: el.type === "note" ? 8 : 0,
                  outline: "none",
                  resize: "none",
                  overflow: "hidden",
                  color: "#1e293b",
                  lineHeight: 1.4,
                  zIndex: 100,
                }}
              />
            );
          })()}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card border border-border rounded-xl shadow-sm px-1 py-1">
            <button onClick={() => setStageScale((s) => Math.max(0.1, s / 1.2))} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ZoomOut size={15} /></button>
            <button onClick={() => setStageScale(1)} className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors min-w-[48px] text-center">{zoomPct}%</button>
            <button onClick={() => setStageScale((s) => Math.min(5, s * 1.2))} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ZoomIn size={15} /></button>
          </div>
        </div>

        {/* Properties panel — shown below canvas when element selected */}
        {firstSelected && !editingTextId && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg px-4 py-2.5 z-20 pointer-events-auto"
            style={{ position: "absolute", bottom: "56px", left: "50%", transform: "translateX(-50%)" }}>
            {/* Fill color */}
            {(firstSelected.type === "rect" || firstSelected.type === "ellipse" || firstSelected.type === "note") && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Wypełnienie</span>
                <div className="flex gap-1 flex-wrap max-w-[180px]">
                  {(firstSelected.type === "note" ? NOTE_COLORS.map(n => n.bg) : FILL_COLORS.slice(0, 12)).map((c) => (
                    <button key={c} onClick={() => updateSelected(firstSelected.type === "note" ? { fill: c, noteColor: c } : { fill: c })}
                      style={{ background: c === "transparent" ? "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,#fff 0,#fff 50%)" : c }}
                      className={`w-5 h-5 rounded border-2 transition-all ${(firstSelected.fill === c || firstSelected.noteColor === c) ? "border-primary scale-110" : "border-border"}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Stroke color */}
            {firstSelected.type !== "text" && firstSelected.type !== "image" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Obramowanie</span>
                <div className="flex gap-1">
                  {STROKE_COLORS.slice(0, 8).map((c) => (
                    <button key={c} onClick={() => updateSelected({ stroke: c })}
                      style={{ background: c }}
                      className={`w-5 h-5 rounded border-2 transition-all ${firstSelected.stroke === c ? "border-primary scale-110" : "border-border"}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Stroke width */}
            {(firstSelected.type === "arrow" || firstSelected.type === "line" || firstSelected.type === "rect" || firstSelected.type === "ellipse") && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Grubość</span>
                {[1, 2, 4, 6].map((w) => (
                  <button key={w} onClick={() => updateSelected({ strokeWidth: w })}
                    className={`w-8 h-6 rounded border transition-all text-xs ${firstSelected.strokeWidth === w ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {w}
                  </button>
                ))}
              </div>
            )}
            {/* Font size */}
            {(firstSelected.type === "text") && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Rozmiar</span>
                {[12, 16, 20, 28, 36, 48].map((s) => (
                  <button key={s} onClick={() => updateSelected({ fontSize: s })}
                    className={`w-8 h-6 rounded border transition-all text-xs ${firstSelected.fontSize === s ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {/* Text color */}
            {firstSelected.type === "text" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Kolor</span>
                <div className="flex gap-1">
                  {STROKE_COLORS.slice(0, 8).map((c) => (
                    <button key={c} onClick={() => updateSelected({ fill: c })}
                      style={{ background: c }}
                      className={`w-5 h-5 rounded border-2 transition-all ${firstSelected.fill === c ? "border-primary scale-110" : "border-border"}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Opacity */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Przezroczystość</span>
              <input type="range" min={0.1} max={1} step={0.05} value={firstSelected.opacity ?? 1}
                onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                className="w-20 accent-primary" />
              <span className="text-xs text-muted-foreground w-7">{Math.round((firstSelected.opacity ?? 1) * 100)}%</span>
            </div>
            {/* Delete */}
            <button onClick={() => { updateElements(elements.filter(e => !selectedIds.includes(e.id))); setSelectedIds([]); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        )}

        {/* Right sidebar */}
        {rightSidebarOpen && (
          <div className="w-64 border-l border-border bg-background flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => { setRightTab("projectflow"); setSidebarQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightTab === "projectflow" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <PushPin size={13} /> ProjectFlow
              </button>
              <button
                onClick={() => { setRightTab("products"); setSidebarQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightTab === "products" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package size={13} /> Produkty
              </button>
            </div>
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Szukaj..."
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
              {rightTab === "projectflow" && (
                <>
                  {!project && (
                    <p className="text-xs text-muted-foreground text-center py-8">Ta tablica nie ma przypisanego projektu</p>
                  )}
                  {project && filteredRenders.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak renderów{sidebarQuery ? " dla tej frazy" : ""}</p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredRenders.map((r) => (
                      <button key={r.id} onClick={() => addRenderToCanvas(r.fileUrl, r.name)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted"
                        title={r.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.fileUrl} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                          <p className="text-white text-[10px] font-medium px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{r.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {rightTab === "products" && (
                <>
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak produktów{sidebarQuery ? " dla tej frazy" : ""}</p>
                  )}
                  <div className="space-y-1">
                    {filteredProducts.map((p) => (
                      <button key={p.id} onClick={() => p.imageUrl && addProductToCanvas(p.imageUrl, p.name)}
                        disabled={!p.imageUrl}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-40"
                        title={p.name}>
                        <div className="w-9 h-9 rounded-lg bg-muted shrink-0 overflow-hidden">
                          {p.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <Package size={16} className="text-muted-foreground m-auto mt-2.5" />}
                        </div>
                        <p className="text-xs font-medium truncate">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
