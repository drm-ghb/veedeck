"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RenderViewer from "@/components/render/RenderViewer";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientDiscussionView from "@/components/dyskusje/ClientDiscussionView";
import ClientPaymentsView from "@/components/share/ClientPaymentsView";
import ClientScheduleView from "@/components/share/ClientScheduleView";
import ClientSurveyView from "@/components/ankiety/share/ClientSurveyView";
import ShareListClient from "@/components/listy/ShareListClient";
import ModuleGuideSlider from "@/components/share/ModuleGuideSlider";
import { getRoomIcon } from "@/lib/roomIcons";
import { ChevronLeft, ChevronRight, ChatBubble, FileText, Folder, User, Mail, Lock, Info, LocalMall, Pencil, X, Eye, EyeOff, UserCircle, Check, CopyCheck, Download, ClipboardList, CheckCircle } from "@/components/ui/icons";
import PdfThumbnail from "@/components/render/PdfThumbnail";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { SectionHeader } from "@/components/settings/SettingsShared";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useUploadThing } from "@/lib/uploadthing-client";
import { zip } from "fflate";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface ListProduct {
  id: string; name: string; url: string | null; imageUrl: string | null;
  price: string | null; manufacturer: string | null; color: string | null;
  dimensions: string | null; description: string | null; deliveryTime: string | null;
  quantity: number; order: number; commentCount: number; approval: string | null; note: string | null; optional: boolean;
}
interface ListSection { id: string; name: string; order: number; unsorted: boolean; products: ListProduct[]; }
interface ListData {
  id: string; name: string; shareToken: string; hidePrices: boolean;
  sections: ListSection[];
}

interface Reply { id: string; content: string; author: string; createdAt: string; }
interface Comment { id: string; title?: string | null; content: string; posX: number; posY: number; posPage: number | null; status: "NEW" | "IN_PROGRESS" | "DONE"; author: string; createdAt: string; replies: Reply[]; }
interface RenderVersion { id: string; fileUrl: string; versionNumber: number; label?: string | null; archivedAt: string; }
interface Render { id: string; name: string; fileUrl: string; fileType?: string; status: RenderStatus; comments: Comment[]; versions: RenderVersion[]; folder?: { id: string; name: string } | null; }
interface ShareFolder { id: string; name: string; pinned: boolean; }
interface Room { id: string; name: string; type: string; icon?: string | null; folders: ShareFolder[]; renders: Render[]; }
interface Project {
  id: string; title: string; description: string | null;
  rooms: Room[];
  allowDirectStatusChange: boolean; allowClientComments: boolean; allowClientAcceptance: boolean;
  hideCommentCount: boolean; allowClientVersionRestore: boolean;
  clientWelcomeMessage: string | null; clientLogoUrl: string | null; accentColor: string | null;
  designerName: string | null; navMode: string; hiddenModules: string[];
  shoppingLists: { id: string; name: string; shareToken: string }[];
  hasDiscussion: boolean; discussionId: string | null; colorTheme: string; customTheme?: { primary: string; background: string; sidebar: string } | null;
  paymentsSharedWithClient: boolean;
  scheduleSharedWithClient: boolean;
  hasSurveys: boolean;
}

export default function ClientProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  function navigate(params: Record<string, string | null>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const qs = sp.toString();
    window.history.replaceState(null, "", `/client/${projectId}${qs ? `?${qs}` : ""}`);
  }

  function restoreFromParams(data: Project, sp: URLSearchParams) {
    const v = sp.get("view");
    const roomId = sp.get("roomId");
    const folderId = sp.get("folderId");
    const renderId = sp.get("renderId");
    const listId = sp.get("listId");
    if (v === "projects") {
      setView("projects"); setSelectedRoom(null); setSelectedFolder(null); setSelectedRender(null);
    } else if (v === "rooms") {
      setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); setSelectedRender(null);
    } else if ((v === "room" || v === "render") && roomId) {
      const room = data.rooms.find((r) => r.id === roomId);
      if (room) {
        setSelectedRoom(room);
        const folder = folderId ? room.folders.find((f) => f.id === folderId) ?? null : null;
        setSelectedFolder(folder);
        if (v === "render" && renderId) {
          const render = room.renders.find((r) => r.id === renderId);
          if (render) { setSelectedRender(render); setView("render"); }
          else { setSelectedRender(null); setView("room"); }
        } else {
          setSelectedRender(null); setView("room");
        }
      }
    } else if (v === "payments") {
      setView("payments"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "schedule") {
      setView("schedule"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "discussion") {
      setView("discussion"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "settings") {
      setView("settings"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "ankiety") {
      setView("ankiety"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "survey") {
      const surveyToken = sp.get("surveyToken");
      setView("ankiety"); setSelectedRoom(null); setSelectedFolder(null);
      if (surveyToken) setPendingSurveyToken(surveyToken);
    } else if (v === "lists") {
      setView("lists"); setSelectedRoom(null); setSelectedFolder(null);
    } else if (v === "list" && listId) {
      openList(listId);
    } else {
      setView("home"); setSelectedRoom(null); setSelectedFolder(null);
    }
  }
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientProjects, setClientProjects] = useState<{ id: string; title: string; description: string | null; createdAt: string; renderCount: number }[]>([]);
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [activeRooms, setActiveRooms] = useState<Room[] | null>(null);
  const [view, setView] = useState<"home" | "projects" | "rooms" | "room" | "render" | "discussion" | "settings" | "lists" | "list" | "payments" | "schedule" | "ankiety" | "survey">("home");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListData, setSelectedListData] = useState<ListData | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [surveys, setSurveys] = useState<{ id: string; name: string; shareToken: string; createdAt: string; completed: boolean; answeredCount: number; totalQuestions: number }[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [surveysFetched, setSurveysFetched] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<{ shareToken: string; name: string; readOnly?: boolean } | null>(null);
  const [pendingSurveyToken, setPendingSurveyToken] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    setSurveysLoading(true);
    try {
      const res = await fetch(`/api/client/${projectId}/surveys`);
      if (res.ok) setSurveys(await res.json());
    } catch { /* ignore */ } finally {
      setSurveysLoading(false);
      setSurveysFetched(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openAnkiety = useCallback(() => {
    setView("ankiety");
    navigate({ view: "ankiety" });
    fetchSurveys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSurveys]);

  useEffect(() => {
    if (view === "ankiety" && !surveysFetched) {
      fetchSurveys();
    }
  }, [view, surveysFetched, fetchSurveys]);

  useEffect(() => {
    if (!pendingSurveyToken || !surveysFetched) return;
    const survey = surveys.find((s) => s.shareToken === pendingSurveyToken);
    if (survey) {
      setSelectedSurvey({ shareToken: survey.shareToken, name: survey.name });
      setView("survey");
    }
    setPendingSurveyToken(null);
  }, [pendingSurveyToken, surveysFetched, surveys]);

  const openList = useCallback(async (listId: string) => {
    setListLoading(true);
    setSelectedListId(listId);
    setView("list");
    navigate({ view: "list", listId });
    try {
      const res = await fetch(`/api/client/${projectId}/lists/${listId}`);
      if (!res.ok) throw new Error();
      const data: ListData = await res.json();
      setSelectedListData(data);
    } catch {
      toast.error("Nie udało się załadować listy");
      setView("lists");
      navigate({ view: "lists" });
    } finally {
      setListLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const authorName = (session?.user as any)?.name || session?.user?.name || "Klient";
  const currentUserId = session?.user?.id;
  const userEmail = session?.user?.email ?? "";

  // Settings state
  const { theme, setTheme } = useTheme();
  const [settingsName, setSettingsName] = useState("");
  const [settingsFullName, setSettingsFullName] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [fullNameLoading, setFullNameLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailNotifEnabled, setEmailNotifEnabled] = useState(false);
  const [emailNotifModules, setEmailNotifModules] = useState<string[]>([]);
  const [emailNotifLoading, setEmailNotifLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Avatar state
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<Area | null>(null);
  const [avatarCropUploading, setAvatarCropUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const hasRestoredParams = useRef(false);
  const { startUpload: startAvatarUpload } = useUploadThing("avatarUploader");

  // Effect 1: load from sessionStorage cache instantly on mount (no loading screen on refresh/back)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`client-project-${projectId}`);
      if (cached) {
        const data = JSON.parse(cached) as Project;
        setProject(data);
        setLoading(false);
        restoreFromParams(data, new URLSearchParams(window.location.search));
        hasRestoredParams.current = true;
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Effect 2: auth check + fresh fetch (always runs, updates data in background if cache was used)
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "client") { router.push("/panel-glowny"); return; }

    setSettingsName((session.user as any)?.name ?? "");
    setSettingsFullName((session.user as any)?.fullName ?? "");
    setClientAvatarUrl((session.user as any)?.avatarUrl ?? null);

    // Load contactEmail and email notification prefs
    fetch("/api/user")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => {
        if (!u) return;
        setSettingsEmail(u.contactEmail ?? "");
        setEmailNotifEnabled(u.emailNotifEnabled ?? false);
        setEmailNotifModules(u.emailNotifModules ?? []);
      })
      .catch(() => {});

    fetch("/api/client")
      .then((r) => r.ok ? r.json() : [])
      .then((list: { id: string; title: string; description: string | null; createdAt: string; renderCount: number }[]) => setClientProjects(list))
      .catch(() => {});

    fetch(`/api/client/${projectId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setProject(data);
        try { sessionStorage.setItem(`client-project-${projectId}`, JSON.stringify(data)); } catch {}
        if (!hasRestoredParams.current) {
          restoreFromParams(data, new URLSearchParams(window.location.search));
          hasRestoredParams.current = true;
        }
        setLoading(false);
      })
      .catch(() => { toast.error("Nie udało się załadować projektu"); setLoading(false); });
  }, [projectId, status, session, router]);

  async function handleNameSave() {
    if (!settingsName.trim()) return;
    setNameLoading(true);
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: settingsName.trim() }) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Nie udało się zapisać nazwy"); return; }
      toast.success("Nazwa zaktualizowana");
    } finally { setNameLoading(false); }
  }

  async function handleEmailSave() {
    if (!settingsEmail.trim()) return;
    if (!settingsEmail.includes("@")) { toast.error("Podaj poprawny adres e-mail (brak znaku @)"); return; }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactEmail: settingsEmail.trim() }) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Nie udało się zapisać emaila"); return; }
      toast.success("Email zaktualizowany");
    } finally { setEmailLoading(false); }
  }

  async function handleFullNameSave() {
    if (!settingsFullName.trim()) return;
    setFullNameLoading(true);
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: settingsFullName.trim() }) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Nie udało się zapisać"); return; }
      toast.success("Imię i nazwisko zaktualizowane");
    } finally { setFullNameLoading(false); }
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropSrc(reader.result as string);
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
    };
    reader.readAsDataURL(file);
  }

  const handleAvatarCropComplete = useCallback((_: Area, pixels: Area) => {
    setAvatarCroppedAreaPixels(pixels);
  }, []);

  async function handleAvatarCropApply() {
    if (!avatarCropSrc || !avatarCroppedAreaPixels) return;
    setAvatarCropUploading(true);
    try {
      const file = await getCroppedImgClient(avatarCropSrc, avatarCroppedAreaPixels);
      const res = await startAvatarUpload([file]);
      const url = res?.[0]?.url;
      if (!url) throw new Error();
      await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: url }) });
      setClientAvatarUrl(url);
      setAvatarCropSrc(null);
      toast.success("Avatar zapisany");
    } catch {
      toast.error("Błąd przesyłania avatara");
    } finally {
      setAvatarCropUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: null }) });
    setClientAvatarUrl(null);
    toast.success("Avatar usunięty");
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) { toast.error("Hasła nie są identyczne"); return; }
    const valid = newPassword.length >= 8 && /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
    if (!valid) { toast.error("Hasło nie spełnia wymagań bezpieczeństwa"); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Nie udało się zmienić hasła"); return; }
      toast.success("Hasło zostało zmienione");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally { setPasswordLoading(false); }
  }

  useEffect(() => {
    if (project?.accentColor) {
      document.documentElement.style.setProperty("--share-accent", project.accentColor);
    }
    return () => { document.documentElement.style.removeProperty("--share-accent"); };
  }, [project?.accentColor]);

  function updateRenderInState(renderId: string, status: RenderStatus) {
    setProject((prev) => prev ? {
      ...prev,
      rooms: prev.rooms.map((room) => ({
        ...room,
        renders: room.renders.map((r) => r.id === renderId ? { ...r, status } : r),
      })),
    } : prev);
    setActiveRooms((prev) => prev ? prev.map((room) => ({
      ...room,
      renders: room.renders.map((r) => r.id === renderId ? { ...r, status } : r),
    })) : prev);
    setSelectedRender((prev) => prev?.id === renderId ? { ...prev, status } : prev);
  }

  const handleRenderStatusChange = useCallback(async (renderId: string, status: RenderStatus) => {
    await fetch(`/api/client/${activeProjectId}/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    updateRenderInState(renderId, status);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  const [batchApproving, setBatchApproving] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRenderIds, setSelectedRenderIds] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedRenderIds(new Set());
  }, [selectedFolder]);

  async function downloadFile(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function handleDownloadAll(renders: Render[], zipName = "pliki") {
    if (!renders.length) return;
    if (renders.length === 1) {
      await downloadFile(renders[0].fileUrl, renders[0].name);
      return;
    }
    setDownloadingAll(true);
    try {
      const fetched = await Promise.all(
        renders.map(async (render) => {
          const res = await fetch(render.fileUrl);
          const buf = await res.arrayBuffer();
          const mimeExt = res.headers.get("content-type")?.split("/")[1]?.split(";")[0];
          const urlExt = render.fileUrl.split("?")[0].split(".").pop();
          const ext = render.fileType === "pdf" ? "pdf" : (mimeExt ?? urlExt ?? "jpg");
          return { name: render.name, ext, data: new Uint8Array(buf) };
        })
      );
      const fileMap: Record<string, Uint8Array> = {};
      const usedNames = new Set<string>();
      for (const { name, ext, data } of fetched) {
        let filename = `${name}.${ext}`;
        let counter = 1;
        while (usedNames.has(filename)) {
          filename = `${name}_${counter}.${ext}`;
          counter++;
        }
        usedNames.add(filename);
        fileMap[filename] = data;
      }
      zip(fileMap, (err, data) => {
        setDownloadingAll(false);
        if (err) { toast.error("Błąd tworzenia archiwum"); return; }
        const blob = new Blob([data], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${zipName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch {
      toast.error("Błąd pobierania plików");
      setDownloadingAll(false);
    }
  }

  async function handleDownloadSelected(renders: Render[]) {
    await handleDownloadAll(renders, "wybrane");
    setSelectionMode(false);
    setSelectedRenderIds(new Set());
  }

  async function handleBatchApprove(renders: Render[]) {
    const toApprove = renders.filter((r) => r.status !== "ACCEPTED");
    if (toApprove.length === 0) return;
    setBatchApproving(true);
    try {
      await Promise.all(
        toApprove.map((r) =>
          fetch(`/api/client/${activeProjectId}/renders/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACCEPTED" }),
          })
        )
      );
      const updated = await fetch(`/api/client/${activeProjectId}`).then((r) => r.json()) as Project;
      if (activeProjectId === projectId) {
        setProject(updated);
      } else {
        setActiveRooms(updated.rooms);
      }
      setSelectedRoom((prev) => prev ? (updated.rooms.find((r) => r.id === prev.id) ?? prev) : prev);
      toast.success(`Zatwierdzono ${toApprove.length} plik${toApprove.length === 1 ? "" : toApprove.length < 5 ? "i" : "ów"}`);
    } catch {
      toast.error("Błąd podczas zatwierdzania");
    } finally {
      setBatchApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-gray-400 animate-pulse">Ładowanie...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-gray-500">Projekt nie został znaleziony lub brak dostępu.</p>
      </div>
    );
  }

  const themeApplier = <ClientThemeApplier colorTheme={project.colorTheme} customTheme={project.customTheme} />;

  const sidebarProps = {
    token: "",
    discussionId: project.discussionId,
    showProjectFlow: !project.hiddenModules.includes("renderflow"),
    showListy: !project.hiddenModules.includes("listy"),
    showDyskusje: !project.hiddenModules.includes("dyskusje"),
    showPayments: project.paymentsSharedWithClient,
    showHarmonogram: project.scheduleSharedWithClient,
    showAnkiety: project.hasSurveys,
    onAnkietyClick: openAnkiety,
    shoppingLists: project.shoppingLists,
    onHomeClick: () => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); },
    onProjectFlowClick: () => { if (clientProjects.length > 1) { setView("projects"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "projects" }); } else if (project.rooms.length === 1) { setActiveRooms(null); setActiveProjectId(projectId); setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: project.rooms[0].id }); } else { setActiveRooms(null); setActiveProjectId(projectId); setView("rooms"); navigate({ view: "rooms" }); }},
    onDiscussionClick: () => { setView("discussion"); navigate({ view: "discussion" }); },
    onSettingsClick: () => { setView("settings"); navigate({ view: "settings" }); },
    onListClick: () => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); navigate({ view: "lists" }); } },
    onPaymentsClick: () => { setView("payments"); navigate({ view: "payments" }); },
    onHarmonogramClick: () => { setView("schedule"); navigate({ view: "schedule" }); },
    clientProjectId: projectId,
    activeView: view,
    currentUserId,
    mobileOpen: mobileSidebarOpen,
    onMobileOpenChange: setMobileSidebarOpen,
  };

  // Payments view
  if (view === "payments") {
    return (
      <div className="h-dvh flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} currentUserId={currentUserId} />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
          <ShareSidebar {...sidebarProps} />
          <main className="flex-1 overflow-y-auto bg-background rounded-tl-2xl">
            <ClientPaymentsView projectId={projectId} />
          </main>
        </div>
      </div>
    );
  }

  // Schedule view
  if (view === "schedule") {
    return (
      <div className="h-dvh flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} currentUserId={currentUserId} />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
          <ShareSidebar {...sidebarProps} />
          <main className="flex-1 overflow-y-auto bg-background rounded-tl-2xl">
            <ClientScheduleView projectId={projectId} />
          </main>
        </div>
      </div>
    );
  }

  // Discussion view
  if (view === "discussion" && project.discussionId) {
    const content = (
      <ClientDiscussionView
        token=""
        discussionId={project.discussionId}
        discussionTitle={project.title}
        apiBasePath={`/api/client/${projectId}/discussions/${project.discussionId}`}
        initialAuthorName={authorName}
        currentUserId={currentUserId}
        currentUserAvatarUrl={clientAvatarUrl}
      />
    );

    return (
      <div className="h-dvh flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} currentUserId={currentUserId} />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
          <ShareSidebar
            token=""
            discussionId={project.discussionId}
            showProjectFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            shoppingLists={project.shoppingLists}
            onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }}
            onProjectFlowClick={() => { if (clientProjects.length > 1) { setView("projects"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "projects" }); } else if (project.rooms.length === 1) { setActiveRooms(null); setActiveProjectId(projectId); setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: project.rooms[0].id }); } else { setActiveRooms(null); setActiveProjectId(projectId); setView("rooms"); navigate({ view: "rooms" }); }}}
            onDiscussionClick={() => { setView("discussion"); navigate({ view: "discussion" }); }}
            onSettingsClick={() => { setView("settings"); navigate({ view: "settings" }); }}
            onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); navigate({ view: "lists" }); } }}
            showPayments={project.paymentsSharedWithClient}
            onPaymentsClick={() => { setView("payments"); navigate({ view: "payments" }); }}
            showHarmonogram={project.scheduleSharedWithClient}
            onHarmonogramClick={() => { setView("schedule"); navigate({ view: "schedule" }); }}
            showAnkiety={project.hasSurveys}
            onAnkietyClick={openAnkiety}
            clientProjectId={projectId}
            activeView={view}
            currentUserId={currentUserId}
          />
          <main className="flex-1 overflow-hidden bg-background rounded-tl-2xl flex flex-col">{content}</main>
        </div>
      </div>
    );
  }

  // Render view — full screen
  if (view === "render" && selectedRender && selectedRoom) {
    // selectedFolder may be null when navigating directly via URL without folderId param.
    // Fall back to the render's own folder reference so breadcrumbs and back navigation work correctly.
    const effectiveFolder = selectedFolder
      ?? (selectedRender.folder
        ? (selectedRoom.folders.find((f) => f.id === selectedRender.folder!.id) ?? selectedRender.folder)
        : null);

    const scopedRenders = effectiveFolder
      ? selectedRoom.renders.filter((r) => r.folder?.id === effectiveFolder.id)
      : selectedRoom.renders.filter((r) => !r.folder);
    const roomRenders = scopedRenders.map((r) => ({ id: r.id, name: r.name, fileUrl: r.fileUrl, fileType: r.fileType }));

    const renderViewer = (
      <RenderViewer
        key={selectedRender.id}
        renderId={selectedRender.id}
        renderName={selectedRender.name}
        projectTitle={project.title}
        roomName={selectedRoom.name}
        folderName={selectedRender.folder?.name ?? undefined}
        imageUrl={selectedRender.fileUrl}
        fileType={selectedRender.fileType}
        initialComments={selectedRender.comments}
        authorName={authorName}
        authorAvatarUrl={clientAvatarUrl}
        isDesigner={false}
        roomRenders={roomRenders}
        initialRenderStatus={selectedRender.status}
        allowDirectStatusChange={project.allowDirectStatusChange}
        allowClientComments={project.allowClientComments}
        allowClientAcceptance={project.allowClientAcceptance}
        hideCommentCount={project.hideCommentCount}
        versions={selectedRender.versions.map((v) => ({ ...v, archivedAt: typeof v.archivedAt === "string" ? v.archivedAt : new Date(v.archivedAt).toISOString() }))}
        allowClientVersionRestore={project.allowClientVersionRestore}
        onRenderStatusChange={(status) => handleRenderStatusChange(selectedRender.id, status)}
        onBack={() => { if (effectiveFolder && !selectedFolder) setSelectedFolder(effectiveFolder); setView("room"); navigate({ view: "room", roomId: selectedRoom.id, folderId: effectiveFolder?.id ?? null }); }}
        onBackToRooms={() => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "rooms" }); }}
        onBackToRoom={effectiveFolder ? () => { setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: selectedRoom.id }); } : undefined}
        onRenderSelect={(r) => {
          const full = selectedRoom.renders.find((render) => render.id === r.id);
          if (full) { setSelectedRender(full); navigate({ view: "render", roomId: selectedRoom.id, folderId: selectedFolder?.id ?? null, renderId: r.id }); }
          fetch(`/api/client/${activeProjectId}/renders/${r.id}/view`, { method: "POST" });
        }}
        onViewCounted={(renderId) => fetch(`/api/client/${activeProjectId}/renders/${renderId}/view`, { method: "POST" })}
        shareToken=""
        clientProjectId={activeProjectId}
      />
    );

    return (
      <div className="h-dvh flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} currentUserId={currentUserId} />
        <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
          <ShareSidebar
            token=""
            discussionId={project.discussionId}
            showProjectFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            shoppingLists={project.shoppingLists}
            onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }}
            onProjectFlowClick={() => { if (clientProjects.length > 1) { setView("projects"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "projects" }); } else if (project.rooms.length === 1) { setActiveRooms(null); setActiveProjectId(projectId); setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: project.rooms[0].id }); } else { setActiveRooms(null); setActiveProjectId(projectId); setView("rooms"); navigate({ view: "rooms" }); }}}
            onDiscussionClick={() => { setView("discussion"); navigate({ view: "discussion" }); }}
            onSettingsClick={() => { setView("settings"); navigate({ view: "settings" }); }}
            onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); navigate({ view: "lists" }); } }}
            showPayments={project.paymentsSharedWithClient}
            onPaymentsClick={() => { setView("payments"); navigate({ view: "payments" }); }}
            showHarmonogram={project.scheduleSharedWithClient}
            onHarmonogramClick={() => { setView("schedule"); navigate({ view: "schedule" }); }}
            showAnkiety={project.hasSurveys}
            onAnkietyClick={openAnkiety}
            clientProjectId={projectId}
            activeView={view}
            currentUserId={currentUserId}
            forceCollapsed={true}
          />
          <div className="flex-1 min-h-0 bg-background">{renderViewer}</div>
        </div>
      </div>
    );
  }

  const pageContent = (
    <>
      {view === "home" && (
        <div className="flex flex-col items-start justify-start w-full">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Witaj{authorName && authorName !== "Klient" ? `, ${authorName}` : ""}!
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {project.clientWelcomeMessage ?? "Wybierz moduł z paska bocznego, aby przeglądać projekt."}
          </p>
          <ModuleGuideSlider
            hiddenModules={project.hiddenModules}
            hasDiscussion={project.hasDiscussion}
          />
        </div>
      )}

      {view === "projects" && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">ProjectFlow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {clientProjects.map((p) => (
              <button key={p.id} className="block text-left w-full" onClick={async () => {
                try {
                  const res = await fetch(`/api/client/${p.id}`);
                  if (!res.ok) throw new Error();
                  const data = await res.json() as Project;
                  setActiveProjectId(p.id);
                  setActiveRooms(data.rooms);
                  setSelectedRoom(null);
                  setSelectedFolder(null);
                  setView("rooms");
                  navigate({ view: "rooms" });
                } catch {
                  toast.error("Nie udało się załadować projektu");
                }
              }}>
                <Card className={`hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] transition-all cursor-pointer h-full relative ${p.id === activeProjectId ? "border-primary/50 ring-1 ring-primary/20 hover:border-primary/50" : "hover:border-primary/30"}`}>
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight line-clamp-2">
                        {p.title}
                      </CardTitle>
                      <Badge variant="secondary" className="shrink-0">{p.renderCount} renderów</Badge>
                    </div>
                    <CardDescription className="line-clamp-1 mt-1 min-h-[1.25rem]">
                      {p.description ?? "\u00A0"}
                    </CardDescription>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(p.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                  </CardHeader>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {view === "rooms" && (
        <>
          {clientProjects.length > 1 && (
            <div className="flex items-center gap-1.5 mb-4 text-sm text-muted-foreground">
              <button onClick={() => { setView("projects"); navigate({ view: "projects" }); }} className="hover:text-foreground transition-colors flex items-center gap-1">
                <ChevronLeft size={15} />
                ProjectFlow
              </button>
              <ChevronRight size={13} className="opacity-40" />
              <span className="text-foreground font-medium truncate">{clientProjects.find((p) => p.id === activeProjectId)?.title ?? "Projekt"}</span>
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Foldery</h2>
          {(activeRooms ?? project.rooms).length === 0 ? (
            <p className="text-gray-400 text-center py-16">Brak pomieszczeń w tym projekcie.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {(activeRooms ?? project.rooms).map((room) => {
                const Icon = getRoomIcon(room.type, room.icon);
                return (
                  <button
                    key={room.id}
                    onClick={() => { setSelectedRoom(room); setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: room.id }); }}
                    className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
                      <Icon size={28} className="text-primary" />
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{room.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{room.renders.length} plików</p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "room" && selectedRoom && (() => {
        const sortedFolders = [...selectedRoom.folders].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
        const ungrouped = selectedRoom.renders.filter((r) => !r.folder);
        const folderRenders = selectedFolder ? selectedRoom.renders.filter((r) => r.folder?.id === selectedFolder.id) : [];
        const goToRooms = () => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "rooms" }); };
        const goToRoom = () => { setSelectedFolder(null); navigate({ view: "room", roomId: selectedRoom.id }); };
        return (
          <>
            <nav className="flex items-center gap-2 mb-6">
              <button onClick={selectedFolder ? goToRoom : goToRooms} className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <ChevronLeft size={20} />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <ol className="flex items-center gap-1 text-sm min-w-0">
                <li><button onClick={goToRooms} className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 truncate max-w-[160px]">{project.title}</button></li>
                <li className="flex items-center gap-1 min-w-0">
                  <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                  {selectedFolder ? (
                    <button onClick={goToRoom} className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 truncate max-w-[160px]">{selectedRoom.name}</button>
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100 truncate">{selectedRoom.name}</span>
                  )}
                </li>
                {selectedFolder && (
                  <li className="flex items-center gap-1 min-w-0">
                    <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                    <span className="text-gray-900 dark:text-gray-100 truncate">{selectedFolder.name}</span>
                  </li>
                )}
              </ol>
            </nav>
            {(() => {
              const activeRenders = selectedFolder ? folderRenders : ungrouped;
              return (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedFolder ? selectedFolder.name : selectedRoom.name}</h2>
                  {activeRenders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectionMode((v) => !v); setSelectedRenderIds(new Set()); }}
                        className={`relative p-1.5 rounded-md transition-colors ${selectionMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                        title="Zaznacz pliki"
                      >
                        <CopyCheck size={15} />
                        {selectionMode && selectedRenderIds.size > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                            {selectedRenderIds.size}
                          </span>
                        )}
                      </button>
                      {selectionMode && selectedRenderIds.size > 0 ? (
                        <button
                          onClick={() => handleDownloadSelected(activeRenders.filter((r) => selectedRenderIds.has(r.id)))}
                          disabled={downloadingAll}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors whitespace-nowrap"
                        >
                          <Download size={14} />
                          {downloadingAll ? "Pobieranie…" : `Pobierz (${selectedRenderIds.size})`}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadAll(activeRenders, selectedFolder?.name ?? selectedRoom?.name ?? "pliki")}
                          disabled={downloadingAll}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          <Download size={14} />
                          {downloadingAll ? "Pobieranie…" : "Pobierz wszystko"}
                        </button>
                      )}
                      {(project.allowDirectStatusChange || project.allowClientAcceptance) && activeRenders.some((r) => r.status !== "ACCEPTED") && (
                        <button
                          onClick={() => handleBatchApprove(activeRenders)}
                          disabled={batchApproving}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 transition-colors whitespace-nowrap"
                        >
                          <Check size={14} />
                          {batchApproving ? "Zatwierdzanie…" : "Zatwierdź wszystkie"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {selectedFolder ? (
              folderRenders.length === 0 ? (
                <p className="text-gray-400 text-center py-16">Brak plików w tym folderze.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {folderRenders.map((render) => (
                    <RenderCard
                      key={render.id}
                      render={render}
                      hideCommentCount={project.hideCommentCount}
                      onClick={() => { setSelectedRender(render); setView("render"); navigate({ view: "render", roomId: selectedRoom.id, folderId: selectedFolder?.id ?? null, renderId: render.id }); fetch(`/api/client/${activeProjectId}/renders/${render.id}/view`, { method: "POST" }); }}
                      onDownload={() => downloadFile(render.fileUrl, render.name)}
                      isSelected={selectedRenderIds.has(render.id)}
                      selectionMode={selectionMode}
                      onToggleSelect={() => setSelectedRenderIds((prev) => { const next = new Set(prev); if (next.has(render.id)) next.delete(render.id); else next.add(render.id); return next; })}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-8">
                {sortedFolders.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {sortedFolders.map((folder) => {
                      const count = selectedRoom.renders.filter((r) => r.folder?.id === folder.id).length;
                      return (
                        <button key={folder.id} onClick={() => { setSelectedFolder(folder); navigate({ view: "room", roomId: selectedRoom.id, folderId: folder.id }); }} className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all">
                          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20">
                            <Folder size={28} className="text-primary" />
                          </div>
                          <p className="font-semibold text-foreground truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{count} plików</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {ungrouped.length > 0 && (
                  <div>
                    {sortedFolders.length > 0 && <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pozostałe pliki</p>}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {ungrouped.map((render) => (
                        <RenderCard
                          key={render.id}
                          render={render}
                          hideCommentCount={project.hideCommentCount}
                          onClick={() => { setSelectedRender(render); setView("render"); navigate({ view: "render", roomId: selectedRoom.id, folderId: null, renderId: render.id }); fetch(`/api/client/${activeProjectId}/renders/${render.id}/view`, { method: "POST" }); }}
                          onDownload={() => downloadFile(render.fileUrl, render.name)}
                          isSelected={selectedRenderIds.has(render.id)}
                          selectionMode={selectionMode}
                          onToggleSelect={() => setSelectedRenderIds((prev) => { const next = new Set(prev); if (next.has(render.id)) next.delete(render.id); else next.add(render.id); return next; })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {view === "lists" && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Listy zakupowe</h2>
          {project.shoppingLists.length === 0 ? (
            <p className="text-gray-400 text-center py-16">Brak list zakupowych w tym projekcie.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              {project.shoppingLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => openList(list.id)}
                  className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <LocalMall size={28} className="text-primary" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{list.name}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === "list" && (
        <div className="flex-1 min-h-0">
          {listLoading || !selectedListData ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground text-sm animate-pulse">
              Ładowanie listy...
            </div>
          ) : (() => {
            const parsePrice = (price: string | null) => {
              if (!price) return null;
              const n = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
              return isNaN(n) ? null : n;
            };
            const getCurrency = (price: string | null) => {
              if (!price) return "";
              const c = price.replace(/[\d.,\s]/g, "").trim().toUpperCase();
              if (!c || c === "PLN" || c === "ZŁ" || c === "ZL") return "zł";
              if (c === "USD" || c === "$") return "DOL";
              return price.replace(/[\d.,\s]/g, "").trim();
            };
            const allProducts = selectedListData.sections.flatMap((s) => s.products);
            const countedProducts = allProducts.filter((p) => !p.optional);
            const grandTotal = countedProducts.reduce((sum, p) => { const n = parsePrice(p.price); return n !== null ? sum + n * p.quantity : sum; }, 0);
            const grandCurrency = getCurrency(countedProducts.find((p) => p.price)?.price ?? null);
            const hasTotal = countedProducts.some((p) => parsePrice(p.price) !== null);
            const unsortedProducts = selectedListData.sections.filter((s) => s.unsorted).flatMap((s) => s.products);
            const regularSections = selectedListData.sections.filter((s) => !s.unsorted).map((s) => ({ id: s.id, name: s.name, order: s.order, products: s.products }));
            const sections = [...regularSections, ...(unsortedProducts.length > 0 ? [{ id: "__unsorted__", name: "Pozostałe", order: 9999, products: unsortedProducts }] : [])];
            return (
              <div>
                <div className="flex items-center gap-3 mb-6 w-full md:max-w-[75%] md:mx-auto">
                  {project.shoppingLists.length > 1 && (
                    <button onClick={() => { setView("lists"); navigate({ view: "lists" }); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedListData.name}</h2>
                </div>
                <ShareListClient
                  listId={selectedListData.id}
                  listShareToken={selectedListData.shareToken}
                  listName={selectedListData.name}
                  projectTitle={project.title}
                  sections={sections}
                  grandTotal={grandTotal}
                  grandCurrency={grandCurrency}
                  hasTotal={hasTotal}
                  hidePrices={selectedListData.hidePrices}
                />
              </div>
            );
          })()}
        </div>
      )}

      {view === "ankiety" && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Ankiety</h2>
          {surveysLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground animate-pulse">Ładowanie...</div>
          ) : surveys.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-2">
              <ClipboardList size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Brak dostępnych ankiet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map((survey) => (
                <div key={survey.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{survey.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(survey.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                    {!survey.completed && survey.answeredCount > 0 && survey.totalQuestions > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{survey.answeredCount} / {survey.totalQuestions} odpowiedzi</span>
                          <span>{Math.round((survey.answeredCount / survey.totalQuestions) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((survey.answeredCount / survey.totalQuestions) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {survey.completed ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <CheckCircle size={14} />
                          Wypełniona
                        </div>
                        <button
                          onClick={() => { setSelectedSurvey({ shareToken: survey.shareToken, name: survey.name, readOnly: true }); setView("survey"); navigate({ view: "ankiety" }); }}
                          className="px-4 py-1.5 text-xs font-medium border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
                        >
                          Podgląd
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setSelectedSurvey({ shareToken: survey.shareToken, name: survey.name }); setView("survey"); navigate({ view: "ankiety" }); }}
                        className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Wypełnij
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "survey" && selectedSurvey && (
        <ClientSurveyView
          token={selectedSurvey.shareToken}
          surveyName={selectedSurvey.name}
          clientEmail={userEmail}
          clientName={(session?.user as any)?.fullName || authorName}
          readOnly={selectedSurvey.readOnly}
          onCompleted={() => {
            setSurveys((prev) => prev.map((s) =>
              s.shareToken === selectedSurvey.shareToken
                ? { ...s, completed: true, answeredCount: s.totalQuestions }
                : s
            ));
          }}
          onBack={() => { setView("ankiety"); setSelectedSurvey(null); navigate({ view: "ankiety" }); fetchSurveys(); }}
        />
      )}

      {view === "settings" && (
        <div className="max-w-3xl space-y-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ustawienia</h1>
            <p className="text-sm text-gray-500 mt-1">Zarządzaj swoim kontem i wyglądem aplikacji.</p>
          </div>

          <section className="space-y-4">
            <SectionHeader title="Konto" />

            {/* Avatar */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle size={16} className="text-gray-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Avatar</h3>
              </div>
              <p className="text-xs text-gray-400">Wyświetlany w nawigacji i przy wiadomościach w czacie.</p>
              <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              <div className="flex items-center gap-4">
                {clientAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clientAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary border border-border">
                    {(settingsFullName || settingsName || authorName || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => avatarFileInputRef.current?.click()} disabled={avatarCropUploading}>
                    <Pencil size={14} className="mr-1.5" />{clientAvatarUrl ? "Zmień avatar" : "Dodaj avatar"}
                  </Button>
                  {clientAvatarUrl && (
                    <Button size="sm" variant="outline" onClick={handleRemoveAvatar}>Usuń avatar</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Imię i nazwisko */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Imię i nazwisko</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Imię i nazwisko</label>
                  <Input value={settingsFullName} onChange={(e) => setSettingsFullName(e.target.value)} placeholder="np. Jan Kowalski" onKeyDown={(e) => e.key === "Enter" && handleFullNameSave()} />
                </div>
                <Button onClick={handleFullNameSave} disabled={fullNameLoading || !settingsFullName.trim()} size="sm">
                  {fullNameLoading ? "Zapisywanie…" : "Zapisz"}
                </Button>
              </div>

              {/* Email */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">Email</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Adres email</label>
                  <Input type="email" value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} placeholder="email@example.com" onKeyDown={(e) => e.key === "Enter" && handleEmailSave()} />
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400 bg-muted rounded-lg px-3 py-2">
                  <Info size={13} className="mt-0.5 flex-shrink-0" />
                  <span>Ten adres email służy do powiadomień. Nie wpływa na dane logowania.</span>
                </div>
                <Button onClick={handleEmailSave} disabled={emailLoading || !settingsEmail.trim()} size="sm">
                  {emailLoading ? "Zapisywanie…" : "Zapisz"}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Zmiana hasła</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Aktualne hasło</label>
                  <div className="relative">
                    <Input type={showCurrentPwd ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pr-9" />
                    <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Nowe hasło</label>
                  <div className="relative">
                    <Input type={showNewPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="min. 8 znaków" className="pr-9" />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Powtórz nowe hasło</label>
                  <div className="relative">
                    <Input type={showConfirmPwd ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pr-9" onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()} />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400">Hasło musi zawierać: min. 8 znaków, małą literę, wielką literę i cyfrę</p>
              <Button onClick={handlePasswordSave} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} size="sm">
                {passwordLoading ? "Zmienianie…" : "Zmień hasło"}
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Powiadomienia email" />
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Powiadomienia email</p>
                  <p className="text-xs text-gray-400 mt-0.5">Otrzymuj email gdy projektant odpowie na Twój komentarz lub zmieni status</p>
                </div>
                <button
                  type="button"
                  disabled={emailNotifLoading}
                  onClick={async () => {
                    const next = !emailNotifEnabled;
                    setEmailNotifEnabled(next);
                    setEmailNotifLoading(true);
                    try {
                      await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailNotifEnabled: next }) });
                    } finally { setEmailNotifLoading(false); }
                  }}
                  className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-50 ${emailNotifEnabled ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}
                  role="switch"
                  aria-checked={emailNotifEnabled}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {emailNotifEnabled && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <p className="text-xs text-gray-400 pt-1">Wybierz moduły:</p>
                  {[
                    { slug: "renderflow", label: "ProjectFlow", desc: "Odpowiedzi projektanta na piny i komentarze" },
                    { slug: "listy", label: "Listy zakupowe", desc: "Odpowiedzi projektanta na komentarze do produktów" },
                  ].map(({ slug, label, desc }) => {
                    const checked = emailNotifModules.includes(slug);
                    return (
                      <label key={slug} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={emailNotifLoading}
                          onChange={async () => {
                            const next = checked
                              ? emailNotifModules.filter((m) => m !== slug)
                              : [...emailNotifModules, slug];
                            setEmailNotifModules(next);
                            setEmailNotifLoading(true);
                            try {
                              await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailNotifModules: next }) });
                            } finally { setEmailNotifLoading(false); }
                          }}
                          className="mt-0.5 w-4 h-4 rounded accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Wygląd" />
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">Motyw</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{theme === "dark" ? "Ciemny" : "Jasny"}</p>
                </div>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${theme === "dark" ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Avatar crop modal */}
          {avatarCropSrc && (
            <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
              <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border flex-shrink-0">
                <h3 className="font-semibold text-sm">Kadrowanie avatara</h3>
                <button onClick={() => setAvatarCropSrc(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="relative flex-1">
                <Cropper
                  image={avatarCropSrc}
                  crop={avatarCrop}
                  zoom={avatarZoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setAvatarCrop}
                  onZoomChange={setAvatarZoom}
                  onCropComplete={handleAvatarCropComplete}
                />
              </div>
              <div className="px-6 py-4 bg-card border-t border-border flex-shrink-0 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10">Zoom</span>
                  <input type="range" min={1} max={3} step={0.01} value={avatarZoom} onChange={(e) => setAvatarZoom(Number(e.target.value))} className="flex-1 accent-primary" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAvatarCropSrc(null)}>Anuluj</Button>
                  <Button onClick={handleAvatarCropApply} disabled={avatarCropUploading}>
                    {avatarCropUploading ? "Przesyłanie..." : "Zastosuj"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="h-dvh flex flex-col bg-muted/60">
      {themeApplier}
      <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} currentUserId={currentUserId} />
      <div className="flex flex-1 min-h-0" style={{ backgroundColor: 'var(--sidebar)' }}>
        <ShareSidebar
          token=""
          discussionId={project.discussionId}
          showProjectFlow={!project.hiddenModules.includes("renderflow")}
          showListy={!project.hiddenModules.includes("listy")}
          showDyskusje={!project.hiddenModules.includes("dyskusje")}
          shoppingLists={project.shoppingLists}
          onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); navigate({}); }}
          onProjectFlowClick={() => { if (clientProjects.length > 1) { setView("projects"); setSelectedRoom(null); setSelectedFolder(null); navigate({ view: "projects" }); } else if (project.rooms.length === 1) { setActiveRooms(null); setActiveProjectId(projectId); setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); navigate({ view: "room", roomId: project.rooms[0].id }); } else { setActiveRooms(null); setActiveProjectId(projectId); setView("rooms"); navigate({ view: "rooms" }); }}}
          onDiscussionClick={() => { setView("discussion"); navigate({ view: "discussion" }); }}
          onSettingsClick={() => { setView("settings"); navigate({ view: "settings" }); }}
          onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); navigate({ view: "lists" }); } }}
          showPayments={project.paymentsSharedWithClient}
          onPaymentsClick={() => { setView("payments"); navigate({ view: "payments" }); }}
          showHarmonogram={project.scheduleSharedWithClient}
          onHarmonogramClick={() => { setView("schedule"); navigate({ view: "schedule" }); }}
          showAnkiety={project.hasSurveys}
          onAnkietyClick={openAnkiety}
          clientProjectId={projectId}
          activeView={view}
          currentUserId={currentUserId}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 bg-background rounded-tl-2xl flex flex-col">
          <div className="flex-1">{pageContent}</div>
          <div className="pt-10 pb-2 flex items-center justify-center gap-1.5 opacity-40 select-none">
            <span className="text-xs text-muted-foreground">Powered by</span>
            <Image src="/veedeck_ikona_vsg.svg" alt="veedeck" width={16} height={16} className="object-contain" />
            <span className="text-xs text-muted-foreground">veedeck</span>
          </div>
        </main>
      </div>
    </div>
  );
}

async function getCroppedImgClient(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas empty")); return; }
      resolve(new File([blob], "avatar.png", { type: "image/png" }));
    }, "image/png");
  });
}

function RenderCard({ render, hideCommentCount, onClick, onDownload, isSelected, selectionMode, onToggleSelect }: {
  render: Render;
  hideCommentCount: boolean;
  onClick: () => void;
  onDownload?: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <div
      onClick={selectionMode ? onToggleSelect : onClick}
      className={`text-left bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] transition-all group cursor-pointer ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
    >
      <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center relative">
        {render.fileType === "pdf" ? (
          <PdfThumbnail fileUrl={render.fileUrl} className="w-full h-full group-hover:scale-105 transition-transform duration-200" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        )}
        {render.fileType === "pdf" && (
          <span className="absolute bottom-2 left-2 z-10 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
        )}
        {selectionMode && (
          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-white/80 bg-black/20"}`}>
            {isSelected && <Check size={11} className="text-white" />}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{render.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
              {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
            </span>
          </div>
        </div>
        {!hideCommentCount && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
            <ChatBubble size={11} />{render.comments.length > 0 ? `${render.comments.length} uwag` : "Brak uwag"}
          </p>
        )}
      </div>
    </div>
  );
}
