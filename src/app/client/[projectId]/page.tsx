"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RenderViewer from "@/components/render/RenderViewer";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientDiscussionView from "@/components/dyskusje/ClientDiscussionView";
import ShareListClient from "@/components/listy/ShareListClient";
import ModuleGuideSlider from "@/components/share/ModuleGuideSlider";
import { getRoomIcon } from "@/lib/roomIcons";
import { ChevronLeft, ChevronRight, ChatBubble, FileText, Folder, User, Mail, Lock, Info, LocalMall, Pencil, X, Eye, EyeOff, UserCircle } from "@/components/ui/icons";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { SectionHeader } from "@/components/settings/SettingsShared";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useUploadThing } from "@/lib/uploadthing-client";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface ListProduct {
  id: string; name: string; url: string | null; imageUrl: string | null;
  price: string | null; manufacturer: string | null; color: string | null;
  dimensions: string | null; description: string | null; deliveryTime: string | null;
  quantity: number; order: number; commentCount: number; approval: string | null; note: string | null;
}
interface ListSection { id: string; name: string; order: number; unsorted: boolean; products: ListProduct[]; }
interface ListData {
  id: string; name: string; shareToken: string; hidePrices: boolean;
  sections: ListSection[];
}

interface Reply { id: string; content: string; author: string; createdAt: string; }
interface Comment { id: string; title?: string | null; content: string; posX: number; posY: number; status: "NEW" | "IN_PROGRESS" | "DONE"; author: string; createdAt: string; replies: Reply[]; }
interface RenderVersion { id: string; fileUrl: string; versionNumber: number; archivedAt: string; }
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
  hasDiscussion: boolean; discussionId: string | null; colorTheme: string;
}

export default function ClientProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"home" | "rooms" | "room" | "render" | "discussion" | "settings" | "lists" | "list">("home");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListData, setSelectedListData] = useState<ListData | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openList = useCallback(async (listId: string) => {
    setListLoading(true);
    setSelectedListId(listId);
    setView("list");
    try {
      const res = await fetch(`/api/client/${projectId}/lists/${listId}`);
      if (!res.ok) throw new Error();
      const data: ListData = await res.json();
      setSelectedListData(data);
    } catch {
      toast.error("Nie udało się załadować listy");
      setView("lists");
    } finally {
      setListLoading(false);
    }
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
  const { startUpload: startAvatarUpload } = useUploadThing("avatarUploader");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "client") { router.push("/dashboard"); return; }

    setSettingsName((session.user as any)?.name ?? "");
    setSettingsFullName((session.user as any)?.fullName ?? "");
    setSettingsEmail(session.user?.email ?? "");
    setClientAvatarUrl((session.user as any)?.avatarUrl ?? null);

    fetch(`/api/client/${projectId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setProject(data); setLoading(false); })
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
    setEmailLoading(true);
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: settingsEmail.trim() }) });
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
    setSelectedRender((prev) => prev?.id === renderId ? { ...prev, status } : prev);
  }

  const handleRenderStatusChange = useCallback(async (renderId: string, status: RenderStatus) => {
    await fetch(`/api/client/${projectId}/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    updateRenderInState(renderId, status);
  }, [projectId]);

  if (loading || status === "loading") {
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

  const themeApplier = <ClientThemeApplier colorTheme={project.colorTheme} />;

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
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token=""
            discussionId={project.discussionId}
            showRenderFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            shoppingLists={project.shoppingLists}
            onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }}
            onRenderFlowClick={() => { if (project.rooms.length === 1) { setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); } else { setView("rooms"); } }}
            onDiscussionClick={() => setView("discussion")}
            onSettingsClick={() => setView("settings")}
            onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); } }}
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
    const scopedRenders = selectedFolder
      ? selectedRoom.renders.filter((r) => r.folder?.id === selectedFolder.id)
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
        onBack={() => setView("room")}
        onRenderSelect={(r) => {
          const full = selectedRoom.renders.find((render) => render.id === r.id);
          if (full) setSelectedRender(full);
        }}
        shareToken=""
      />
    );

    return (
      <div className="h-dvh flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} />
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token=""
            discussionId={project.discussionId}
            showRenderFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            shoppingLists={project.shoppingLists}
            onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }}
            onRenderFlowClick={() => { if (project.rooms.length === 1) { setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); } else { setView("rooms"); } }}
            onDiscussionClick={() => setView("discussion")}
            onSettingsClick={() => setView("settings")}
            onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); } }}
            clientProjectId={projectId}
            activeView={view}
            currentUserId={currentUserId}
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

      {view === "rooms" && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Pomieszczenia</h2>
          {project.rooms.length === 0 ? (
            <p className="text-gray-400 text-center py-16">Brak pomieszczeń w tym projekcie.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {project.rooms.map((room) => {
                const Icon = getRoomIcon(room.type, room.icon);
                return (
                  <button
                    key={room.id}
                    onClick={() => { setSelectedRoom(room); setSelectedFolder(null); setView("room"); }}
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
        const goToRooms = () => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); };
        const goToRoom = () => setSelectedFolder(null);
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{selectedFolder ? selectedFolder.name : selectedRoom.name}</h2>
            {selectedFolder ? (
              folderRenders.length === 0 ? (
                <p className="text-gray-400 text-center py-16">Brak plików w tym folderze.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {folderRenders.map((render) => (
                    <RenderCard key={render.id} render={render} hideCommentCount={project.hideCommentCount} onClick={() => { setSelectedRender(render); setView("render"); fetch(`/api/client/${projectId}/renders/${render.id}/view`, { method: "POST" }); }} />
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
                        <button key={folder.id} onClick={() => setSelectedFolder(folder)} className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all">
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
                        <RenderCard key={render.id} render={render} hideCommentCount={project.hideCommentCount} onClick={() => { setSelectedRender(render); setView("render"); fetch(`/api/client/${projectId}/renders/${render.id}/view`, { method: "POST" }); }} />
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
            const grandTotal = allProducts.reduce((sum, p) => { const n = parsePrice(p.price); return n !== null ? sum + n * p.quantity : sum; }, 0);
            const grandCurrency = getCurrency(allProducts.find((p) => p.price)?.price ?? null);
            const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);
            const unsortedProducts = selectedListData.sections.filter((s) => s.unsorted).flatMap((s) => s.products);
            const regularSections = selectedListData.sections.filter((s) => !s.unsorted).map((s) => ({ id: s.id, name: s.name, order: s.order, products: s.products }));
            const sections = [...regularSections, ...(unsortedProducts.length > 0 ? [{ id: "__unsorted__", name: "Pozostałe", order: 9999, products: unsortedProducts }] : [])];
            return (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  {project.shoppingLists.length > 1 && (
                    <button onClick={() => setView("lists")} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
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
                  <span>Zmiana emaila wpłynie na dane logowania.</span>
                </div>
                <Button onClick={handleEmailSave} disabled={emailLoading || !settingsEmail.trim() || settingsEmail.trim() === userEmail} size="sm">
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
      <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} onLogoClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }} onMobileMenuOpen={() => setMobileSidebarOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <ShareSidebar
          token=""
          discussionId={project.discussionId}
          showRenderFlow={!project.hiddenModules.includes("renderflow")}
          showListy={!project.hiddenModules.includes("listy")}
          showDyskusje={!project.hiddenModules.includes("dyskusje")}
          shoppingLists={project.shoppingLists}
          onHomeClick={() => { setView("home"); setSelectedRoom(null); setSelectedFolder(null); }}
          onRenderFlowClick={() => { if (project.rooms.length === 1) { setSelectedRoom(project.rooms[0]); setSelectedFolder(null); setView("room"); } else { setView("rooms"); } }}
          onDiscussionClick={() => setView("discussion")}
          onSettingsClick={() => setView("settings")}
          onListClick={() => { if (project.shoppingLists.length === 1) { openList(project.shoppingLists[0].id); } else { setView("lists"); } }}
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
            <Image src="/veedeck_ikona.png" alt="veedeck" width={16} height={16} className="object-contain" />
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

function RenderCard({ render, hideCommentCount, onClick }: { render: Render; hideCommentCount: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all group">
      <div className="aspect-video bg-muted overflow-hidden flex items-center justify-center">
        {render.fileType === "pdf" ? (
          <FileText size={36} className="text-red-400" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{render.name}</p>
          <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
            {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
          </span>
        </div>
        {!hideCommentCount && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
            <ChatBubble size={11} />{render.comments.length > 0 ? `${render.comments.length} uwag` : "Brak uwag"}
          </p>
        )}
      </div>
    </button>
  );
}
