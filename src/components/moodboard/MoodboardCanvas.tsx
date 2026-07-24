"use client";

import { useRef, useState, useCallback, useEffect, Fragment, type KeyboardEvent } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Arrow, Line, Image as KonvaImage, Transformer, Group, Path as KonvaPath, Circle as KonvaCircle } from "react-konva";
import type Konva from "konva";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft, MousePointer, Hand, Square, Circle, Type, ArrowRight, Minus,
  Trash2, ZoomIn, ZoomOut, Undo2, Redo2, Share2, Check, Image, StickyNote,
  ChevronRight, ChevronDown, Search, Package, PushPin, X, Folder, RefreshCw, LocalMall, LayoutGrid, DashboardAdd,
  ArrowUp, ArrowDown, Layers, Palette, Crop, Eraser, Check as CheckIcon, Copy,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, HelpCircle, Pen, MoreVertical, Download,
  Frame as FrameIcon,
} from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { MOODBOARD_TEMPLATES } from "@/components/moodboard/data/templates";
import type { MoodboardTemplate } from "@/components/moodboard/data/templates";

// ── Types ──────────────────────────────────────────────────────────────────

type Tool = "select" | "hand" | "rect" | "ellipse" | "text" | "arrow" | "line" | "note" | "image" | "pen" | "frame";

type FramePresetId = "custom" | "a4" | "16:9" | "4:3" | "1:1";

export interface CanvasElement {
  id: string;
  type: "rect" | "ellipse" | "text" | "arrow" | "line" | "note" | "image" | "connection" | "freehand" | "frame";
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
  textDecoration?: string;
  textAlign?: string;
  noteColor?: string;
  // arrow / line (relative points from x,y)
  points?: number[];
  // image
  imageUrl?: string;
  // corner radius (image and rect)
  cornerRadius?: number;
  // image crop (0–1 fractions of display size, converted to px when applying to Konva)
  cropLeft?: number;
  cropTop?: number;
  cropRight?: number;
  cropBottom?: number;
  zIndex?: number;
  // connection (bezier connector between elements)
  sourceId?: string;
  sourceAnchor?: "top" | "right" | "bottom" | "left";
  targetId?: string;
  targetAnchor?: "top" | "right" | "bottom" | "left";
  // frame
  frameName?: string;
  frameId?: string; // id of the frame this element belongs to
  // template placeholder
  templateRole?: 'image' | 'swatch' | 'text';
  templateLabel?: string;
  // masked image (template slot filled with photo — inner pan/zoom)
  maskShape?: 'rect' | 'ellipse';
  innerScale?: number;
  innerOffsetX?: number;
  innerOffsetY?: number;
  naturalW?: number;
  naturalH?: number;
  // template category (carried from template for flat lay styling)
  templateCategory?: 'flatlay';
}

interface CanvasData {
  elements: CanvasElement[];
  viewport?: { x: number; y: number; scale: number };
  background?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Nunito", "Poppins", "Raleway",
  "DM Sans", "Work Sans", "Outfit", "Manrope", "Plus Jakarta Sans", "Figtree",
  "Playfair Display", "Merriweather", "Lora", "PT Serif", "Libre Baskerville", "EB Garamond",
  "Oswald", "Bebas Neue", "Anton", "Righteous", "Barlow Condensed",
  "Dancing Script", "Pacifico", "Satisfy", "Caveat", "Kalam",
  "Space Mono", "Source Code Pro", "JetBrains Mono",
];

const _loadedFonts = new Set<string>();
function loadGoogleFont(family: string) {
  if (_loadedFonts.has(family) || typeof document === "undefined") return;
  _loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&display=swap`;
  document.head.appendChild(link);
}

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

// ── Frame presets ───────────────────────────────────────────────────────────

const FRAME_PRESETS: { id: FramePresetId; label: string; w: number; h: number; aspect?: string }[] = [
  { id: "custom",  label: "Custom",  w: 0,    h: 0    },
  { id: "a4",      label: "A4",      w: 794,  h: 1123 },
  { id: "16:9",    label: "16:9",    w: 960,  h: 540  },
  { id: "4:3",     label: "4:3",     w: 960,  h: 720  },
  { id: "1:1",     label: "1:1",     w: 800,  h: 800  },
];

// ── Connection helpers ──────────────────────────────────────────────────────

type Anchor = "top" | "right" | "bottom" | "left";

function getElementBounds(el: CanvasElement) {
  if (el.type === "ellipse") {
    const w = el.width ?? 120, h = el.height ?? 80;
    return { x: el.x - w / 2, y: el.y - h / 2, width: w, height: h };
  }
  if ((el.type === "line" || el.type === "arrow") && el.points && el.points.length >= 4) {
    const pts = el.points;
    const x0 = el.x + (pts[0] ?? 0), y0 = el.y + (pts[1] ?? 0);
    const x1 = el.x + (pts[2] ?? 80), y1 = el.y + (pts[3] ?? 0);
    return { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0) || 8, height: Math.abs(y1 - y0) || 8 };
  }
  if (el.type === "freehand" && el.points && el.points.length >= 2) {
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    for (let i = 0; i < el.points.length; i += 2) {
      const px = el.points[i], py = el.points[i + 1];
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    return { x: el.x + minX, y: el.y + minY, width: maxX - minX || 10, height: maxY - minY || 10 };
  }
  return { x: el.x, y: el.y, width: el.width ?? 120, height: el.height ?? 80 };
}

function getAnchorPoint(el: CanvasElement, anchor: Anchor) {
  const w = el.width ?? 120, h = el.height ?? 80;
  const rad = ((el.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  // For ellipse: el.x/el.y is the center (Konva Ellipse origin = center).
  // For all others: el.x/el.y is the top-left (Konva Rect/Group/Text origin = top-left).
  // Anchor in local space, then world = (el.x, el.y) + R(rotation) × local
  let lx: number, ly: number;
  if (el.type === "ellipse") {
    if (anchor === "top")         { lx =    0;  ly = -h / 2; }
    else if (anchor === "right")  { lx =  w/2;  ly =  0;     }
    else if (anchor === "bottom") { lx =    0;  ly =  h / 2; }
    else                          { lx = -w/2;  ly =  0;     }
  } else {
    if (anchor === "top")         { lx = w / 2; ly = 0;     }
    else if (anchor === "right")  { lx = w;     ly = h / 2; }
    else if (anchor === "bottom") { lx = w / 2; ly = h;     }
    else                          { lx = 0;     ly = h / 2; }
  }

  return {
    x: el.x + lx * cos - ly * sin,
    y: el.y + lx * sin + ly * cos,
  };
}

function getBezierData(p1: {x:number;y:number}, a1: Anchor, p2: {x:number;y:number}, a2: Anchor) {
  const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const off = Math.max(40, Math.min(200, dist * 0.45));
  let cx1 = p1.x, cy1 = p1.y, cx2 = p2.x, cy2 = p2.y;
  if (a1 === "right")  cx1 += off; else if (a1 === "left")   cx1 -= off;
  if (a1 === "bottom") cy1 += off; else if (a1 === "top")    cy1 -= off;
  if (a2 === "left")   cx2 -= off; else if (a2 === "right")  cx2 += off;
  if (a2 === "top")    cy2 -= off; else if (a2 === "bottom") cy2 += off;
  return { path: `M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${p2.x} ${p2.y}`, cx2, cy2 };
}

function arrowheadPath(px: number, py: number, cpx: number, cpy: number, size = 10) {
  const angle = Math.atan2(py - cpy, px - cpx);
  const a1 = angle - (Math.PI * 5) / 6;
  const a2 = angle + (Math.PI * 5) / 6;
  return `M ${px} ${py} L ${(px + size * Math.cos(a1)).toFixed(2)} ${(py + size * Math.sin(a1)).toFixed(2)} L ${(px + size * Math.cos(a2)).toFixed(2)} ${(py + size * Math.sin(a2)).toFixed(2)} Z`;
}

// ── ProjectFlow types ──────────────────────────────────────────────────────

type RenderItem = { id: string; name: string; fileUrl: string; fileType: string };
type FolderItem = { id: string; name: string; renders: RenderItem[] };
type RoomItem   = { id: string; name: string; folders: FolderItem[]; renders: RenderItem[] };

function RenderSidebarItem({ render, onClick }: { render: RenderItem; onClick: (url: string, name: string) => void }) {
  const isImage = render.fileType?.startsWith("image") || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(render.fileUrl);
  return (
    <button
      onClick={() => onClick(render.fileUrl, render.name)}
      className="flex flex-col rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all text-left"
      title={render.name}
    >
      <div className="aspect-square bg-muted w-full overflow-hidden flex items-center justify-center">
        {isImage
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover" />
          : <Image size={24} className="text-muted-foreground" />}
      </div>
      <p className="text-[11px] font-medium truncate px-2 py-1.5">{render.name}</p>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Template thumbnail ─────────────────────────────────────────────────────

function TemplateThumbnail({ template }: { template: MoodboardTemplate }) {
  const TW = 116;
  const TH = Math.round(TW / template.aspectRatio);
  const sortedSlots = [...template.slots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  return (
    <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} className="block rounded overflow-hidden">
      <rect width={TW} height={TH} fill={template.background ?? "#F2F3F7"} />
      {sortedSlots.map(slot => {
        const sx = slot.x * TW;
        const sy = slot.y * TH;
        const sw = slot.w * TW;
        if (slot.shape === 'circle') {
          const r = sw / 2;
          const cx = sx + r;
          const cy = sy + r;
          const fill = slot.role === 'swatch' ? '#C7CAD6' : '#D8DCE8';
          return <circle key={slot.id} cx={cx} cy={cy} r={r} fill={fill} />;
        }
        const sh = (slot.h ?? slot.w) * TH;
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        const fill = slot.role === 'text' ? '#E8EDF5' : slot.role === 'swatch' ? '#C7CAD6' : slot.role === 'cutout' ? '#B8B0A8' : '#D8DCE8';
        const transform = slot.rotation
          ? `rotate(${slot.rotation} ${cx} ${cy})`
          : undefined;
        return <rect key={slot.id} x={sx} y={sy} width={sw} height={sh} rx="2" fill={fill} transform={transform} />;
      })}
    </svg>
  );
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

function CanvasImageNode({ el, isSelected, onSelect, onDragEnd, onTransformEnd, onMouseEnter, onMouseLeave, onDragStarted, onDragEnded, onContextMenu, onDragMove }: {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (attrs: Partial<CanvasElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragStarted: () => void;
  onDragEnded: () => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (el.imageUrl) loadImage(el.imageUrl, setImg);
  }, [el.imageUrl]);

  if (!img) return null;

  const w = el.width ?? 200;
  const h = el.height ?? 150;
  const hasCrop = el.cropLeft !== undefined;
  const cropProp = hasCrop ? {
    x: (el.cropLeft ?? 0) * img.naturalWidth,
    y: (el.cropTop ?? 0) * img.naturalHeight,
    width: ((el.cropRight ?? 1) - (el.cropLeft ?? 0)) * img.naturalWidth,
    height: ((el.cropBottom ?? 1) - (el.cropTop ?? 0)) * img.naturalHeight,
  } : undefined;

  return (
    <KonvaImage
      id={el.id}
      image={img}
      x={el.x} y={el.y}
      width={w} height={h}
      crop={cropProp}
      cornerRadius={el.cornerRadius ?? 0}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      draggable
      stroke={isSelected ? "#6366f1" : undefined}
      strokeWidth={isSelected ? 2 : 0}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStarted}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnded(); onDragEnd(e.target.x(), e.target.y()); }}
      onContextMenu={onContextMenu}
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

// ── Masked image (template slot filled with photo, inner pan/zoom) ─────────

function MaskedInnerImage({ el, isSelected, isInnerEdit, onSelect, onDblClick, onInnerDragEnd, onOuterDragEnd, onTransformEnd, onContextMenu, onMouseEnter, onMouseLeave, onDragStarted, onDragEnded, onDragMove }: {
  el: CanvasElement;
  isSelected: boolean;
  isInnerEdit: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onInnerDragEnd: (offX: number, offY: number) => void;
  onOuterDragEnd: (x: number, y: number) => void;
  onTransformEnd: (attrs: Partial<CanvasElement>) => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragStarted: () => void;
  onDragEnded: () => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (el.imageUrl) loadImage(el.imageUrl, setImg);
  }, [el.imageUrl]);
  if (!img) return null;

  const maskW = el.width ?? 200;
  const maskH = el.height ?? 150;
  const scale = el.innerScale ?? 1;
  const offX = el.innerOffsetX ?? 0;
  const offY = el.innerOffsetY ?? 0;
  const natW = el.naturalW ?? img.naturalWidth;
  const natH = el.naturalH ?? img.naturalHeight;
  const imgW = natW * scale;
  const imgH = natH * scale;
  const isCircle = el.maskShape === 'ellipse';

  const r = isCircle ? 0 : Math.min(el.cornerRadius ?? 0, maskW / 2, maskH / 2);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clipFn = (ctx: any) => {
    ctx.beginPath();
    if (isCircle) {
      ctx.ellipse(maskW / 2, maskH / 2, maskW / 2, maskH / 2, 0, 0, Math.PI * 2);
    } else if (r > 0) {
      ctx.roundRect(0, 0, maskW, maskH, r);
    } else {
      ctx.rect(0, 0, maskW, maskH);
    }
    ctx.closePath();
  };

  return (
    <Group
      id={el.id}
      x={el.x} y={el.y}
      rotation={el.rotation ?? 0}
      opacity={el.opacity ?? 1}
      clipFunc={clipFn}
      draggable={!isInnerEdit}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStarted}
      onDragMove={onDragMove}
      onDragEnd={(e) => { if (isInnerEdit) return; onDragEnded(); onOuterDragEnd(e.target.x(), e.target.y()); }}
      onContextMenu={onContextMenu}
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
    >
      <KonvaImage
        image={img}
        x={offX} y={offY}
        width={imgW} height={imgH}
        draggable={isInnerEdit}
        onDragEnd={(e) => {
          e.cancelBubble = true; // prevent bubbling to Group's onDragEnd
          const nx = Math.max(maskW - imgW, Math.min(0, e.target.x()));
          const ny = Math.max(maskH - imgH, Math.min(0, e.target.y()));
          e.target.position({ x: nx, y: ny });
          onInnerDragEnd(nx, ny);
        }}
      />
      {/* Border overlay (shown when selected or in inner edit mode) */}
      <Rect
        width={maskW} height={maskH}
        fill="transparent"
        stroke={isInnerEdit ? "#6366f1" : isSelected ? "#6366f1" : undefined}
        strokeWidth={isInnerEdit ? 2 : isSelected ? 2 : 0}
        dash={isInnerEdit ? [6, 3] : undefined}
        listening={false}
      />
    </Group>
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
  const initBg = parsed?.background ?? '#FFFFFF';

  // State
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<CanvasElement[]>(initElements);
  const [canvasBg, setCanvasBg] = useState<string>(initBg);
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
  const [rightTab, setRightTab] = useState<"projectflow" | "products" | "lists">("projectflow");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  type ListProduct = { id: string; name: string; imageUrl: string | null; price: string | null };
  type ListSection = { id: string; name: string; products: ListProduct[] };
  type ShoppingListItem = { id: string; name: string; sections: ListSection[] };
  const [lists, setLists] = useState<ShoppingListItem[]>([]);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const spaceDownRef = useRef(false);
  // Connection dragging — refs for use in event handlers (avoid stale closures)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  type DraggingConn = { sourceId: string; sourceAnchor: Anchor; currentX: number; currentY: number };
  const draggingConnRef = useRef<DraggingConn | null>(null);
  const [draggingConn, setDraggingConn] = useState<DraggingConn | null>(null);
  const nearestAnchorRef = useRef<{ elementId: string; anchor: Anchor } | null>(null);
  const [nearestAnchor, setNearestAnchor] = useState<{ elementId: string; anchor: Anchor } | null>(null);
  const isConnecting = useRef(false);
  const isDragging = useRef(false);
  // Rubber-band (marquee) selection
  const isSelBoxing = useRef(false);
  const selBoxStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ screenX: number; screenY: number; elementId: string } | null>(null);
  const [customFillColor, setCustomFillColor] = useState("");
  const [customStrokeColor, setCustomStrokeColor] = useState("");
  // Crop mode
  const [cropMode, setCropMode] = useState<string | null>(null);
  type CropRect = { left: number; top: number; right: number; bottom: number };
  const [cropRect, setCropRect] = useState<CropRect>({ left: 0, top: 0, right: 1, bottom: 1 });
  const cropDragRef = useRef<{ handle: string; startX: number; startY: number; startRect: CropRect } | null>(null);
  // Remove background
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);
  // Snap guide lines (canvas coords)
  const [snapLines, setSnapLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const [rotationGuide, setRotationGuide] = useState<{ cx: number; cy: number; angle: number } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [gridMode, setGridMode] = useState<"dots" | "grid" | "none">(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("moodboard-grid");
      if (s === "dots" || s === "grid" || s === "none") return s;
    }
    return "dots";
  });
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [penPoints, setPenPoints] = useState<number[]>([]);
  const penStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPenDrawingRef = useRef(false);
  const [penColor, setPenColor] = useState("#334155");
  const [penWidth, setPenWidth] = useState(2);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef2 = useRef(0);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  // Template gallery
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  // Template placeholder pick mode — id of placeholder waiting to be filled from canvas
  const [templatePickModeId, setTemplatePickModeId] = useState<string | null>(null);
  // Inner edit mode — id of masked image currently being panned/zoomed inside its mask
  const [innerEditId, setInnerEditId] = useState<string | null>(null);
  // Frame tool
  const [framePreset, setFramePreset] = useState<FramePresetId>("custom");
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [renameFrameId, setRenameFrameId] = useState<string | null>(null);
  const [renameFrameValue, setRenameFrameValue] = useState("");
  const [frameMenuId, setFrameMenuId] = useState<string | null>(null);
  const [exportFrameId, setExportFrameId] = useState<string | null>(null);
  // Edit modal
  const router = useRouter();
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editClientId, setEditClientId] = useState<string>(client?.id ?? "");
  const [editProjectId, setEditProjectId] = useState<string>(project?.id ?? "");
  const [editClients, setEditClients] = useState<{ id: string; name: string; projects: { id: string; title: string }[] }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  // Transformer visibility (React-controlled to avoid react-konva prop override)
  const [transformerVisible, setTransformerVisible] = useState(false);
  // Export
  const [exportMode, setExportMode] = useState(false);
  const [exportRect, setExportRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isExportDrawing, setIsExportDrawing] = useState(false);
  const exportDrawStartRef = useRef<{ x: number; y: number } | null>(null);
  // Clipboard for copy/paste
  const clipboardRef = useRef<CanvasElement[]>([]);

  // Reset custom colors when selection changes
  const firstSelectedId = selectedIds[0] ?? null;
  useEffect(() => {
    setCustomFillColor("");
    setCustomStrokeColor("");
  }, [firstSelectedId]);

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

  // ── Remove background ──────────────────────────────────────────────────────
  async function handleRemoveBg(el: CanvasElement) {
    if (!el.imageUrl || removingBgId) return;
    setRemovingBgId(el.id);
    try {
      const { removeBackground } = await import("@imgly/background-removal");

      // Fetch image as Blob first to avoid CORS issues inside the library's worker
      let imageSource: Blob | string = el.imageUrl;
      try {
        const resp = await fetch(el.imageUrl, { mode: "cors" });
        if (resp.ok) imageSource = await resp.blob();
      } catch {
        // If prefetch fails, fall back to passing URL directly
      }

      const resultBlob = await removeBackground(imageSource, {
        debug: false,
        publicPath: `https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/`,
      });
      const url = URL.createObjectURL(resultBlob);
      imageCache.delete(el.imageUrl);
      updateEl(el.id, { imageUrl: url, cropLeft: undefined, cropTop: undefined, cropRight: undefined, cropBottom: undefined });
      toast.success("Tło usunięte");
    } catch (err) {
      console.error("[removeBg]", err);
      toast.error("Błąd podczas usuwania tła");
    } finally {
      setRemovingBgId(null);
    }
  }

  // ── Crop ───────────────────────────────────────────────────────────────────
  function enterCropMode(el: CanvasElement) {
    setCropRect({
      left: el.cropLeft ?? 0,
      top: el.cropTop ?? 0,
      right: el.cropRight ?? 1,
      bottom: el.cropBottom ?? 1,
    });
    setCropMode(el.id);
  }

  function confirmCrop() {
    if (!cropMode) return;
    const el = elements.find(e => e.id === cropMode);
    if (!el || !el.imageUrl) return;
    const elW = el.width ?? 200;
    const elH = el.height ?? 150;
    const img = imageCache.get(el.imageUrl);

    // New display size must match the crop region's natural aspect ratio to avoid distortion.
    // We keep the display width proportional to how much of the element width was selected,
    // then derive height from the crop's natural aspect ratio.
    let newW: number;
    let newH: number;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const cropNatW = (cropRect.right - cropRect.left) * img.naturalWidth;
      const cropNatH = (cropRect.bottom - cropRect.top) * img.naturalHeight;
      const cropAspect = cropNatW / cropNatH;
      // Keep width proportional to selection width, derive height from natural aspect ratio
      newW = (cropRect.right - cropRect.left) * elW;
      newH = newW / cropAspect;
    } else {
      newW = (cropRect.right - cropRect.left) * elW;
      newH = (cropRect.bottom - cropRect.top) * elH;
    }

    updateEl(cropMode, {
      cropLeft: cropRect.left,
      cropTop: cropRect.top,
      cropRight: cropRect.right,
      cropBottom: cropRect.bottom,
      width: Math.max(10, newW),
      height: Math.max(10, newH),
    });
    setCropMode(null);
  }

  function resetCrop() {
    const targetId = cropMode ?? firstSelectedId;
    if (!targetId) return;
    updateEl(targetId, { cropLeft: undefined, cropTop: undefined, cropRight: undefined, cropBottom: undefined });
    setCropMode(null);
  }

  // ── Duplicate / Copy / Paste ───────────────────────────────────────────────
  function duplicateElements(ids: string[]) {
    const targets = elements.filter(e => ids.includes(e.id) && e.type !== "connection");
    if (targets.length === 0) return;
    const OFFSET = 20;
    const newEls: CanvasElement[] = targets.map(el => ({
      ...el,
      id: Math.random().toString(36).slice(2),
      x: el.x + OFFSET,
      y: el.y + OFFSET,
    }));
    const next = [...elements, ...newEls];
    updateElements(next);
    setSelectedIds(newEls.map(e => e.id));
  }

  function copySelected() {
    const targets = elements.filter(e => selectedIds.includes(e.id) && e.type !== "connection");
    clipboardRef.current = targets;
  }

  function pasteClipboard() {
    if (clipboardRef.current.length === 0) return;
    const OFFSET = 20;
    const newEls: CanvasElement[] = clipboardRef.current.map(el => ({
      ...el,
      id: Math.random().toString(36).slice(2),
      x: el.x + OFFSET,
      y: el.y + OFFSET,
    }));
    // Shift clipboard so repeated pastes don't stack on the same spot
    clipboardRef.current = newEls;
    const next = [...elements, ...newEls];
    updateElements(next);
    setSelectedIds(newEls.map(e => e.id));
  }

  // Load sidebar data when opened
  function loadRooms() {
    if (!project?.id) return;
    fetch(`/api/projects/${project.id}/project-renders`)
      .then(r => r.ok ? r.json() : [])
      .then((data: RoomItem[]) => {
        setRooms(data);
        setExpandedRooms(new Set(data.map((r) => r.id)));
        setExpandedFolders(new Set(data.flatMap((r) => r.folders.map((f) => f.id))));
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!rightSidebarOpen) return;
    if (rightTab === "projectflow") loadRooms();
    if (rightTab === "products") {
      fetch("/api/products").then(r => r.ok ? r.json() : []).then((data: { id: string; name: string; imageUrl: string | null }[]) => setProducts(data)).catch(() => {});
    }
    if (rightTab === "lists" && client?.id) {
      fetch(`/api/clients/${client.id}/shopping-lists`)
        .then(r => r.ok ? r.json() : [])
        .then((data: ShoppingListItem[]) => {
          setLists(data);
          setExpandedLists(new Set(data.map(l => l.id)));
          setExpandedSections(new Set(data.flatMap(l => l.sections.map(s => s.id))));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightSidebarOpen, rightTab, project?.id, client?.id]);

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
  function scheduleSave(els: CanvasElement[], vp?: { x: number; y: number; scale: number }, bg?: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const viewport = vp ?? { x: stagePos.x, y: stagePos.y, scale: stageScale };
      const background = bg ?? canvasBg;
      fetch(`/api/moodboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasData: { elements: els, viewport, background } }),
      }).catch(() => {});
    }, 800);
  }

  function updateCanvasBg(color: string) {
    setCanvasBg(color);
    scheduleSave(elements, undefined, color);
  }

  // Undo / Redo
  function undo() {
    if (historyIndex <= 0) return;
    const ni = historyIndex - 1;
    const snapshot = history[ni];
    if (!Array.isArray(snapshot)) return;
    setHistoryIndex(ni);
    setElements(snapshot);
    setSelectedIds([]);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const ni = historyIndex + 1;
    const snapshot = history[ni];
    if (!Array.isArray(snapshot)) return;
    setHistoryIndex(ni);
    setElements(snapshot);
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
      // Space = temporary hand/pan mode
      if (e.key === " " && !editingTextId) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          if (!spaceDownRef.current) {
            spaceDownRef.current = true;
            setSpaceDown(true);
          }
          return;
        }
      }

      if (editingTextId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          updateElements(elements.filter((el) => {
            if (selectedIds.includes(el.id)) return false;
            if (el.type === "connection" && (selectedIds.includes(el.sourceId ?? "") || selectedIds.includes(el.targetId ?? ""))) return false;
            return true;
          }).map(el => selectedIds.includes(el.frameId ?? "") ? { ...el, frameId: undefined } : el));
          setSelectedIds([]);
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key === "y") || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
        if (e.key === "c") { e.preventDefault(); copySelected(); }
        if (e.key === "v") { e.preventDefault(); pasteClipboard(); }
        if (e.key === "d") { e.preventDefault(); duplicateElements(selectedIds); }
      }
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "Escape" && innerEditId) { setInnerEditId(null); return; }
        if (e.key === "Escape" && templatePickModeId) { setTemplatePickModeId(null); return; }
        if (e.key === "v" || e.key === "Escape") setTool("select");
        if (e.key === "h") setTool("hand");
        if (e.key === "r") setTool("rect");
        if (e.key === "o") setTool("ellipse");
        if (e.key === "t") setTool("text");
        if (e.key === "a") setTool("arrow");
        if (e.key === "l") setTool("line");
        if (e.key === "n") setTool("note");
        if (e.key === "p") setTool("pen");
        if (e.key === "f") setTool("frame");
      }
    }
    function onKeyUp(e: globalThis.KeyboardEvent) {
      if (e.key === " ") {
        spaceDownRef.current = false;
        setSpaceDown(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selectedIds, elements, editingTextId, historyIndex, history, innerEditId, templatePickModeId]);

  // Types that get transformer handles
  const TRANSFORMABLE = new Set(["rect", "ellipse", "note", "image", "frame"]);

  // Update transformer when selection changes
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const stage = stageRef.current;
    if (!stage) return;
    const nodes = selectedIds
      .filter(sid => {
        const el = elements.find(e => e.id === sid);
        if (!el) return false;
        if (!TRANSFORMABLE.has(el.type)) return false;
        if (el.innerScale !== undefined) return false; // masked images: no standard transformer
        return true;
      })
      .map((sid) => stage.findOne("#" + sid)).filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    setTransformerVisible(nodes.length > 0);
    tr.getLayer()?.batchDraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, elements]);

  // Zoom with wheel
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();

    // Inner edit mode: zoom the masked image instead of the stage
    if (innerEditId) {
      const masked = elements.find(el => el.id === innerEditId);
      if (masked && masked.innerScale !== undefined) {
        const scaleBy = 1.05;
        const newScale = e.evt.deltaY < 0 ? masked.innerScale * scaleBy : masked.innerScale / scaleBy;
        const maskW = masked.width ?? 200;
        const maskH = masked.height ?? 150;
        const natW = masked.naturalW ?? 1;
        const natH = masked.naturalH ?? 1;
        const minScale = Math.max(maskW / natW, maskH / natH);
        const clampedScale = Math.max(minScale, newScale);
        const imgW = natW * clampedScale;
        const imgH = natH * clampedScale;
        const offX = Math.max(maskW - imgW, Math.min(0, masked.innerOffsetX ?? 0));
        const offY = Math.max(maskH - imgH, Math.min(0, masked.innerOffsetY ?? 0));
        updateEl(innerEditId, { innerScale: clampedScale, innerOffsetX: offX, innerOffsetY: offY });
        return;
      }
    }

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
    if (isConnecting.current) return;
    const isStage = e.target === e.target.getStage();

    // Middle mouse, hand tool, or space held = pan
    if (e.evt.button === 1 || tool === "hand" || spaceDownRef.current) {
      setIsPanning(true);
      return;
    }

    if (tool === "select") {
      if (isStage) {
        if (innerEditId) { setInnerEditId(null); return; }
        // Left-click drag on empty canvas = rubber-band selection
        const pos = stagePoint(e.evt.clientX, e.evt.clientY);
        isSelBoxing.current = true;
        selBoxStartRef.current = pos;
        setSelBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
        setSelectedIds([]);
      }
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

    if (tool === "pen") {
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      isPenDrawingRef.current = true;
      penStartRef.current = pos;
      setPenPoints([0, 0]);
      return;
    }

    if (tool === "frame") {
      if (!isStage) return;
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      if (framePreset === "custom") {
        // freehand draw
        setIsDrawing(true);
        setDrawStart(pos);
        setDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      } else {
        // click-to-place preset
        const preset = FRAME_PRESETS.find(p => p.id === framePreset)!;
        const newEl: CanvasElement = {
          id: uid(), type: "frame",
          x: pos.x - preset.w / 2, y: pos.y - preset.h / 2,
          width: preset.w, height: preset.h,
          frameName: `Frame`,
          fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 1, opacity: 1,
        };
        const next = [...elements, newEl];
        updateElements(next);
        setSelectedIds([newEl.id]);
        setTool("select");
      }
      return;
    }

    if (!isStage) return;
    const pos = stagePoint(e.evt.clientX, e.evt.clientY);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    updateHoverFromPosition(e.evt.clientX, e.evt.clientY);
    if (isSelBoxing.current && selBoxStartRef.current) {
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      const start = selBoxStartRef.current;
      setSelBox({ x: Math.min(pos.x, start.x), y: Math.min(pos.y, start.y), w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y) });
      return;
    }
    if (draggingConnRef.current) {
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      const updated = { ...draggingConnRef.current, currentX: pos.x, currentY: pos.y };
      draggingConnRef.current = updated;
      setDraggingConn({ ...updated });
      // Find nearest anchor within 30px screen-space
      const threshold = 30 / stageScale;
      let nearest: { elementId: string; anchor: Anchor } | null = null;
      let minDist = threshold;
      for (const el of elements) {
        if (el.id === draggingConnRef.current.sourceId || el.type === "connection") continue;
        for (const anchor of ["top", "right", "bottom", "left"] as Anchor[]) {
          const pt = getAnchorPoint(el, anchor);
          const dist = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
          if (dist < minDist) { minDist = dist; nearest = { elementId: el.id, anchor }; }
        }
      }
      nearestAnchorRef.current = nearest;
      setNearestAnchor(nearest);
      return;
    }
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage) return;
      const newPos = { x: stagePos.x + e.evt.movementX, y: stagePos.y + e.evt.movementY };
      setStagePos(newPos);
      scheduleSave(elements, { ...newPos, scale: stageScale });
      return;
    }
    if (isPenDrawingRef.current && penStartRef.current) {
      const pos = stagePoint(e.evt.clientX, e.evt.clientY);
      const dx = pos.x - penStartRef.current.x;
      const dy = pos.y - penStartRef.current.y;
      setPenPoints((prev) => [...prev, dx, dy]);
      return;
    }
    if (!isDrawing || !drawStart) return;
    const pos = stagePoint(e.evt.clientX, e.evt.clientY);
    let rawW = Math.abs(pos.x - drawStart.x);
    let rawH = Math.abs(pos.y - drawStart.y);
    if (e.evt.shiftKey && (tool === "rect" || tool === "ellipse")) {
      const side = Math.max(rawW, rawH);
      rawW = side; rawH = side;
    }
    const rx = pos.x >= drawStart.x ? drawStart.x : drawStart.x - rawW;
    const ry = pos.y >= drawStart.y ? drawStart.y : drawStart.y - rawH;
    setDrawRect({ x: rx, y: ry, w: rawW, h: rawH });
  }

  function updateHoverFromPosition(clientX: number, clientY: number) {
    if (tool !== "select" || draggingConnRef.current || isSelBoxing.current || isPanning || isDragging.current) return;
    const pos = stagePoint(clientX, clientY);
    const threshold = 20 / stageScale;
    let found: string | null = null;
    // Iterate in reverse so topmost (last rendered) element wins over elements below it.
    // Skip connections and frames — frames have no anchor hooks and their large bounds
    // would block hover detection of elements inside them.
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "connection" || el.type === "frame") continue;
      const b = getElementBounds(el);
      const cx = Math.max(b.x, Math.min(pos.x, b.x + b.width));
      const cy = Math.max(b.y, Math.min(pos.y, b.y + b.height));
      if (Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2) < threshold) {
        found = el.id;
        break;
      }
    }
    setHoveredElementId(found);
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isSelBoxing.current) {
      isSelBoxing.current = false;
      const box = selBox;
      if (box && box.w > 4 && box.h > 4) {
        const hit = elements
          .filter(el => el.type !== "connection")
          .filter(el => {
            const b = getElementBounds(el);
            return b.x < box.x + box.w && b.x + b.width > box.x && b.y < box.y + box.h && b.y + b.height > box.y;
          })
          .map(el => el.id);
        setSelectedIds(hit);
      }
      setSelBox(null);
      selBoxStartRef.current = null;
      return;
    }
    if (draggingConnRef.current) {
      isConnecting.current = false;
      const dc = draggingConnRef.current;
      const na = nearestAnchorRef.current;
      if (na && na.elementId !== dc.sourceId) {
        const newEl: CanvasElement = {
          id: uid(), type: "connection", x: 0, y: 0,
          sourceId: dc.sourceId, sourceAnchor: dc.sourceAnchor,
          targetId: na.elementId, targetAnchor: na.anchor,
          stroke: "#334155", strokeWidth: 2, opacity: 1,
        };
        updateElements([...elements, newEl]);
      }
      draggingConnRef.current = null;
      nearestAnchorRef.current = null;
      setDraggingConn(null);
      setNearestAnchor(null);
      return;
    }
    if (isPenDrawingRef.current && penStartRef.current) {
      isPenDrawingRef.current = false;
      if (penPoints.length >= 4) {
        const newEl: CanvasElement = {
          id: uid(), type: "freehand",
          x: penStartRef.current.x, y: penStartRef.current.y,
          points: penPoints,
          stroke: penColor, strokeWidth: penWidth, opacity: 1,
        };
        const next = [...elements, newEl];
        updateElements(next);
        setTool("select");
      }
      setPenPoints([]);
      penStartRef.current = null;
      return;
    }
    if (isPanning) { setIsPanning(false); return; }
    if (!isDrawing || !drawStart || !drawRect) { setIsDrawing(false); return; }
    setIsDrawing(false);

    const w = drawRect.w || 120;
    const h = drawRect.h || 80;
    if (w < 5 && h < 5) { setDrawRect(null); return; }

    const pos = { x: drawRect.x, y: drawRect.y };
    let newEl: CanvasElement | null = null;

    if (tool === "frame") {
      newEl = { id: uid(), type: "frame", x: pos.x, y: pos.y, width: w, height: h, frameName: "Frame", fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 1, opacity: 1 };
    } else if (tool === "rect") {
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

  // ── Snap helper — called from onDragMove for any draggable element ──────────
  function applySnap(e: Konva.KonvaEventObject<DragEvent>, el: CanvasElement) {
    if (selectedIds.length > 1) { setSnapLines([]); return; }
    const nx = e.target.x();
    const ny = e.target.y();
    const w = el.width ?? 120;
    const h = el.height ?? 80;
    const threshold = 8 / stageScale;
    const newLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let bestDX = threshold + 1;
    let bestDY = threshold + 1;
    let snappedX = nx;
    let snappedY = ny;
    for (const other of elements) {
      if (other.id === el.id || other.type === "connection" || selectedIds.includes(other.id)) continue;
      const ow = other.width ?? 120;
      const oh = other.height ?? 80;
      const ox = other.type === "ellipse" ? other.x - ow / 2 : other.x;
      const oy = other.type === "ellipse" ? other.y - oh / 2 : other.y;
      for (const [dxc, oxc] of [
        [nx, ox], [nx, ox + ow / 2], [nx, ox + ow],
        [nx + w / 2, ox], [nx + w / 2, ox + ow / 2], [nx + w / 2, ox + ow],
        [nx + w, ox], [nx + w, ox + ow / 2], [nx + w, ox + ow],
      ]) {
        const dist = Math.abs(dxc - oxc);
        if (dist < threshold && dist < bestDX) {
          bestDX = dist; snappedX = nx + (oxc - dxc);
          newLines.push({ x1: oxc, y1: -9999, x2: oxc, y2: 9999 });
        }
      }
      for (const [dyc, oyc] of [
        [ny, oy], [ny, oy + oh / 2], [ny, oy + oh],
        [ny + h / 2, oy], [ny + h / 2, oy + oh / 2], [ny + h / 2, oy + oh],
        [ny + h, oy], [ny + h, oy + oh / 2], [ny + h, oy + oh],
      ]) {
        const dist = Math.abs(dyc - oyc);
        if (dist < threshold && dist < bestDY) {
          bestDY = dist; snappedY = ny + (oyc - dyc);
          newLines.push({ x1: -9999, y1: oyc, x2: 9999, y2: oyc });
        }
      }
    }
    if (snappedX !== nx || snappedY !== ny) e.target.position({ x: snappedX, y: snappedY });
    setSnapLines(newLines);
  }

  // Update element property
  function updateEl(elId: string, patch: Partial<CanvasElement>) {
    const next = elements.map((el) => el.id === elId ? { ...el, ...patch } : el);
    updateElements(next);
  }

  function applyTemplate(template: MoodboardTemplate) {
    // Base canvas size: 700px wide, height derived from aspect ratio
    const canvasW = 700;
    const canvasH = Math.round(canvasW / template.aspectRatio);

    // Center on current viewport
    const vpCx = (containerSize.w / 2 - stagePos.x) / stageScale;
    const vpCy = (containerSize.h / 2 - stagePos.y) / stageScale;
    const originX = vpCx - canvasW / 2;
    const originY = vpCy - canvasH / 2;

    const newEls: CanvasElement[] = template.slots.map(slot => {
      const isCircle = slot.shape === 'circle';
      const slotX = originX + slot.x * canvasW;
      const slotY = originY + slot.y * canvasH;
      const diamPx = slot.w * canvasW;

      const isFlatlay = template.category === 'flatlay';
      const placeholderFill = isFlatlay ? 'rgba(255,255,255,0.55)' : (slot.role === 'swatch' ? '#E2E8F0' : '#F2F3F7');
      const tplCat: 'flatlay' | undefined = isFlatlay ? 'flatlay' : undefined;

      if (isCircle) {
        // Ellipse: x/y is center in Konva
        return {
          id: uid(),
          type: 'ellipse' as const,
          x: slotX + diamPx / 2,
          y: slotY + diamPx / 2,
          width: diamPx,
          height: diamPx,
          fill: placeholderFill,
          stroke: '#C7CAD6',
          strokeWidth: 1,
          rotation: 0,
          zIndex: slot.z ?? 0,
          templateRole: slot.role,
          templateLabel: slot.label?.pl,
          templateCategory: tplCat,
        };
      }

      if (slot.role === 'text') {
        loadGoogleFont('Caveat');
        return {
          id: uid(),
          type: 'text' as const,
          x: slotX,
          y: slotY,
          width: slot.w * canvasW,
          height: (slot.h ?? 0.1) * canvasH,
          text: slot.label?.pl ?? 'Tekst',
          fontSize: 16,
          fontFamily: 'Caveat',
          fill: '#6B6F80',
          rotation: slot.rotation ?? 0,
          zIndex: slot.z ?? 0,
          templateRole: 'text' as const,
          templateLabel: slot.label?.pl,
          templateCategory: tplCat,
        };
      }

      return {
        id: uid(),
        type: 'rect' as const,
        x: slotX,
        y: slotY,
        width: slot.w * canvasW,
        height: (slot.h ?? slot.w) * canvasH,
        fill: placeholderFill,
        stroke: '#C7CAD6',
        strokeWidth: 1,
        rotation: slot.rotation ?? 0,
        zIndex: slot.z ?? 0,
        templateRole: slot.role,
        templateLabel: slot.label?.pl,
        templateCategory: tplCat,
      };
    });

    // Sort by zIndex ascending so higher-z elements render last (on top)
    newEls.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    updateElements([...elements, ...newEls]);
    setSelectedIds(newEls.map(e => e.id));
    if (template.background) updateCanvasBg(template.background);
    setTemplateGalleryOpen(false);
    setTool('select');
  }

  function updateSelected(patch: Partial<CanvasElement>) {
    const next = elements.map((el) => selectedIds.includes(el.id) ? { ...el, ...patch } : el);
    updateElements(next);
  }

  // Z-order operations (elements array order = render order; last = on top)
  function moveForward(elId: string) {
    const idx = elements.findIndex(e => e.id === elId);
    if (idx < 0 || idx >= elements.length - 1) return;
    const next = [...elements];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateElements(next);
  }
  function moveBackward(elId: string) {
    const idx = elements.findIndex(e => e.id === elId);
    if (idx <= 0) return;
    const next = [...elements];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    updateElements(next);
  }
  function bringToFront(elId: string) {
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    updateElements([...elements.filter(e => e.id !== elId), el]);
  }
  function sendToBack(elId: string) {
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    updateElements([el, ...elements.filter(e => e.id !== elId)]);
  }

  const safeElements = Array.isArray(elements) ? elements : [];
  const selected = safeElements.filter((el) => selectedIds.includes(el.id));
  const firstSelected = selected[0];

  // Share toggle
  async function openEditModal() {
    setEditMenuOpen(false);
    setEditTitle(title);
    setEditClientId(client?.id ?? "");
    setEditProjectId(project?.id ?? "");
    setEditModalOpen(true);
    const res = await fetch("/api/clients");
    if (res.ok) setEditClients(await res.json());
  }

  async function handleSaveEdit() {
    if (editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/moodboards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || title,
          clientId: editClientId || null,
          projectId: editProjectId || null,
        }),
      });
      if (res.ok) {
        if (editTitle.trim()) setTitle(editTitle.trim());
        setEditModalOpen(false);
        router.refresh();
        toast.success("Zapisano zmiany");
      } else {
        toast.error("Błąd zapisu");
      }
    } finally {
      setEditSaving(false);
    }
  }

  function handleExportMouseDown(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    exportDrawStartRef.current = { x, y };
    setIsExportDrawing(true);
    setExportRect({ x, y, w: 0, h: 0 });
  }

  function handleExportMouseMove(e: React.MouseEvent) {
    if (!isExportDrawing || !exportDrawStartRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const x = Math.min(cx, exportDrawStartRef.current.x);
    const y = Math.min(cy, exportDrawStartRef.current.y);
    setExportRect({ x, y, w: Math.abs(cx - exportDrawStartRef.current.x), h: Math.abs(cy - exportDrawStartRef.current.y) });
  }

  function handleExportMouseUp() {
    setIsExportDrawing(false);
  }

  function doExportJpg() {
    if (!exportRect || !stageRef.current) return;
    const { x, y, w, h } = exportRect;
    const pixelRatio = 2;
    // toDataURL x/y/w/h are in canvas pixel space (not Konva element coords)
    const konvaUrl = stageRef.current.toDataURL({
      x, y, width: w, height: h, pixelRatio,
    } as Parameters<typeof stageRef.current.toDataURL>[0]);
    // Composite onto background-colored canvas (JPEG has no transparency)
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * pixelRatio);
    canvas.height = Math.round(h * pixelRatio);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = canvasBg ?? "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const finalUrl = canvas.toDataURL("image/jpeg", 0.92);
      const link = document.createElement("a");
      link.download = `${title || "moodboard"}.jpg`;
      link.href = finalUrl;
      link.click();
      setExportMode(false);
      setExportRect(null);
    };
    img.src = konvaUrl;
  }

  async function exportFrame(frameElId: string, format: "png" | "jpg" | "pdf") {
    const frameEl = elements.find(e => e.id === frameElId);
    if (!frameEl || !stageRef.current) return;
    const pixelRatio = 2;
    // Convert frame canvas coords to screen pixel coords
    const sx = frameEl.x * stageScale + stagePos.x;
    const sy = frameEl.y * stageScale + stagePos.y;
    const sw = (frameEl.width ?? 0) * stageScale;
    const sh = (frameEl.height ?? 0) * stageScale;
    // Hide UI-only Konva nodes that must not appear in the export:
    // anchor hook circles and the transformer handles
    const layer = stageRef.current.getLayers()[0];
    const uiCircles = layer?.find("Circle") ?? [];
    uiCircles.forEach((n: Konva.Node) => n.hide());
    transformerRef.current?.visible(false);
    layer?.batchDraw();

    const konvaUrl = stageRef.current.toDataURL({ x: sx, y: sy, width: sw, height: sh, pixelRatio } as Parameters<typeof stageRef.current.toDataURL>[0]);

    // Restore hidden nodes
    uiCircles.forEach((n: Konva.Node) => n.show());
    transformerRef.current?.visible(transformerVisible);
    layer?.batchDraw();
    const baseName = (frameEl.frameName || title || "frame").replace(/[^a-z0-9_\-]/gi, "_");

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * pixelRatio);
    canvas.height = Math.round(sh * pixelRatio);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await new Promise<void>(resolve => {
      const img = new window.Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
      img.src = konvaUrl;
    });

    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const wMm = (canvas.width / pixelRatio / 96) * 25.4;
      const hMm = (canvas.height / pixelRatio / 96) * 25.4;
      const pdf = new jsPDF({ orientation: wMm > hMm ? "landscape" : "portrait", unit: "mm", format: [wMm, hMm] });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, wMm, hMm);
      pdf.save(`${baseName}.pdf`);
    } else if (format === "png") {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${baseName}.png`;
      link.href = url;
      link.click();
    } else {
      const url = canvas.toDataURL("image/jpeg", 0.92);
      const link = document.createElement("a");
      link.download = `${baseName}.jpg`;
      link.href = url;
      link.click();
    }
    setExportFrameId(null);
  }

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
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef2.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const dropX = e.clientX;
    const dropY = e.clientY;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const maxW = 400, maxH = 300;
          const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
          const w = img.naturalWidth * ratio, h = img.naturalHeight * ratio;
          const OFFSET = i * 20;
          const pos = stagePoint(dropX + OFFSET, dropY + OFFSET);
          const newEl: CanvasElement = { id: uid(), type: "image", x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, imageUrl: url, opacity: 1, rotation: 0 };
          setElements((prev) => {
            const next = [...prev, newEl];
            pushHistory(next);
            scheduleSave(next);
            return next;
          });
          setSelectedIds((prev) => [...prev, newEl.id]);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }

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

  function fillPlaceholderWithImage(placeholderId: string, sourceEl: CanvasElement) {
    if (!sourceEl.imageUrl) return;
    const placeholder = elements.find(el => el.id === placeholderId);
    if (!placeholder) return;

    const maskW = placeholder.width ?? 200;
    const maskH = placeholder.height ?? 150;
    const maskShape: 'rect' | 'ellipse' = placeholder.type === 'ellipse' ? 'ellipse' : 'rect';
    const maskX = placeholder.type === 'ellipse' ? placeholder.x - maskW / 2 : placeholder.x;
    const maskY = placeholder.type === 'ellipse' ? placeholder.y - maskH / 2 : placeholder.y;

    loadImage(sourceEl.imageUrl, (img) => {
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const coverScale = Math.max(maskW / natW, maskH / natH);
      const imgW = natW * coverScale;
      const imgH = natH * coverScale;
      const innerOffsetX = (maskW - imgW) / 2;
      const innerOffsetY = (maskH - imgH) / 2;

      updateEl(placeholderId, {
        type: 'image' as const,
        imageUrl: sourceEl.imageUrl!,
        x: maskX,
        y: maskY,
        width: maskW,
        height: maskH,
        fill: undefined,
        stroke: undefined,
        strokeWidth: undefined,
        templateRole: undefined,
        templateLabel: undefined,
        maskShape,
        naturalW: natW,
        naturalH: natH,
        innerScale: coverScale,
        innerOffsetX,
        innerOffsetY,
      });
      setTemplatePickModeId(null);
      setSelectedIds([placeholderId]);
    });
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
    pen: "crosshair",
    frame: framePreset === "custom" ? "crosshair" : "copy",
  };
  const [anchorHovered, setAnchorHovered] = useState(false);
  const activeCursor = spaceDown
    ? (isPanning ? "grabbing" : "grab")
    : anchorHovered ? "crosshair" : cursorMap[tool];

  const q = sidebarQuery.toLowerCase();
  const filteredRooms = q
    ? rooms.map(room => ({
        ...room,
        folders: room.folders
          .map(f => ({ ...f, renders: f.renders.filter(r => r.name.toLowerCase().includes(q)) }))
          .filter(f => f.renders.length > 0 || f.name.toLowerCase().includes(q)),
        renders: room.renders.filter(r => r.name.toLowerCase().includes(q)),
      })).filter(room => room.renders.length > 0 || room.folders.length > 0 || room.name.toLowerCase().includes(q))
    : rooms;
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(sidebarQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full select-none">
      {/* Template gallery modal */}
      {templateGalleryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Szablony moodboardu</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Wybierz szablon jako punkt startowy — każdy element możesz potem dowolnie edytować</p>
              </div>
              <button
                onClick={() => setTemplateGalleryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              {/* Grid section */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Siatki klasyczne</p>
                <div className="grid grid-cols-5 gap-3">
                  {MOODBOARD_TEMPLATES.filter(t => t.category === 'grid').map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-[14px] border-2 border-border hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left group"
                    >
                      <div className="rounded-lg overflow-hidden border border-border/60 group-hover:border-primary/30 transition-colors">
                        <TemplateThumbnail template={t} />
                      </div>
                      <span className="text-[11.5px] font-medium text-foreground leading-tight text-center w-full">{t.name.pl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Freeform section */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Kolaże swobodne</p>
                <div className="grid grid-cols-5 gap-3">
                  {MOODBOARD_TEMPLATES.filter(t => t.category === 'freeform').map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-[14px] border-2 border-border hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left group"
                    >
                      <div className="rounded-lg overflow-hidden border border-border/60 group-hover:border-primary/30 transition-colors">
                        <TemplateThumbnail template={t} />
                      </div>
                      <span className="text-[11.5px] font-medium text-foreground leading-tight text-center w-full">{t.name.pl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flat lay section */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Flat lay</p>
                <div className="grid grid-cols-5 gap-3">
                  {MOODBOARD_TEMPLATES.filter(t => t.category === 'flatlay').map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-[14px] border-2 border-border hover:border-primary/60 hover:bg-primary/[0.03] transition-all text-left group"
                    >
                      <div className="rounded-lg overflow-hidden border border-border/60 group-hover:border-primary/30 transition-colors">
                        <TemplateThumbnail template={t} />
                      </div>
                      <span className="text-[11.5px] font-medium text-foreground leading-tight text-center w-full">{t.name.pl}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background shrink-0 z-10">
        <Link href="/moodboardy" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ChevronLeft size={16} /> Moodboardy
        </Link>
        <div className="w-px h-4 bg-border mx-1" />
        {/* Auto-sizing title input */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
            if (title.trim()) {
              await fetch(`/api/moodboards/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
            }
          }}
          size={Math.max(4, title.length + 1)}
          className="text-sm font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-0.5 max-w-[280px] shrink-0"
        />
        <div className="w-px h-4 bg-border mx-1 shrink-0" />
        {/* 3-dots menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setEditMenuOpen((v) => !v)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${editMenuOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Opcje tablicy"
          >
            <MoreVertical size={15} />
          </button>
          {editMenuOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setEditMenuOpen(false)} />
              <div className="absolute left-0 top-[calc(100%+4px)] z-[50] bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1 w-32">
                <button
                  onClick={openEditModal}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted text-foreground transition-colors text-left"
                >
                  Edytuj
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex-1" />
        {/* Canvas background color */}
        <label
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border cursor-pointer"
          title="Kolor tła planszy"
        >
          <span className="text-xs">Tło</span>
          <span className="inline-block w-4 h-4 rounded-sm border border-border/60 flex-shrink-0" style={{ background: canvasBg }} />
          <input
            type="color"
            value={canvasBg}
            onChange={(e) => updateCanvasBg(e.target.value)}
            className="sr-only"
          />
        </label>
        {/* Export */}
        <button
          onClick={() => { setExportMode(true); setExportRect(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${exportMode ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"}`}
          title="Eksportuj jako JPG"
        >
          <Download size={14} />
          Eksportuj
        </button>
        {/* Share */}
        {client && (
          <button
            onClick={toggleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSharedWithClient ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"}`}
          >
            {isSharedWithClient ? <Check size={14} /> : <Share2 size={14} />}
            {isSharedWithClient ? "Udostępnione" : "Udostępnij klientowi"}
          </button>
        )}
        {/* Grid background picker */}
        <div className="relative">
          <button
            onClick={() => setGridMenuOpen((v) => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${gridMenuOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Tło tablicy"
          >
            <LayoutGrid size={16} />
          </button>
          {gridMenuOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setGridMenuOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-[50] bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1 w-36">
                {([
                  { value: "dots", label: "Kropki" },
                  { value: "grid", label: "Kratka" },
                  { value: "none", label: "Brak" },
                ] as { value: "dots" | "grid" | "none"; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setGridMode(value); localStorage.setItem("moodboard-grid", value); setGridMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${gridMode === value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                  >
                    <span className="w-4 h-4 rounded border border-border flex items-center justify-center shrink-0 bg-background">
                      {value === "dots" && <span className="w-1 h-1 rounded-full bg-current" />}
                      {value === "grid" && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1" opacity="0.6" /></svg>}
                    </span>
                    {label}
                    {gridMode === value && <Check size={13} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Help / shortcuts */}
        <div className="relative">
          <button
            onClick={() => setHelpOpen((v) => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${helpOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Skróty klawiszowe i instrukcja"
          >
            <HelpCircle size={17} />
          </button>
          {helpOpen && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setHelpOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-[50] w-[520px] bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Skróty klawiszowe</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tablica Moodboard</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 p-3 max-h-[70vh] overflow-y-auto">
                  {/* Column 1 */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground pt-1 pb-1 px-1">Narzędzia</p>
                    {([
                      ["V", "Zaznaczanie"],
                      ["H", "Przesuwanie widoku"],
                      ["F", "Frame"],
                      ["R", "Prostokąt"],
                      ["O", "Elipsa"],
                      ["T", "Tekst"],
                      ["A", "Strzałka"],
                      ["L", "Linia"],
                      ["N", "Notatka"],
                      ["P", "Pisanie ręczne"],
                    ] as [string, string][]).map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                        <span className="text-xs text-muted-foreground">{desc}</span>
                        <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-foreground whitespace-nowrap">{key}</kbd>
                      </div>
                    ))}
                    <p className="text-xs font-bold text-foreground pt-3 pb-1 px-1">Rysowanie</p>
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                      <span className="text-xs text-muted-foreground">Idealny kwadrat / koło</span>
                      <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-foreground whitespace-nowrap">Shift</kbd>
                    </div>
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground pt-1 pb-1 px-1">Edycja</p>
                    {([
                      ["Ctrl + Z", "Cofnij"],
                      ["Ctrl + Y", "Ponów"],
                      ["Ctrl + C", "Kopiuj"],
                      ["Ctrl + V", "Wklej"],
                      ["Ctrl + D", "Duplikuj"],
                      ["Del / Backspace", "Usuń"],
                      ["Escape", "Odznacz / anuluj"],
                    ] as [string, string][]).map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                        <span className="text-xs text-muted-foreground">{desc}</span>
                        <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-foreground whitespace-nowrap">{key}</kbd>
                      </div>
                    ))}
                    <p className="text-xs font-bold text-foreground pt-3 pb-1 px-1">Widok</p>
                    {([
                      ["Scroll", "Przybliż / oddal"],
                      ["Spacja + drag", "Przesuń widok"],
                      ["+  /  −", "Zoom in / out"],
                    ] as [string, string][]).map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                        <span className="text-xs text-muted-foreground">{desc}</span>
                        <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-foreground whitespace-nowrap">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zasoby button — top bar, rightmost */}
        <button
          onClick={() => setRightSidebarOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${rightSidebarOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Zasoby"
        >
          <Package size={15} />
          Zasoby
          {rightSidebarOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{ cursor: activeCursor }}
          onDragEnter={(e) => { e.preventDefault(); dragCounterRef2.current++; setIsDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDragLeave={() => { dragCounterRef2.current--; if (dragCounterRef2.current === 0) setIsDragOver(false); }}
          onDrop={handleFileDrop}
        >
          {/* Inner edit mode banner */}
          {innerEditId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-foreground/90 backdrop-blur-sm text-background px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto">
              <span className="text-sm font-medium">Przeciągnij zdjęcie lub scrolluj aby zmienić przybliżenie. Esc aby wyjść.</span>
              <button
                onClick={() => setInnerEditId(null)}
                className="text-background/60 hover:text-background transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Template pick mode banner */}
          {templatePickModeId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-foreground/90 backdrop-blur-sm text-background px-4 py-2.5 rounded-2xl shadow-xl pointer-events-auto">
              <span className="text-sm font-medium">Kliknij zdjęcie na tablicy aby wstawić je do slotu</span>
              <button
                onClick={() => setTemplatePickModeId(null)}
                className="text-background/60 hover:text-background transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Export selection overlay */}
          {exportMode && (
            <div
              className="absolute inset-0 z-30"
              style={{ cursor: "crosshair" }}
              onMouseDown={handleExportMouseDown}
              onMouseMove={handleExportMouseMove}
              onMouseUp={handleExportMouseUp}
            >
              {/* Selection rect */}
              {exportRect && exportRect.w > 4 && exportRect.h > 4 && (
                <div
                  style={{
                    position: "absolute",
                    left: exportRect.x, top: exportRect.y,
                    width: exportRect.w, height: exportRect.h,
                    border: "2px dashed #6366f1",
                    background: "rgba(99,102,241,0.06)",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Info banner + Anuluj — top center */}
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card border border-border rounded-xl shadow-lg px-3 py-2 pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-sm text-muted-foreground whitespace-nowrap">Zaznacz obszar do eksportu jako JPG</span>
                <button
                  onClick={() => { setExportMode(false); setExportRect(null); }}
                  className="px-3 py-1 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors border border-border shrink-0"
                >
                  Anuluj
                </button>
              </div>
              {/* Confirm — shown below selection when finished */}
              {exportRect && exportRect.w > 20 && exportRect.h > 20 && !isExportDrawing && (
                <div
                  style={{
                    position: "absolute",
                    left: exportRect.x + exportRect.w / 2,
                    top: Math.min(exportRect.y + exportRect.h + 10, window.innerHeight - 80),
                    transform: "translateX(-50%)",
                  }}
                  className="flex items-center gap-2 bg-card border border-border rounded-xl shadow-lg px-3 py-2 pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button onClick={doExportJpg} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    <Download size={14} />
                    Pobierz JPG
                  </button>
                  <button onClick={() => { setExportMode(false); setExportRect(null); }} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                    Anuluj
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Drop overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-2 rounded-2xl border-2 border-dashed border-primary bg-primary/5" />
              <div className="relative flex flex-col items-center gap-2 text-primary">
                <Image size={32} />
                <p className="text-sm font-semibold">Upuść zdjęcia na tablicę</p>
              </div>
            </div>
          )}

          {/* Canvas background pattern */}
          {gridMode !== "none" && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {gridMode === "dots" && (
                  <pattern id="bg-pattern" x={stagePos.x % (20 * stageScale)} y={stagePos.y % (20 * stageScale)} width={20 * stageScale} height={20 * stageScale} patternUnits="userSpaceOnUse">
                    <circle cx={1} cy={1} r={1} fill="currentColor" className="text-border" opacity={0.5} />
                  </pattern>
                )}
                {gridMode === "grid" && (
                  <pattern id="bg-pattern" x={stagePos.x % (40 * stageScale)} y={stagePos.y % (40 * stageScale)} width={40 * stageScale} height={40 * stageScale} patternUnits="userSpaceOnUse">
                    <path d={`M ${40 * stageScale} 0 L 0 0 0 ${40 * stageScale}`} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" opacity={0.6} />
                  </pattern>
                )}
              </defs>
              <rect width="100%" height="100%" fill="url(#bg-pattern)" />
            </svg>
          )}

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

              {/* ── Canvas background ── */}
              {canvasBg !== '#FFFFFF' && canvasBg !== '#ffffff' && (
                <Rect
                  x={-stagePos.x / stageScale}
                  y={-stagePos.y / stageScale}
                  width={containerSize.w / stageScale}
                  height={containerSize.h / stageScale}
                  fill={canvasBg}
                  listening={false}
                />
              )}

              {/* ── Frames (rendered before other elements as white-background rects) ── */}
              {safeElements.filter(el => el.type === "frame").map(frameEl => {
                const fw = frameEl.width ?? 400;
                const fh = frameEl.height ?? 300;
                const isSel = selectedIds.includes(frameEl.id);
                return (
                  <Group key={frameEl.id}>
                    {/* White background (not draggable, not interactive) */}
                    <Rect x={frameEl.x} y={frameEl.y} width={fw} height={fh} fill={frameEl.fill ?? "#ffffff"} listening={false} />
                    {/* Frame border — interactive, draggable */}
                    <Rect
                      id={frameEl.id}
                      x={frameEl.x} y={frameEl.y} width={fw} height={fh}
                      fill="transparent"
                      stroke={isSel ? "#6366f1" : (frameEl.stroke ?? "#94a3b8")}
                      strokeWidth={isSel ? 2 : (frameEl.strokeWidth ?? 1)}
                      draggable={tool === "select"}
                      onClick={(e) => {
                        if (tool !== "select") return;
                        if (e.evt.shiftKey) setSelectedIds(prev => prev.includes(frameEl.id) ? prev.filter(x => x !== frameEl.id) : [...prev, frameEl.id]);
                        else setSelectedIds([frameEl.id]);
                      }}
                      onTap={() => { if (tool === "select") setSelectedIds([frameEl.id]); }}
                      onDragStart={() => { isDragging.current = true; setHoveredElementId(null); }}
                      onDragEnd={(e) => {
                        isDragging.current = false;
                        const dx = e.target.x() - frameEl.x;
                        const dy = e.target.y() - frameEl.y;
                        const next = elements.map(elem => {
                          if (elem.id === frameEl.id) return { ...elem, x: e.target.x(), y: e.target.y() };
                          if (elem.frameId === frameEl.id) return { ...elem, x: elem.x + dx, y: elem.y + dy };
                          return elem;
                        });
                        updateElements(next);
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const patch: Partial<CanvasElement> = {
                          x: node.x(), y: node.y(),
                          width: Math.max(50, node.width() * node.scaleX()),
                          height: Math.max(50, node.height() * node.scaleY()),
                        };
                        node.scaleX(1); node.scaleY(1);
                        updateEl(frameEl.id, patch);
                      }}
                      onContextMenu={(e) => { e.evt.preventDefault(); setSelectedIds([frameEl.id]); setContextMenu({ screenX: e.evt.clientX, screenY: e.evt.clientY, elementId: frameEl.id }); }}
                    />
                  </Group>
                );
              })}

              {safeElements.map((el) => {
                if (el.type === "connection") return null; // rendered separately below (always on top)
                if (el.type === "frame") return null; // rendered separately above
                const isSel = selectedIds.includes(el.id);
                // Build clipFunc if this element belongs to a frame
                const parentFrame = el.frameId ? safeElements.find(f => f.id === el.frameId) : undefined;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const clipFunc = parentFrame
                  ? (ctx: any) => { ctx.rect(parentFrame.x, parentFrame.y, parentFrame.width ?? 400, parentFrame.height ?? 300); }
                  : undefined;
                const commonProps = {
                  id: el.id,
                  opacity: el.opacity ?? 1,
                  rotation: el.rotation ?? 0,
                  draggable: tool === "select" && !draggingConnRef.current,
                  ...(clipFunc ? { clipFunc } : {}),
                  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => {
                    e.evt.preventDefault();
                    if (tool === "select") {
                      setSelectedIds([el.id]);
                      setContextMenu({ screenX: e.evt.clientX, screenY: e.evt.clientY, elementId: el.id });
                    }
                  },
                  onDragStart: () => { isDragging.current = true; setHoveredElementId(null); },
                  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                    if (tool !== "select") return;
                    if (e.evt.shiftKey) {
                      // Shift+click: toggle this element in selection
                      setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
                    } else {
                      setSelectedIds([el.id]);
                    }
                  },
                  onTap: () => {
                    if (tool === "select") setSelectedIds([el.id]);
                  },
                  onDblClick: () => {
                    if (el.type === "text" || el.type === "note") startTextEdit(el);
                  },
                  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
                    // Multi-select: move all other selected nodes by the same delta
                    if (selectedIds.length > 1) {
                      const dx = e.target.x() - el.x;
                      const dy = e.target.y() - el.y;
                      const stage = stageRef.current;
                      if (stage) {
                        selectedIds.forEach(sid => {
                          if (sid === el.id) return;
                          const srcEl = elements.find(e2 => e2.id === sid);
                          if (!srcEl || srcEl.type === "connection") return;
                          const node = stage.findOne("#" + sid);
                          if (node) { node.x(srcEl.x + dx); node.y(srcEl.y + dy); }
                        });
                      }
                      setSnapLines([]);
                      return;
                    }
                    applySnap(e, el);
                  },
                  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                    isDragging.current = false;
                    setHoveredElementId(null);
                    setSnapLines([]);
                    if (selectedIds.length > 1) {
                      const dx = e.target.x() - el.x;
                      const dy = e.target.y() - el.y;
                      const next = elements.map(elem =>
                        selectedIds.includes(elem.id) && elem.type !== "connection"
                          ? { ...elem, x: elem.x + dx, y: elem.y + dy }
                          : elem
                      );
                      updateElements(next);
                    } else {
                      const nx = e.target.x();
                      const ny = e.target.y();
                      // Auto-assign to frame: if element center is inside a frame, set frameId
                      if (el.type !== "frame" && el.type !== "connection") {
                        const elW = el.width ?? 120;
                        const elH = el.height ?? 80;
                        const cx = nx + elW / 2;
                        const cy = ny + elH / 2;
                        const containingFrame = elements.find(f =>
                          f.type === "frame" && f.id !== el.id &&
                          cx >= f.x && cx <= f.x + (f.width ?? 0) &&
                          cy >= f.y && cy <= f.y + (f.height ?? 0)
                        );
                        updateEl(el.id, { x: nx, y: ny, frameId: containingFrame?.id ?? undefined });
                      } else {
                        updateEl(el.id, { x: nx, y: ny });
                      }
                    }
                  },
                  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                    const node = e.target;
                    const patch: Partial<CanvasElement> = {
                      x: node.x(), y: node.y(),
                      rotation: node.rotation(),
                    };
                    if (el.type === "text") {
                      patch.width = Math.max(50, node.width() * node.scaleX());
                      node.scaleX(1); node.scaleY(1);
                    } else if (el.type !== "arrow" && el.type !== "line" && el.type !== "freehand") {
                      patch.width = Math.max(5, node.width() * node.scaleX());
                      patch.height = Math.max(5, node.height() * node.scaleY());
                      node.scaleX(1); node.scaleY(1);
                    }
                    updateEl(el.id, patch);
                  },
                };

                if (el.type === "rect") {
                  const rw = el.width ?? 120, rh = el.height ?? 80;
                  const isTemplate = !!el.templateRole;
                  const rot = el.rotation ?? 0;
                  const rad = (rot * Math.PI) / 180;
                  // Center of element in canvas coords (accounting for rotation around top-left)
                  const ecx = el.x + (rw / 2) * Math.cos(rad) - (rh / 2) * Math.sin(rad);
                  const ecy = el.y + (rw / 2) * Math.sin(rad) + (rh / 2) * Math.cos(rad);
                  const showPlus = rw > 24 && rh > 24 && !exportMode;
                  return (
                    <Fragment key={el.id}>
                      <Rect {...commonProps} x={el.x} y={el.y} width={rw} height={rh}
                        fill={el.fill ?? (isTemplate ? "#F2F3F7" : "#e2e8f0")}
                        stroke={isSel ? "#6366f1" : (isTemplate ? "#C7CAD6" : (el.stroke ?? "#94a3b8"))}
                        strokeWidth={isSel ? 2 : (isTemplate ? 1 : (el.strokeWidth ?? 1.5))}
                        cornerRadius={el.cornerRadius ?? (el.templateCategory === 'flatlay' ? 3 : isTemplate ? 8 : 0)}
                      />
                      {showPlus && (
                        <Text
                          x={ecx} y={ecy}
                          offsetX={14} offsetY={14}
                          width={28} height={28}
                          text="+"
                          fontSize={22}
                          fontFamily="Inter, sans-serif"
                          fill={templatePickModeId === el.id ? "#6366f1" : "#7C3AED"}
                          align="center"
                          verticalAlign="middle"
                          rotation={rot}
                          opacity={el.opacity ?? 1}
                          onClick={(e) => {
                            e.cancelBubble = true;
                            setTemplatePickModeId(prev => prev === el.id ? null : el.id);
                          }}
                          onTap={(e) => {
                            e.cancelBubble = true;
                            setTemplatePickModeId(prev => prev === el.id ? null : el.id);
                          }}
                          onMouseEnter={() => { if (stageRef.current) stageRef.current.container().style.cursor = "pointer"; }}
                          onMouseLeave={() => { if (stageRef.current) stageRef.current.container().style.cursor = ""; }}
                        />
                      )}
                    </Fragment>
                  );
                }

                if (el.type === "ellipse") {
                  const ew = el.width ?? 120, eh = el.height ?? 80;
                  const isTemplate = !!el.templateRole;
                  const showPlus = ew > 24 && eh > 24 && !exportMode;
                  return (
                    <Fragment key={el.id}>
                      <Ellipse {...commonProps} x={el.x} y={el.y} radiusX={ew / 2} radiusY={eh / 2}
                        fill={el.fill ?? (isTemplate ? "#F2F3F7" : "#e2e8f0")}
                        stroke={isSel ? "#6366f1" : (isTemplate ? "#C7CAD6" : (el.stroke ?? "#94a3b8"))}
                        strokeWidth={isSel ? 2 : (isTemplate ? 1 : (el.strokeWidth ?? 1.5))}
                      />
                      {showPlus && (
                        <Text
                          x={el.x} y={el.y}
                          offsetX={14} offsetY={14}
                          width={28} height={28}
                          text="+"
                          fontSize={22}
                          fontFamily="Inter, sans-serif"
                          fill={templatePickModeId === el.id ? "#6366f1" : "#7C3AED"}
                          align="center"
                          verticalAlign="middle"
                          opacity={el.opacity ?? 1}
                          onClick={(e) => {
                            e.cancelBubble = true;
                            setTemplatePickModeId(prev => prev === el.id ? null : el.id);
                          }}
                          onTap={(e) => {
                            e.cancelBubble = true;
                            setTemplatePickModeId(prev => prev === el.id ? null : el.id);
                          }}
                          onMouseEnter={() => { if (stageRef.current) stageRef.current.container().style.cursor = "pointer"; }}
                          onMouseLeave={() => { if (stageRef.current) stageRef.current.container().style.cursor = ""; }}
                        />
                      )}
                    </Fragment>
                  );
                }

                if (el.type === "text") return (
                  <Text key={el.id} {...commonProps} x={el.x} y={el.y} width={el.width ?? 200}
                    text={el.id === editingTextId ? "" : (el.text || "Text")}
                    fontSize={el.fontSize ?? 16} fill={el.fill ?? "#1e293b"}
                    fontFamily={el.fontFamily ?? "Inter, sans-serif"}
                    fontStyle={el.fontStyle ?? "normal"}
                    textDecoration={el.textDecoration ?? ""}
                    align={el.textAlign ?? "left"} />
                );

                if (el.type === "note") return (
                  <Group key={el.id} {...commonProps} x={el.x} y={el.y}>
                    <Rect width={el.width ?? 150} height={el.height ?? 150}
                      fill={el.noteColor ?? "#fef08a"}
                      stroke={isSel ? "#6366f1" : (el.stroke ?? "#ca8a04")}
                      strokeWidth={isSel ? 2 : 1} cornerRadius={6} />
                    <Text x={8} y={8} width={(el.width ?? 150) - 16} height={(el.height ?? 150) - 16}
                      text={el.id === editingTextId ? "" : (el.text || "")}
                      fontSize={el.fontSize ?? 13} fill="#1e293b" wrap="word" />
                  </Group>
                );

                if (el.type === "arrow") return (
                  <Arrow key={el.id} {...commonProps} x={el.x} y={el.y}
                    points={el.points ?? [0, 0, 80, 0]}
                    stroke={isSel ? "#6366f1" : (el.stroke ?? "#334155")}
                    strokeWidth={el.strokeWidth ?? 2}
                    fill={isSel ? "#6366f1" : (el.stroke ?? "#334155")} pointerLength={10} pointerWidth={8} />
                );

                if (el.type === "line") return (
                  <Line key={el.id} {...commonProps} x={el.x} y={el.y}
                    points={el.points ?? [0, 0, 80, 0]}
                    stroke={isSel ? "#6366f1" : (el.stroke ?? "#334155")}
                    strokeWidth={el.strokeWidth ?? 2} lineCap="round" />
                );

                if (el.type === "freehand") return (
                  <Line key={el.id} {...commonProps} x={el.x} y={el.y}
                    points={el.points ?? [0, 0]}
                    stroke={isSel ? "#6366f1" : (el.stroke ?? "#334155")}
                    strokeWidth={el.strokeWidth ?? 2}
                    hitStrokeWidth={Math.max(20, (el.strokeWidth ?? 2) + 10)}
                    tension={0.4} lineCap="round" lineJoin="round" />
                );

                if (el.type === "image" && el.innerScale !== undefined) {
                  const isInnerEdit = innerEditId === el.id;
                  return (
                    <MaskedInnerImage
                      key={el.id}
                      el={el}
                      isSelected={isSel}
                      isInnerEdit={isInnerEdit}
                      onSelect={() => {
                        if (templatePickModeId) { fillPlaceholderWithImage(templatePickModeId, el); return; }
                        if (innerEditId && innerEditId !== el.id) setInnerEditId(null);
                        setSelectedIds([el.id]);
                      }}
                      onDblClick={() => setInnerEditId(el.id)}
                      onInnerDragEnd={(offX, offY) => updateEl(el.id, { innerOffsetX: offX, innerOffsetY: offY })}
                      onOuterDragEnd={(x, y) => {
                        const elW = el.width ?? 120; const elH = el.height ?? 80;
                        const cx = x + elW / 2; const cy = y + elH / 2;
                        const containingFrame = elements.find(f =>
                          f.type === "frame" && f.id !== el.id &&
                          cx >= f.x && cx <= f.x + (f.width ?? 0) &&
                          cy >= f.y && cy <= f.y + (f.height ?? 0)
                        );
                        updateEl(el.id, { x, y, frameId: containingFrame?.id ?? undefined });
                      }}
                      onTransformEnd={(attrs) => updateEl(el.id, attrs)}
                      onMouseEnter={() => { if (tool === "select") setHoveredElementId(el.id); }}
                      onMouseLeave={() => setHoveredElementId(null)}
                      onDragStarted={() => { isDragging.current = true; setHoveredElementId(null); }}
                      onDragEnded={() => { isDragging.current = false; setHoveredElementId(null); setSnapLines([]); }}
                      onDragMove={(e) => applySnap(e, el)}
                      onContextMenu={(e) => { e.evt.preventDefault(); setSelectedIds([el.id]); setContextMenu({ screenX: e.evt.clientX, screenY: e.evt.clientY, elementId: el.id }); }}
                    />
                  );
                }

                if (el.type === "image") {
                  const imageNode = (
                    <CanvasImageNode key={el.id} el={el} isSelected={isSel || (templatePickModeId !== null && !!el.imageUrl)}
                      onSelect={() => {
                        if (templatePickModeId) { fillPlaceholderWithImage(templatePickModeId, el); return; }
                        setSelectedIds([el.id]);
                      }}
                      onDragEnd={(x, y) => {
                        const nx = x, ny = y;
                        if (el.type !== "frame" && el.type !== "connection") {
                          const elW = el.width ?? 120; const elH = el.height ?? 80;
                          const cx = nx + elW / 2; const cy = ny + elH / 2;
                          const containingFrame = elements.find(f =>
                            f.type === "frame" && f.id !== el.id &&
                            cx >= f.x && cx <= f.x + (f.width ?? 0) &&
                            cy >= f.y && cy <= f.y + (f.height ?? 0)
                          );
                          updateEl(el.id, { x: nx, y: ny, frameId: containingFrame?.id ?? undefined });
                        } else {
                          updateEl(el.id, { x: nx, y: ny });
                        }
                      }}
                      onTransformEnd={(attrs) => updateEl(el.id, attrs)}
                      onMouseEnter={() => { if (tool === "select") setHoveredElementId(el.id); }}
                      onMouseLeave={() => setHoveredElementId(null)}
                      onDragStarted={() => { isDragging.current = true; setHoveredElementId(null); }}
                      onDragEnded={() => { isDragging.current = false; setHoveredElementId(null); setSnapLines([]); }}
                      onDragMove={(e) => applySnap(e, el)}
                      onContextMenu={(e) => { e.evt.preventDefault(); setSelectedIds([el.id]); setContextMenu({ screenX: e.evt.clientX, screenY: e.evt.clientY, elementId: el.id }); }} />
                  );
                  return clipFunc
                    ? <Group key={el.id + "_cg"} clipFunc={clipFunc}>{imageNode}</Group>
                    : imageNode;
                }

                return null;
              })}

              {/* ── Connections (bezier curves, always on top of elements) ── */}
              {safeElements.filter(el => el.type === "connection").map(el => {
                const srcEl = safeElements.find(e => e.id === el.sourceId);
                const tgtEl = safeElements.find(e => e.id === el.targetId);
                if (!srcEl || !tgtEl || !el.sourceAnchor || !el.targetAnchor) return null;
                const p1 = getAnchorPoint(srcEl, el.sourceAnchor as Anchor);
                const p2 = getAnchorPoint(tgtEl, el.targetAnchor as Anchor);
                const { path, cx2, cy2 } = getBezierData(p1, el.sourceAnchor as Anchor, p2, el.targetAnchor as Anchor);
                const headData = arrowheadPath(p2.x, p2.y, cx2, cy2);
                const isSel = selectedIds.includes(el.id);
                const color = isSel ? "#6366f1" : (el.stroke ?? "#334155");
                return (
                  <Fragment key={el.id}>
                    <KonvaPath
                      id={el.id}
                      data={path}
                      stroke={color}
                      strokeWidth={(el.strokeWidth ?? 2) + (isSel ? 1 : 0)}
                      fill="transparent"
                      opacity={el.opacity ?? 1}
                      hitStrokeWidth={14}
                      onClick={() => { if (tool === "select") setSelectedIds([el.id]); }}
                      onTap={() => { if (tool === "select") setSelectedIds([el.id]); }}
                    />
                    <KonvaPath
                      data={headData}
                      fill={color}
                      stroke="transparent"
                      opacity={el.opacity ?? 1}
                      listening={false}
                    />
                  </Fragment>
                );
              })}

              {/* Snap guide lines */}
              {snapLines.map((ln, i) => (
                <Line key={i} points={[ln.x1, ln.y1, ln.x2, ln.y2]}
                  stroke="#6366f1" strokeWidth={1 / stageScale} dash={[4 / stageScale, 4 / stageScale]}
                  opacity={0.7} listening={false} />
              ))}

              {/* Rotation snap guide lines */}
              {rotationGuide && (() => {
                const { cx, cy, angle } = rotationGuide;
                const sw = 1 / stageScale;
                const dashLen = 6 / stageScale;
                const gapLen = 4 / stageScale;
                const isCardinal = angle % 90 === 0;
                const isDiag = angle % 45 === 0 && !isCardinal;
                const span = 9999;
                // Cardinal angles: H and V crosshair
                // Diagonal angles: diagonal lines
                if (isCardinal) {
                  return (
                    <>
                      <Line points={[-span, cy, span, cy]} stroke="#f59e0b" strokeWidth={sw} dash={[dashLen, gapLen]} opacity={0.85} listening={false} />
                      <Line points={[cx, -span, cx, span]} stroke="#f59e0b" strokeWidth={sw} dash={[dashLen, gapLen]} opacity={0.85} listening={false} />
                    </>
                  );
                }
                if (isDiag) {
                  // 45° or 135°: show two diagonal lines
                  const sign = (angle === 45 || angle === 225) ? 1 : -1;
                  return (
                    <Line
                      points={[cx - span * sign, cy - span, cx + span * sign, cy + span]}
                      stroke="#f59e0b" strokeWidth={sw} dash={[dashLen, gapLen]} opacity={0.7} listening={false}
                    />
                  );
                }
                return null;
              })()}

              {/* Live pen preview */}
              {isPenDrawingRef.current && penStartRef.current && penPoints.length >= 4 && (
                <Line
                  x={penStartRef.current.x} y={penStartRef.current.y}
                  points={penPoints}
                  stroke={penColor} strokeWidth={penWidth}
                  tension={0.4} lineCap="round" lineJoin="round"
                  listening={false}
                />
              )}

              {/* Preview rect while drawing */}
              {isDrawing && drawRect && (tool === "rect" || tool === "note") && (
                <Rect x={drawRect.x} y={drawRect.y} width={drawRect.w} height={drawRect.h}
                  fill={tool === "note" ? "#fef08a40" : "#e2e8f040"} stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />
              )}
              {isDrawing && drawRect && tool === "frame" && (
                <Rect x={drawRect.x} y={drawRect.y} width={drawRect.w} height={drawRect.h}
                  fill="#f8fafc40" stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} />
              )}
              {isDrawing && drawRect && tool === "ellipse" && (
                <Ellipse x={drawRect.x + drawRect.w / 2} y={drawRect.y + drawRect.h / 2}
                  radiusX={drawRect.w / 2} radiusY={drawRect.h / 2}
                  fill="#e2e8f040" stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />
              )}

              {/* ── Line / Arrow endpoint handles ── */}
              {(() => {
                if (selectedIds.length !== 1) return null;
                const el = elements.find(e => e.id === selectedIds[0]);
                if (!el || (el.type !== "line" && el.type !== "arrow")) return null;
                const pts = el.points ?? [0, 0, 80, 0];
                const sx = el.x + (pts[0] ?? 0);
                const sy = el.y + (pts[1] ?? 0);
                const ex = el.x + (pts[2] ?? 80);
                const ey = el.y + (pts[3] ?? 0);
                const handleProps = {
                  radius: 5,
                  fill: "#fff",
                  stroke: "#6366f1",
                  strokeWidth: 2,
                  draggable: true,
                  hitStrokeWidth: 12,
                  onMouseEnter: () => { if (stageRef.current) stageRef.current.container().style.cursor = "crosshair"; },
                  onMouseLeave: () => { if (stageRef.current) stageRef.current.container().style.cursor = ""; },
                };
                return (
                  <>
                    {/* Start handle */}
                    <KonvaCircle
                      {...handleProps}
                      x={sx} y={sy}
                      onDragEnd={(e) => {
                        const nx = e.target.x(), ny = e.target.y();
                        const absEndX = el.x + (pts[2] ?? 80);
                        const absEndY = el.y + (pts[3] ?? 0);
                        updateEl(el.id, { x: nx, y: ny, points: [0, 0, absEndX - nx, absEndY - ny] });
                      }}
                    />
                    {/* End handle */}
                    <KonvaCircle
                      {...handleProps}
                      x={ex} y={ey}
                      onDragEnd={(e) => {
                        const nx = e.target.x(), ny = e.target.y();
                        updateEl(el.id, { points: [0, 0, nx - el.x, ny - el.y] });
                      }}
                    />
                  </>
                );
              })()}

              <Transformer
                ref={transformerRef}
                visible={transformerVisible}
                rotateEnabled
                keepRatio={false}
                borderStroke="#6366f1"
                anchorStroke="#6366f1"
                anchorFill="#fff"
                anchorSize={8}
                borderStrokeWidth={1.5}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={6}
                onTransform={(e) => {
                  const node = e.target;
                  const rot = ((node.rotation() % 360) + 360) % 360;
                  const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
                  const isSnapped = SNAP_ANGLES.some(a => Math.abs(rot - a) < 1.5);
                  if (isSnapped) {
                    // Get center in canvas (world) coordinates via getClientRect
                    const box = node.getClientRect({ skipTransform: false });
                    const cx = (box.x + box.width / 2 - stagePos.x) / stageScale;
                    const cy = (box.y + box.height / 2 - stagePos.y) / stageScale;
                    setRotationGuide({ cx, cy, angle: Math.round(rot) });
                  } else {
                    setRotationGuide(null);
                  }
                }}
                onTransformEnd={() => setRotationGuide(null)}
              />

              {/* Rubber-band selection rectangle */}
              {selBox && selBox.w > 2 && selBox.h > 2 && (
                <Rect
                  x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h}
                  fill="#6366f120" stroke="#6366f1" strokeWidth={1} dash={[4, 4]}
                  listening={false}
                />
              )}

              {/* ── Anchor handles on hovered element (hidden in multi-select) ── */}
              {tool === "select" && !draggingConn && hoveredElementId && selectedIds.length <= 1 && (() => {
                const el = safeElements.find(e => e.id === hoveredElementId && e.type !== "connection");
                if (!el) return null;
                return (["top", "right", "bottom", "left"] as Anchor[]).map(anchor => {
                  const pt = getAnchorPoint(el, anchor);
                  return (
                    <KonvaCircle
                      key={anchor}
                      x={pt.x} y={pt.y} radius={6}
                      fill="white" stroke="#6366f1" strokeWidth={2}
                      onMouseDown={(e) => {
                        e.cancelBubble = true;
                        isConnecting.current = true;
                        const conn = { sourceId: el.id, sourceAnchor: anchor, currentX: pt.x, currentY: pt.y };
                        draggingConnRef.current = conn;
                        setDraggingConn(conn);
                      }}
                      onMouseEnter={() => setAnchorHovered(true)}
                      onMouseLeave={() => setAnchorHovered(false)}
                    />
                  );
                });
              })()}

              {/* ── All target anchors visible during connection drag ── */}
              {draggingConn && elements
                .filter(el => el.id !== draggingConn.sourceId && el.type !== "connection")
                .flatMap(el =>
                  (["top", "right", "bottom", "left"] as Anchor[]).map(anchor => {
                    const pt = getAnchorPoint(el, anchor);
                    const isNearest = nearestAnchor?.elementId === el.id && nearestAnchor?.anchor === anchor;
                    return (
                      <KonvaCircle
                        key={`${el.id}-${anchor}`}
                        x={pt.x} y={pt.y}
                        radius={isNearest ? 8 : 5}
                        fill={isNearest ? "#6366f1" : "white"}
                        stroke="#6366f1" strokeWidth={2}
                        listening={false}
                      />
                    );
                  })
                )
              }

              {/* ── Live connection preview while dragging ── */}
              {draggingConn && (() => {
                const srcEl = safeElements.find(e => e.id === draggingConn.sourceId);
                if (!srcEl) return null;
                const p1 = getAnchorPoint(srcEl, draggingConn.sourceAnchor);
                const endPt = nearestAnchor
                  ? (() => { const t = safeElements.find(e => e.id === nearestAnchor.elementId); return t ? getAnchorPoint(t, nearestAnchor.anchor) : { x: draggingConn.currentX, y: draggingConn.currentY }; })()
                  : { x: draggingConn.currentX, y: draggingConn.currentY };
                const dist = Math.sqrt((endPt.x - p1.x) ** 2 + (endPt.y - p1.y) ** 2);
                const off = Math.max(40, Math.min(200, dist * 0.45));
                let cx1 = p1.x, cy1 = p1.y;
                if (draggingConn.sourceAnchor === "right")  cx1 += off;
                else if (draggingConn.sourceAnchor === "left")   cx1 -= off;
                if (draggingConn.sourceAnchor === "bottom") cy1 += off;
                else if (draggingConn.sourceAnchor === "top")    cy1 -= off;
                const cx2 = endPt.x + (p1.x - endPt.x) * 0.3;
                const cy2 = endPt.y + (p1.y - endPt.y) * 0.3;
                return (
                  <KonvaPath
                    data={`M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${endPt.x} ${endPt.y}`}
                    stroke="#6366f1" strokeWidth={2} fill="transparent"
                    dash={[6, 4]} listening={false} opacity={0.8}
                  />
                );
              })()}
            </Layer>
          </Stage>

          {/* Frame name labels (HTML overlay, above canvas, below text editing) */}
          {safeElements.filter(el => el.type === "frame").map(frameEl => {
            const sx = frameEl.x * stageScale + stagePos.x;
            const sy = frameEl.y * stageScale + stagePos.y;
            const isSel = selectedIds.includes(frameEl.id);
            return (
              <div
                key={`label-${frameEl.id}`}
                style={{ position: "absolute", left: sx, top: sy - 22, pointerEvents: "none", zIndex: 15 }}
                className="flex items-center gap-1"
              >
                <span
                  onDoubleClick={() => { setRenameFrameId(frameEl.id); setRenameFrameValue(frameEl.frameName ?? "Frame"); }}
                  className={`text-[11px] font-semibold leading-none px-1.5 py-0.5 rounded cursor-text select-none ${isSel ? "text-primary" : "text-muted-foreground"} hover:bg-muted/60 transition-colors`}
                  style={{ fontFamily: "Inter, sans-serif", pointerEvents: "auto" }}
                >
                  {frameEl.frameName || "Frame"}
                </span>
                {/* 3-dot rename/export menu — pointer-events: auto */}
                <div className="relative" style={{ pointerEvents: "auto" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFrameMenuId(prev => prev === frameEl.id ? null : frameEl.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MoreVertical size={11} />
                  </button>
                  {frameMenuId === frameEl.id && (
                    <>
                      <div className="fixed inset-0 z-[45]" onClick={() => setFrameMenuId(null)} />
                      <div className="absolute left-0 top-[calc(100%+2px)] z-[50] bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1 w-36">
                        <button
                          onClick={() => { setRenameFrameId(frameEl.id); setRenameFrameValue(frameEl.frameName ?? "Frame"); setFrameMenuId(null); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors text-left"
                        >
                          Zmień nazwę
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button onClick={() => { exportFrame(frameEl.id, "png"); setFrameMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors text-left">Eksportuj PNG</button>
                        <button onClick={() => { exportFrame(frameEl.id, "jpg"); setFrameMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors text-left">Eksportuj JPG</button>
                        <button onClick={() => { exportFrame(frameEl.id, "pdf"); setFrameMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-muted text-foreground transition-colors text-left">Eksportuj PDF</button>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => {
                            updateElements(elements.filter(e => e.id !== frameEl.id).map(e => e.frameId === frameEl.id ? { ...e, frameId: undefined } : e));
                            setSelectedIds([]);
                            setFrameMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 transition-colors text-left"
                        >
                          Usuń frame
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Text editing overlay */}
          {editingTextId && (() => {
            const el = safeElements.find(e => e.id === editingTextId);
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
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card border border-border rounded-xl shadow-sm px-1 py-1 z-20">
            <button onClick={() => setStageScale((s) => Math.max(0.1, s / 1.2))} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ZoomOut size={15} /></button>
            <button onClick={() => setStageScale(1)} className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors min-w-[48px] text-center">{zoomPct}%</button>
            <button onClick={() => setStageScale((s) => Math.min(5, s * 1.2))} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ZoomIn size={15} /></button>
          </div>

          {/* Properties panel — shown above toolbar when element selected */}
          {firstSelected && !editingTextId && (
            <div className="absolute bottom-[76px] left-1/2 -translate-x-1/2 flex flex-col gap-2 bg-card border border-border rounded-2xl shadow-lg px-4 py-3 z-20 pointer-events-auto min-w-max">
              {/* Font family picker — text only */}
              {firstSelected.type === "text" && (
                <div className="flex items-center gap-2 relative">
                  <span className="text-xs text-muted-foreground shrink-0">Czcionka</span>
                  <button
                    onClick={() => { setFontPickerOpen((v) => !v); setFontSearch(""); }}
                    className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs min-w-[160px] transition-colors"
                    style={{ fontFamily: firstSelected.fontFamily ?? "Inter, sans-serif" }}
                  >
                    <span className="truncate">{firstSelected.fontFamily ?? "Inter"}</span>
                    <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
                  </button>
                  {fontPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setFontPickerOpen(false)} />
                      <div className="absolute left-[72px] bottom-[calc(100%+4px)] z-[70] w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-border">
                          <input
                            autoFocus
                            value={fontSearch}
                            onChange={(e) => setFontSearch(e.target.value)}
                            placeholder="Szukaj czcionki…"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="overflow-y-auto max-h-60 p-1">
                          {GOOGLE_FONTS
                            .filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()))
                            .map((font) => (
                              <button
                                key={font}
                                onMouseEnter={() => loadGoogleFont(font)}
                                onClick={() => {
                                  loadGoogleFont(font);
                                  updateSelected({ fontFamily: font });
                                  setFontPickerOpen(false);
                                  // Wait for the font to load, then force Konva to re-render
                                  document.fonts.load(`16px "${font}"`).then(() => {
                                    stageRef.current?.getLayers().forEach(l => l.batchDraw());
                                  }).catch(() => {});
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-muted transition-colors ${(firstSelected.fontFamily ?? "Inter") === font ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </button>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Row 1: Fill + Stroke colors */}
              <div className="flex items-center gap-3">
              {/* Fill color */}
              {(firstSelected.type === "rect" || firstSelected.type === "ellipse" || firstSelected.type === "note") && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">Kolor</span>
                  <div className="flex gap-1">
                    {(firstSelected.type === "note" ? NOTE_COLORS.map(n => n.bg) : FILL_COLORS.slice(0, 9)).map((c) => (
                      <button key={c} onClick={() => updateSelected(firstSelected.type === "note" ? { fill: c, noteColor: c } : { fill: c })}
                        style={{ background: c === "transparent" ? "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,#fff 0,#fff 50%)" : c }}
                        className={`w-5 h-5 rounded border-2 transition-all ${(firstSelected.fill === c || firstSelected.noteColor === c) ? "border-primary scale-110" : "border-border"}`}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={customFillColor || (firstSelected.fill && firstSelected.fill !== "transparent" ? firstSelected.fill : "#ffffff")}
                    onChange={(e) => {
                      setCustomFillColor(e.target.value);
                      updateSelected(firstSelected.type === "note" ? { fill: e.target.value, noteColor: e.target.value } : { fill: e.target.value });
                    }}
                    title="Własny kolor"
                    className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
                    style={{ minWidth: 24 }}
                  />
                  <input
                    type="text"
                    value={customFillColor || (firstSelected.fill && firstSelected.fill !== "transparent" ? firstSelected.fill : "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomFillColor(v);
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSelected(firstSelected.type === "note" ? { fill: v, noteColor: v } : { fill: v });
                    }}
                    placeholder="#hex"
                    maxLength={7}
                    className="w-16 text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {/* Stroke color */}
              {firstSelected.type !== "text" && firstSelected.type !== "image" && (
                <>
                  {(firstSelected.type === "rect" || firstSelected.type === "ellipse" || firstSelected.type === "note") && (
                    <div className="w-px h-5 bg-border shrink-0" />
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground w-10 shrink-0">Obr.</span>
                    <div className="flex gap-1">
                      {/* No stroke option */}
                      <button
                        onClick={() => updateSelected({ stroke: "transparent", strokeWidth: 0 })}
                        title="Brak koloru"
                        className={`w-5 h-5 rounded border-2 transition-all relative overflow-hidden ${(firstSelected.stroke === "transparent" || firstSelected.strokeWidth === 0) ? "border-primary scale-110" : "border-border"}`}
                      >
                        <div className="absolute inset-0 bg-white dark:bg-zinc-800" />
                        <div className="absolute left-0 right-0 top-1/2 h-px rotate-45 origin-center" style={{ background: "#ef4444", transform: "rotate(45deg)" }} />
                      </button>
                      {STROKE_COLORS.slice(0, 6).map((c) => (
                        <button key={c} onClick={() => updateSelected({ stroke: c })}
                          style={{ background: c }}
                          className={`w-5 h-5 rounded border-2 transition-all ${firstSelected.stroke === c ? "border-primary scale-110" : "border-border"}`}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={customStrokeColor || (firstSelected.stroke ?? "#334155")}
                      onChange={(e) => {
                        setCustomStrokeColor(e.target.value);
                        updateSelected({ stroke: e.target.value });
                      }}
                      title="Własny kolor obramowania"
                      className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
                      style={{ minWidth: 24 }}
                    />
                    <input
                      type="text"
                      value={customStrokeColor || (firstSelected.stroke ?? "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomStrokeColor(v);
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSelected({ stroke: v });
                      }}
                      placeholder="#hex"
                      maxLength={7}
                      className="w-16 text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}
              {/* Text color */}
              {firstSelected.type === "text" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-10 shrink-0">Kolor</span>
                  <div className="flex gap-1">
                    {STROKE_COLORS.slice(0, 6).map((c) => (
                      <button key={c} onClick={() => updateSelected({ fill: c })}
                        style={{ background: c }}
                        className={`w-5 h-5 rounded border-2 transition-all ${firstSelected.fill === c ? "border-primary scale-110" : "border-border"}`}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={customFillColor || (firstSelected.fill ?? "#1e293b")}
                    onChange={(e) => { setCustomFillColor(e.target.value); updateSelected({ fill: e.target.value }); }}
                    title="Własny kolor tekstu"
                    className="w-6 h-6 rounded cursor-pointer border border-border p-0 bg-transparent"
                    style={{ minWidth: 24 }}
                  />
                  <input
                    type="text"
                    value={customFillColor || (firstSelected.fill ?? "")}
                    onChange={(e) => { const v = e.target.value; setCustomFillColor(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSelected({ fill: v }); }}
                    placeholder="#hex"
                    maxLength={7}
                    className="w-16 text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              </div>

              {/* Row 2: Stroke width, font size, opacity, delete */}
              <div className="flex items-center gap-3">
                {/* Stroke width */}
                {(firstSelected.type === "arrow" || firstSelected.type === "line" || firstSelected.type === "rect" || firstSelected.type === "ellipse") && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">Grubość</span>
                    {[1, 2, 4, 6].map((w) => (
                      <button key={w} onClick={() => updateSelected({ strokeWidth: w })}
                        className={`w-8 h-6 rounded-lg border transition-all text-xs ${firstSelected.strokeWidth === w ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                        {w}
                      </button>
                    ))}
                    <div className="w-px h-5 bg-border shrink-0" />
                  </div>
                )}
                {/* Font size + formatting */}
                {firstSelected.type === "text" && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground shrink-0">Rozmiar</span>
                      <input
                        type="number"
                        min={6} max={200}
                        value={firstSelected.fontSize ?? 16}
                        onChange={(e) => { const v = parseInt(e.target.value); if (v >= 6 && v <= 200) updateSelected({ fontSize: v }); }}
                        className="w-16 text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-center"
                      />
                      <div className="w-px h-5 bg-border shrink-0" />
                      {/* Bold / Italic / Underline */}
                      {([
                        { label: "Pogrubienie", icon: <Bold size={14} />, toggle: () => {
                          const cur = firstSelected.fontStyle ?? "normal";
                          const isBold = cur.includes("bold");
                          const isItalic = cur.includes("italic");
                          updateSelected({ fontStyle: (isBold ? (isItalic ? "italic" : "normal") : (isItalic ? "bold italic" : "bold")) });
                        }, active: (firstSelected.fontStyle ?? "").includes("bold") },
                        { label: "Kursywa", icon: <Italic size={14} />, toggle: () => {
                          const cur = firstSelected.fontStyle ?? "normal";
                          const isBold = cur.includes("bold");
                          const isItalic = cur.includes("italic");
                          updateSelected({ fontStyle: (isItalic ? (isBold ? "bold" : "normal") : (isBold ? "bold italic" : "italic")) });
                        }, active: (firstSelected.fontStyle ?? "").includes("italic") },
                        { label: "Podkreślenie", icon: <Underline size={14} />, toggle: () => {
                          updateSelected({ textDecoration: firstSelected.textDecoration === "underline" ? "" : "underline" });
                        }, active: firstSelected.textDecoration === "underline" },
                      ] as { label: string; icon: React.ReactNode; toggle: () => void; active: boolean }[]).map(btn => (
                        <button key={btn.label} onClick={btn.toggle} title={btn.label}
                          className={`w-8 h-6 rounded-lg border transition-all flex items-center justify-center ${btn.active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          {btn.icon}
                        </button>
                      ))}
                      <div className="w-px h-5 bg-border shrink-0" />
                      {/* Align */}
                      {([
                        { label: "Wyrównaj do lewej", icon: <AlignLeft size={14} />, align: "left" },
                        { label: "Wyśrodkuj", icon: <AlignCenter size={14} />, align: "center" },
                        { label: "Wyrównaj do prawej", icon: <AlignRight size={14} />, align: "right" },
                      ] as { label: string; icon: React.ReactNode; align: string }[]).map(btn => (
                        <button key={btn.align} onClick={() => updateSelected({ textAlign: btn.align })} title={btn.label}
                          className={`w-8 h-6 rounded-lg border transition-all flex items-center justify-center ${(firstSelected.textAlign ?? "left") === btn.align ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {/* Image controls */}
                {firstSelected.type === "image" && !cropMode && (
                  <>
                    <button
                      onClick={() => enterCropMode(firstSelected)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Crop size={14} /> Kadruj
                    </button>
                    {firstSelected.cropLeft !== undefined && (
                      <button
                        onClick={resetCrop}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} /> Resetuj kadr
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveBg(firstSelected)}
                      disabled={!!removingBgId}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Eraser size={14} />
                      {removingBgId === firstSelected.id ? "Usuwam..." : "Usuń tło"}
                    </button>
                    <div className="w-px h-5 bg-border shrink-0" />
                  </>
                )}
                {/* Corner radius — rect and image */}
                {(firstSelected.type === "rect" || firstSelected.type === "image") && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">Zaokrąglenie</span>
                    <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden">
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step={1}
                        value={Math.round(firstSelected.cornerRadius ?? 0)}
                        onChange={(e) => updateSelected({ cornerRadius: Math.max(0, parseInt(e.target.value) || 0) })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-12 text-xs bg-transparent focus:outline-none text-center py-1 px-1"
                      />
                      <span className="text-xs text-muted-foreground pr-2">px</span>
                    </div>
                  </div>
                )}
                {/* Opacity */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground shrink-0">Krycie</span>
                  <input type="range" min={0.1} max={1} step={0.05} value={firstSelected.opacity ?? 1}
                    onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                    className="w-20 accent-primary" />
                  <span className="text-xs text-muted-foreground w-7">{Math.round((firstSelected.opacity ?? 1) * 100)}%</span>
                </div>
                <div className="w-px h-5 bg-border shrink-0" />
                {/* Delete */}
                <button onClick={() => { updateElements(safeElements.filter(e => !selectedIds.includes(e.id))); setSelectedIds([]); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}


          {/* Crop overlay */}
          {cropMode && (() => {
            const el = safeElements.find(e => e.id === cropMode);
            if (!el) return null;
            const cr = containerRef.current?.getBoundingClientRect();
            if (!cr) return null;
            const sx = cr.left + stagePos.x + el.x * stageScale;
            const sy = cr.top + stagePos.y + el.y * stageScale;
            const sw = (el.width ?? 200) * stageScale;
            const sh = (el.height ?? 150) * stageScale;
            const cx = sx + cropRect.left * sw;
            const cy = sy + cropRect.top * sh;
            const cw = (cropRect.right - cropRect.left) * sw;
            const ch = (cropRect.bottom - cropRect.top) * sh;

            function startHandleDrag(handle: string, e: React.MouseEvent) {
              e.preventDefault();
              cropDragRef.current = { handle, startX: e.clientX, startY: e.clientY, startRect: { ...cropRect } };
              function onMove(me: MouseEvent) {
                if (!cropDragRef.current) return;
                const { handle: h, startX, startY, startRect: sr } = cropDragRef.current;
                const ddx = (me.clientX - startX) / sw;
                const ddy = (me.clientY - startY) / sh;
                let { left, top, right, bottom } = sr;
                const minSize = 0.05;
                if (h.includes("l")) left = Math.max(0, Math.min(right - minSize, sr.left + ddx));
                if (h.includes("r")) right = Math.min(1, Math.max(left + minSize, sr.right + ddx));
                if (h.includes("t")) top = Math.max(0, Math.min(bottom - minSize, sr.top + ddy));
                if (h.includes("b")) bottom = Math.min(1, Math.max(top + minSize, sr.bottom + ddy));
                if (h === "move") {
                  const dw = right - left; const dh = bottom - top;
                  left = Math.max(0, Math.min(1 - dw, sr.left + ddx));
                  top = Math.max(0, Math.min(1 - dh, sr.top + ddy));
                  right = left + dw; bottom = top + dh;
                }
                setCropRect({ left, top, right, bottom });
              }
              function onUp() {
                cropDragRef.current = null;
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              }
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }

            const handles = [
              { id: "tl", style: { left: cx - 5, top: cy - 5 } },
              { id: "tr", style: { left: cx + cw - 5, top: cy - 5 } },
              { id: "bl", style: { left: cx - 5, top: cy + ch - 5 } },
              { id: "br", style: { left: cx + cw - 5, top: cy + ch - 5 } },
              { id: "t",  style: { left: cx + cw / 2 - 5, top: cy - 5 } },
              { id: "b",  style: { left: cx + cw / 2 - 5, top: cy + ch - 5 } },
              { id: "l",  style: { left: cx - 5, top: cy + ch / 2 - 5 } },
              { id: "r",  style: { left: cx + cw - 5, top: cy + ch / 2 - 5 } },
            ];

            return (
              <div className="fixed inset-0 z-40 select-none" style={{ cursor: "crosshair" }}>
                {/* Dark overlay outside crop — use clip path */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                  <defs>
                    <mask id="crop-hole">
                      <rect x="0" y="0" width="100%" height="100%" fill="white" />
                      <rect x={cx} y={cy} width={cw} height={ch} fill="black" />
                    </mask>
                  </defs>
                  <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-hole)" />
                  <rect x={cx} y={cy} width={cw} height={ch} fill="none" stroke="white" strokeWidth="1.5" />
                  {/* Rule-of-thirds lines */}
                  <line x1={cx + cw / 3} y1={cy} x2={cx + cw / 3} y2={cy + ch} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                  <line x1={cx + 2 * cw / 3} y1={cy} x2={cx + 2 * cw / 3} y2={cy + ch} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                  <line x1={cx} y1={cy + ch / 3} x2={cx + cw} y2={cy + ch / 3} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                  <line x1={cx} y1={cy + 2 * ch / 3} x2={cx + cw} y2={cy + 2 * ch / 3} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                </svg>
                {/* Move handle (interior of crop rect) */}
                <div className="absolute" style={{ left: cx, top: cy, width: cw, height: ch, cursor: "move" }}
                  onMouseDown={(e) => startHandleDrag("move", e)} />
                {/* Corner/edge handles */}
                {handles.map(h => (
                  <div key={h.id} className="absolute w-3 h-3 bg-white rounded-sm border border-gray-400 shadow"
                    style={{ ...h.style, cursor: h.id === "t" || h.id === "b" ? "ns-resize" : h.id === "l" || h.id === "r" ? "ew-resize" : h.id.includes("t") && h.id.includes("l") || h.id.includes("b") && h.id.includes("r") ? "nwse-resize" : "nesw-resize" }}
                    onMouseDown={(e) => startHandleDrag(h.id, e)} />
                ))}
                {/* Buttons */}
                <div className="fixed z-50 flex gap-2" style={{ left: cx + cw / 2, top: cy + ch + 12, transform: "translateX(-50%)" }}>
                  <button onClick={confirmCrop}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow">
                    <CheckIcon size={14} /> Zatwierdź
                  </button>
                  <button onClick={() => setCropMode(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors shadow">
                    <X size={14} /> Anuluj
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Context menu (right-click on element) */}
          {contextMenu && (
            <>
              <div className="fixed inset-0 z-[49]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
              <div className="fixed z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[168px] text-sm"
                style={{ left: contextMenu.screenX, top: contextMenu.screenY }}>
                {[
                  { label: "Duplikuj", icon: <Copy size={13} />, action: () => duplicateElements([contextMenu.elementId]) },
                  null,
                  { label: "Na wierzch", icon: <Layers size={13} />, action: () => bringToFront(contextMenu.elementId) },
                  { label: "Przesuń w górę", icon: <ArrowUp size={13} />, action: () => moveForward(contextMenu.elementId) },
                  { label: "Przesuń w dół", icon: <ArrowDown size={13} />, action: () => moveBackward(contextMenu.elementId) },
                  { label: "Na spód", icon: <Layers size={13} className="rotate-180" />, action: () => sendToBack(contextMenu.elementId) },
                ].map((item, i) => item === null
                  ? <div key={i} className="my-1 mx-2 h-px bg-border" />
                  : (
                  <button key={item.label} onClick={() => { item.action(); setContextMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left">
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Pen options — shown above toolbar when pen is active */}
          {tool === "pen" && (
            <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg px-4 py-2.5 z-20">
              <span className="text-xs text-muted-foreground shrink-0">Kolor</span>
              <div className="flex gap-1">
                {["#334155","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#ffffff"].map((c) => (
                  <button key={c} onClick={() => setPenColor(c)}
                    style={{ background: c, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #cbd5e1" : undefined }}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${penColor === c ? "border-primary scale-110" : "border-transparent"}`}
                  />
                ))}
                <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)}
                  className="w-5 h-5 rounded-full cursor-pointer border border-border p-0 bg-transparent" style={{ minWidth: 20 }} />
              </div>
              <div className="w-px h-5 bg-border" />
              <span className="text-xs text-muted-foreground shrink-0">Grubość</span>
              <div className="flex gap-1">
                {[1, 2, 4, 8].map((w) => (
                  <button key={w} onClick={() => setPenWidth(w)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${penWidth === w ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    <div className="rounded-full bg-current" style={{ width: Math.min(w * 3, 20), height: Math.min(w * 3, 20) }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Floating toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-2xl shadow-lg px-2 py-1.5 z-20">
            {/* Undo / Redo */}
            <button onClick={undo} disabled={historyIndex <= 0} title="Cofnij (Ctrl+Z)"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Ponów (Ctrl+Y)"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
              <Redo2 size={18} />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            {(
              [
                { t: "select", icon: <MousePointer size={18} />, label: "Zaznaczanie (V)" },
                { t: "hand", icon: <Hand size={18} />, label: "Przesuwanie (H)" },
                null,
                { t: "frame", icon: <FrameIcon size={18} />, label: "Frame (F)", hasDropdown: true },
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
                null,
                { t: "pen", icon: <Pen size={18} />, label: "Pisanie ręczne (P)" },
              ] as (null | { t: Tool; icon: React.ReactNode; label: string; hasDropdown?: boolean })[]
            ).map((item, idx) =>
              item === null ? (
                <div key={idx} className="w-px h-6 bg-border mx-1" />
              ) : item.hasDropdown ? (
                /* Frame button with preset picker */
                <div key={item.t} className="relative">
                  <div className={`flex items-center rounded-xl overflow-hidden transition-colors ${tool === item.t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <button
                      onClick={() => setTool(item.t as Tool)}
                      title={item.label}
                      className="w-9 h-9 flex items-center justify-center transition-colors"
                    >
                      {item.icon}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFramePickerOpen(v => !v); }}
                      className="h-9 px-0.5 flex items-center justify-center transition-colors hover:opacity-70"
                      title="Wybierz format"
                    >
                      {framePickerOpen ? <ChevronDown size={12} /> : <ChevronDown size={12} className="rotate-180" />}
                    </button>
                  </div>
                  {/* Preset picker popup */}
                  {framePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setFramePickerOpen(false)} />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] z-[50] bg-card border border-border rounded-2xl shadow-xl p-3 w-56">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Format frame</p>
                        <div className="grid grid-cols-3 gap-2">
                          {FRAME_PRESETS.map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => { setFramePreset(preset.id); setTool("frame"); setFramePickerOpen(false); }}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${framePreset === preset.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
                            >
                              {/* Format icon preview */}
                              <div className="w-8 h-7 flex items-center justify-center">
                                {preset.id === "custom" && (
                                  <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                                    <rect x="1" y="1" width="10" height="20" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                                    <rect x="15" y="5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
                                  </svg>
                                )}
                                {preset.id === "a4" && (
                                  <svg width="18" height="24" viewBox="0 0 18 24" fill="none">
                                    <rect x="1" y="1" width="16" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M4 7h10M4 11h10M4 15h6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                                  </svg>
                                )}
                                {preset.id === "16:9" && (
                                  <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                                    <rect x="1" y="1" width="26" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                  </svg>
                                )}
                                {preset.id === "4:3" && (
                                  <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
                                    <rect x="1" y="1" width="22" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                  </svg>
                                )}
                                {preset.id === "1:1" && (
                                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                    <rect x="1" y="1" width="20" height="20" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[11px] font-medium leading-none">{preset.label}</span>
                              {preset.id !== "custom" && (
                                <span className="text-[9px] text-muted-foreground leading-none">{preset.w}×{preset.h}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  key={item.t}
                  onClick={() => {
                    if (item.t === "image") { fileInputRef.current?.click(); return; }
                    setTool(item.t as Tool);
                  }}
                  title={item.label}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${tool === item.t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  {item.icon}
                </button>
              )
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={() => setTemplateGalleryOpen(v => !v)}
              title="Szablony"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${templateGalleryOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <DashboardAdd size={18} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
          </div>
        </div>

        {/* Right sidebar */}
        {rightSidebarOpen && (
          <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <div className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${rightTab === "projectflow" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => { setRightTab("projectflow"); setSidebarQuery(""); }}
              >
                <PushPin size={13} /> ProjectFlow
                {rightTab === "projectflow" && project && (
                  <button
                    onClick={(e) => { e.stopPropagation(); loadRooms(); }}
                    title="Odśwież"
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw size={11} />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setRightTab("products"); setSidebarQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightTab === "products" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package size={13} /> Produkty
              </button>
              <button
                onClick={() => { setRightTab("lists"); setSidebarQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightTab === "lists" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LocalMall size={13} /> Listy
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
                  {project && filteredRooms.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak renderów{sidebarQuery ? " dla tej frazy" : ""}</p>
                  )}
                  {project && filteredRooms.length > 0 && (
                    <div className="space-y-0.5">
                      {filteredRooms.map((room) => (
                        <div key={room.id}>
                          {/* Room row */}
                          <button
                            onClick={() => setExpandedRooms(prev => { const n = new Set(prev); n.has(room.id) ? n.delete(room.id) : n.add(room.id); return n; })}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-muted rounded-lg transition-colors"
                          >
                            {expandedRooms.has(room.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span className="truncate">{room.name}</span>
                          </button>
                          {expandedRooms.has(room.id) && (
                            <div className="ml-1">
                              {/* Renders outside folders */}
                              {room.renders.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 mb-1">
                                  {room.renders.map(r => (
                                    <RenderSidebarItem key={r.id} render={r} onClick={addRenderToCanvas} />
                                  ))}
                                </div>
                              )}
                              {/* Folders */}
                              {room.folders.map(folder => (
                                <div key={folder.id}>
                                  <button
                                    onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                  >
                                    {expandedFolders.has(folder.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    <Folder size={11} />
                                    <span className="truncate">{folder.name}</span>
                                    <span className="ml-auto text-muted-foreground/60">{folder.renders.length}</span>
                                  </button>
                                  {expandedFolders.has(folder.id) && (
                                    <div className="ml-2 grid grid-cols-2 gap-1.5 mt-1 mb-1">
                                      {folder.renders.map(r => (
                                        <RenderSidebarItem key={r.id} render={r} onClick={addRenderToCanvas} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {rightTab === "products" && (
                <>
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak produktów{sidebarQuery ? " dla tej frazy" : ""}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map((p) => (
                      <button key={p.id} onClick={() => p.imageUrl && addProductToCanvas(p.imageUrl, p.name)}
                        disabled={!p.imageUrl}
                        className="flex flex-col rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all text-left disabled:opacity-40"
                        title={p.name}>
                        <div className="aspect-square bg-muted w-full overflow-hidden">
                          {p.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <Package size={24} className="text-muted-foreground m-auto mt-8" />}
                        </div>
                        <p className="text-[11px] font-medium truncate px-2 py-1.5">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {rightTab === "lists" && (
                <>
                  {!client && (
                    <p className="text-xs text-muted-foreground text-center py-8">Ta tablica nie ma przypisanego klienta</p>
                  )}
                  {client && lists.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Brak list zakupowych dla tego klienta</p>
                  )}
                  {client && lists.length > 0 && (
                    <div className="space-y-0.5">
                      {lists.map((list) => (
                        <div key={list.id}>
                          <button
                            onClick={() => setExpandedLists(prev => { const n = new Set(prev); n.has(list.id) ? n.delete(list.id) : n.add(list.id); return n; })}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium hover:bg-muted rounded-lg transition-colors"
                          >
                            {expandedLists.has(list.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <LocalMall size={11} className="text-muted-foreground shrink-0" />
                            <span className="truncate">{list.name}</span>
                          </button>
                          {expandedLists.has(list.id) && (
                            <div className="ml-1">
                              {list.sections.map(section => (
                                <div key={section.id}>
                                  <button
                                    onClick={() => setExpandedSections(prev => { const n = new Set(prev); n.has(section.id) ? n.delete(section.id) : n.add(section.id); return n; })}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                  >
                                    {expandedSections.has(section.id) ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    <span className="truncate">{section.name}</span>
                                    <span className="ml-auto text-muted-foreground/60">{section.products.length}</span>
                                  </button>
                                  {expandedSections.has(section.id) && (
                                    <div className="ml-2 mt-1 grid grid-cols-2 gap-1.5">
                                      {section.products.filter(p => !sidebarQuery || p.name.toLowerCase().includes(sidebarQuery.toLowerCase())).map(product => (
                                        <button
                                          key={product.id}
                                          onClick={() => product.imageUrl && addProductToCanvas(product.imageUrl, product.name)}
                                          disabled={!product.imageUrl}
                                          className="flex flex-col rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all text-left disabled:opacity-40"
                                          title={product.name}
                                        >
                                          <div className="aspect-square bg-muted w-full overflow-hidden">
                                            {product.imageUrl
                                              // eslint-disable-next-line @next/next/no-img-element
                                              ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                              : <Package size={20} className="text-muted-foreground m-auto mt-6" />}
                                          </div>
                                          <div className="px-1.5 py-1">
                                            <p className="text-[11px] font-medium truncate">{product.name}</p>
                                            {product.price && <p className="text-[10px] text-muted-foreground">{product.price}</p>}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rename frame dialog */}
      {renameFrameId && (() => {
        const frameEl = safeElements.find(e => e.id === renameFrameId);
        if (!frameEl) return null;
        const sx = frameEl.x * stageScale + stagePos.x;
        const sy = frameEl.y * stageScale + stagePos.y;
        return (
          <>
            <div className="fixed inset-0 z-[80]" onClick={() => setRenameFrameId(null)} />
            <div
              style={{ position: "absolute", left: sx, top: sy - 46, zIndex: 90, pointerEvents: "auto" }}
              className="flex items-center gap-1.5 bg-card border border-border rounded-xl shadow-xl px-2 py-1.5"
              onClick={e => e.stopPropagation()}
            >
              <input
                autoFocus
                value={renameFrameValue}
                onChange={e => setRenameFrameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { updateEl(renameFrameId!, { frameName: renameFrameValue || "Frame" }); setRenameFrameId(null); }
                  if (e.key === "Escape") setRenameFrameId(null);
                }}
                className="text-xs font-semibold bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[120px]"
              />
              <button
                onClick={() => { updateEl(renameFrameId!, { frameName: renameFrameValue || "Frame" }); setRenameFrameId(null); }}
                className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                OK
              </button>
            </div>
          </>
        );
      })()}

      {/* Edit modal */}
      {editModalOpen && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setEditModalOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold">Edytuj tablicę</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Zmień nazwę, klienta i projekt przypisane do tablicy.</p>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Nazwa</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nazwa tablicy"
                autoFocus
              />
            </div>

            {/* Client */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Klient</label>
              <select
                value={editClientId}
                onChange={(e) => { setEditClientId(e.target.value); setEditProjectId(""); }}
                className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— brak klienta —</option>
                {editClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Projekt</label>
              <select
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                disabled={!editClientId}
                className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                <option value="">— brak projektu —</option>
                {(editClients.find((c) => c.id === editClientId)?.projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {editSaving ? "Zapisywanie…" : "Zapisz"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
