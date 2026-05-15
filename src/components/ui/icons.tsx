import type { CSSProperties, ReactElement } from "react";

export interface IconProps {
  size?: number | string;
  className?: string;
  /** No-op — kept for API compatibility with lucide-react */
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
}

/** Drop-in replacement for the `LucideIcon` type */
export type LucideIcon = (props: IconProps) => ReactElement;

function icon(symbolName: string): LucideIcon {
  function Icon({ size, className, color, style }: IconProps): ReactElement {
    const computedStyle: CSSProperties = {
      ...(size ? { fontSize: typeof size === "number" ? `${size}px` : size } : {}),
      ...(color ? { color } : {}),
      ...style,
    };
    return (
      <span
        className={`material-symbols-rounded${className ? ` ${className}` : ""}`}
        style={Object.keys(computedStyle).length > 0 ? computedStyle : undefined}
        aria-hidden="true"
      >
        {symbolName}
      </span>
    );
  }
  Icon.displayName = symbolName;
  return Icon;
}

// ── Navigation / Layout ────────────────────────────────────────────────────
export const LayoutDashboard  = icon("space_dashboard");
export const LayoutGrid       = icon("grid_view");
export const List             = icon("format_list_bulleted");
export const PanelLeftClose   = icon("left_panel_close");
export const PanelLeftOpen    = icon("left_panel_open");
export const Menu             = icon("menu");
export const Grid2x2          = icon("apps");
export const SplitSquareHorizontal = icon("flip");
export const Maximize2        = icon("open_in_full");

// ── Modules (user-specified) ───────────────────────────────────────────────
export const Users            = icon("group");

export function PictureInPicture({ size = 20, className, color, style }: IconProps): ReactElement {
  const px = typeof size === "number" ? size : parseInt(size as string, 10) || 20;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 417 417"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ color: color ?? undefined, flexShrink: 0, ...style }}
    >
      <path d="M364.875 173.75V121.625C364.875 112.409 361.214 103.57 354.697 97.053C348.18 90.5361 339.341 86.875 330.125 86.875H208.5" stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M52.125 243.25V278C52.125 287.216 55.7861 296.055 62.303 302.572C68.8199 309.089 77.6587 312.75 86.875 312.75H139" stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M81.2134 65.433L125.797 110.017L147.415 110.053C148.687 110.056 149.88 110.296 150.993 110.775C152.107 111.254 153.088 111.918 153.937 112.767L157.599 116.429C159.404 118.234 160.308 120.355 160.313 122.792C160.317 125.229 159.42 127.347 157.621 129.146L132.231 154.536L169.49 191.795C171.295 193.6 172.199 195.721 172.203 198.158C172.207 200.595 171.31 202.713 169.512 204.512C167.713 206.31 165.595 207.207 163.158 207.203C160.721 207.199 158.6 206.295 156.795 204.49L119.536 167.231L94.1459 192.621C92.3474 194.419 90.2295 195.316 87.7922 195.312C85.3548 195.308 83.2339 194.404 81.4293 192.599L77.767 188.937C76.9178 188.088 76.2538 187.106 75.7751 185.993C75.2963 184.879 75.0559 183.687 75.0537 182.415L75.017 160.797L30.4332 116.213C28.6348 118.012 26.5169 118.909 24.0795 118.905C21.6422 118.9 19.5212 117.996 17.7166 116.192C15.912 114.387 15.0077 112.266 15.0035 109.829C14.9994 107.391 15.8966 105.273 17.695 103.475L68.4751 52.6948C70.2736 50.8963 72.3915 49.9992 74.8289 50.0033C77.2662 50.0074 79.3872 50.9118 81.1918 52.7164C82.9963 54.521 83.9007 56.6419 83.9048 59.0793C83.909 61.5166 83.0118 63.6345 81.2134 65.433ZM93.1506 168.14L133.14 128.15L118.516 128.126L68.5183 78.128L43.1283 103.518L93.1258 153.516L93.1506 168.14Z" fill="currentColor"/>
      <path d="M282.557 223H212.318C206.795 223 202.318 227.477 202.318 233V260.5V266M202.318 266H211.945C217.467 266 221.945 270.477 221.945 276V278.5C221.945 284.023 226.422 288.5 231.945 288.5H344.137C349.66 288.5 354.137 284.023 354.137 278.5V276C354.137 270.477 358.614 266 364.137 266H371.743M202.318 266H192C188.134 266 185 269.134 185 273V316C185 319.866 188.134 323 192 323H210.399M210.399 323V347.5M210.399 323H363.95M363.95 323H379.35C384.873 323 389.35 318.523 389.35 313V276C389.35 270.477 384.873 266 379.35 266H371.743M363.95 323V347.5M371.743 266V230C371.743 226.134 368.609 223 364.743 223H277.729" stroke="currentColor" strokeWidth="16" strokeLinecap="round"/>
    </svg>
  );
}
export const ScrollText       = icon("list_alt");
export const LocalMall        = icon("local_mall");
export const Package          = icon("package_2");
export const CalendarDays     = icon("calendar_month");
export const NotebookText     = icon("note_stack");
export const NotebookPen      = icon("note_stack_add");
export const MessageSquare    = icon("forum");
export const ChatBubble       = icon("chat_bubble");
export const Comment          = icon("comment");
export const CheckSquare      = icon("check_box");
export const Columns3         = icon("view_column");

// ── Pins ───────────────────────────────────────────────────────────────────
export const Pin              = icon("keep");
export function PushPin({ size = 20, className, color, style }: IconProps): ReactElement {
  const px = typeof size === "number" ? size : parseInt(size as string, 10) || 20;
  return (
    <svg
      width={px}
      height={px}
      viewBox="-22 -22 228 229"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ color: color ?? undefined, flexShrink: 0, ...style }}
    >
      <path d="M121.728 122.988L162.007 82.6681C166.445 78.2248 163.239 70.6362 156.959 70.7215L146.549 70.8628L119.786 71.2261C119.236 71.2336 118.707 71.014 118.324 70.6191L86.1743 37.4878L58.6215 8.66333C55.9075 5.82403 51.389 5.77308 48.6117 8.55045L8.55019 48.6119C5.84554 51.3166 5.81265 55.6914 8.47633 58.4364L36.4243 87.2378L68.6112 120.408C68.9724 120.78 69.1749 121.278 69.1759 121.796L69.2485 158.623C69.2607 164.855 76.7967 167.965 81.2007 163.557L121.728 122.988ZM121.728 122.988L177.228 178.488" stroke="currentColor" strokeWidth="13" strokeLinecap="round"/>
    </svg>
  );
}
export const PinOff           = icon("keep_off");
export const MapPin           = icon("location_on");

// ── Actions ───────────────────────────────────────────────────────────────
export const Plus             = icon("add");
export const Minus            = icon("remove");
export const X                = icon("close");
export const Check            = icon("check");
export const Search           = icon("search");
export const Trash2           = icon("delete");
export const Edit2            = icon("edit");
export const Pencil           = icon("edit");
export const PenLine          = icon("edit");
export const Pen              = icon("draw");
export const Eraser           = icon("ink_eraser");
export const Archive          = icon("archive");
export const ArchiveRestore   = icon("unarchive");
export const Copy             = icon("content_copy");
export const CopyCheck        = icon("library_add_check");
export const Link2            = icon("link");
export const Share2           = icon("share");
export const ExternalLink     = icon("open_in_new");
export const Download         = icon("download");
export const Upload           = icon("upload");
export const Send             = icon("send");
export const RefreshCw        = icon("refresh");
export const RotateCcw        = icon("undo");
export const History          = icon("history");

// ── Visibility / Access ────────────────────────────────────────────────────
export const Eye              = icon("visibility");
export const EyeOff           = icon("visibility_off");
export const Lock             = icon("lock");
export const LockOpen         = icon("lock_open");
export const ShieldCheck      = icon("verified_user");
export const KeyRound         = icon("key");

// ── Chevrons / Arrows ─────────────────────────────────────────────────────
export const ChevronLeft      = icon("chevron_left");
export const ChevronRight     = icon("chevron_right");
export const ChevronDown      = icon("expand_more");
export const ChevronUp        = icon("expand_less");
export const ChevronsLeftRight= icon("swap_horiz");
export const ArrowLeft        = icon("arrow_back");
export const ArrowUp          = icon("arrow_upward");
export const ArrowDown        = icon("arrow_downward");
export const ArrowUpDown      = icon("swap_vert");
export const ArrowDownUp      = icon("swap_vert");
export const CornerDownLeft   = icon("subdirectory_arrow_left");

// ── Status / Alerts ───────────────────────────────────────────────────────
export const Check2           = icon("check");
export const CheckCircle      = icon("check_circle");
export const CheckCircle2     = icon("check_circle");
export const AlertTriangle    = icon("warning");
export const AlertCircle      = icon("error");
export const Info             = icon("info");
export const Circle           = icon("circle");
export const Bell             = icon("notifications");

// ── Files / Folders ───────────────────────────────────────────────────────
export const Folder           = icon("folder");
export const FolderOpen       = icon("folder_open");
export const FolderPlus       = icon("create_new_folder");
export const FolderInput      = icon("drive_folder_upload");
export const FileText         = icon("description");
export const File             = icon("insert_drive_file");
export const FileSpreadsheet  = icon("table_chart");
export const FileDown         = icon("file_download");
export const Paperclip        = icon("attach_file");

// ── Media ─────────────────────────────────────────────────────────────────
export const Image            = icon("image");
export const ImagePlus        = icon("add_photo_alternate");
export const Mic              = icon("mic");
export const StopCircle       = icon("stop_circle");
export const Square           = icon("check_box_outline_blank");
export const Sparkles         = icon("auto_awesome");

// ── User / Auth ───────────────────────────────────────────────────────────
export const User             = icon("person");
export const UserRound        = icon("person");
export const UserCircle       = icon("account_circle");
export const UserPlus         = icon("person_add");
export const LogOut           = icon("logout");
export const Mail             = icon("mail");
export const Phone            = icon("phone");
export const DoorOpen         = icon("door_open");

// ── Theme / Settings ──────────────────────────────────────────────────────
export const Sun              = icon("light_mode");
export const Moon             = icon("dark_mode");
export const Monitor          = icon("desktop_windows");
export const Settings         = icon("settings");
export const Palette          = icon("palette");
export const Globe            = icon("language");
export const HelpCircle       = icon("help");
export const Puzzle           = icon("extension");
export const Activity         = icon("monitoring");
export const SlidersHorizontal= icon("tune");
export const Layers           = icon("layers");

// ── Layout / Grid ─────────────────────────────────────────────────────────
export const GripVertical     = icon("drag_indicator");
export const MoreHorizontal   = icon("more_horiz");
export const MoreVertical     = icon("more_vert");

// ── Zoom / View ───────────────────────────────────────────────────────────
export const ZoomIn           = icon("zoom_in");
export const ZoomOut          = icon("zoom_out");

// ── Text Formatting (NoteEditor) ──────────────────────────────────────────
export const Bold             = icon("format_bold");
export const Italic           = icon("format_italic");
export const Underline        = icon("format_underlined");
export const Strikethrough    = icon("strikethrough_s");
export const ListOrdered      = icon("format_list_numbered");
export const ListChecks       = icon("checklist");

// ── Finance ───────────────────────────────────────────────────────────────
export const Wallet           = icon("account_balance_wallet");
export const DollarSign       = icon("attach_money");
export const Sheet            = icon("table_chart");

// ── Misc ──────────────────────────────────────────────────────────────────
export const Home             = icon("home");
export const Loader2          = icon("progress_activity");
export const Clock            = icon("schedule");
export const ScrollText2      = icon("receipt_long");
export const XCircle          = icon("cancel");
export const Armchair         = icon("chair");
export const ImagePlus2       = icon("add_photo_alternate");

// ── Room icons (roomIcons.tsx) ─────────────────────────────────────────────
export const Sofa             = icon("weekend");
export const Flame            = icon("local_fire_department");
export const Bed              = icon("bed");
export const Bath             = icon("bathtub");
export const Toilet           = icon("wc");
export const Lamp             = icon("lightbulb");
export const Utensils         = icon("restaurant");
export const Baby             = icon("child_care");
export const Dumbbell         = icon("fitness_center");
export const Shirt            = icon("checkroom");
export const Car              = icon("directions_car");
export const TreePine         = icon("park");
export const BookOpen         = icon("menu_book");
export const Tv               = icon("tv");
export const ShowerHead       = icon("shower");

// ── Aliases with *Icon suffix (UI primitives) ──────────────────────────────
export const XIcon            = X;
export const ChevronRightIcon = ChevronRight;
export const CheckIcon        = Check;
export const CircleCheckIcon  = CheckCircle;
export const InfoIcon         = Info;
export const TriangleAlertIcon= AlertTriangle;
export const OctagonXIcon     = XCircle;
export const Loader2Icon      = Loader2;
