"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import RenderViewer from "@/components/render/RenderViewer";
import ShareSidebar from "@/components/share/ShareSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getRoomIcon } from "@/lib/roomIcons";
import { ChevronLeft, ChevronRight, MessageSquare, UserRound, Sun, Moon, Monitor, Lock, Settings, Folder, Grid2x2, FolderPlus } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

type RenderStatus = "REVIEW" | "ACCEPTED";

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string;
  title?: string | null;
  content: string;
  posX: number;
  posY: number;
  status: "NEW" | "IN_PROGRESS" | "DONE";
  author: string;
  createdAt: string;
  replies: Reply[];
}

interface RenderVersion {
  id: string;
  fileUrl: string;
  versionNumber: number;
  archivedAt: string;
}

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  status: RenderStatus;
  comments: Comment[];
  versions: RenderVersion[];
  folder?: { id: string; name: string } | null;
}

interface ShareFolder {
  id: string;
  name: string;
  pinned: boolean;
}

interface Room {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  folders: ShareFolder[];
  renders: Render[];
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  rooms: Room[];
  allowDirectStatusChange: boolean;
  allowClientComments: boolean;
  allowClientAcceptance: boolean;
  requireClientEmail: boolean;
  hideCommentCount: boolean;
  allowClientVersionRestore: boolean;
  showProjectTitle: boolean;
  clientWelcomeMessage: string | null;
  clientLogoUrl: string | null;
  accentColor: string | null;
  designerName: string | null;
  hasPassword: boolean;
  shareExpiresAt: string | null;
  navMode: string;
  hiddenModules: string[];
  clientCanUpload: boolean;
  shoppingLists: { id: string; name: string; shareToken: string }[];
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [moduleHidden, setModuleHidden] = useState(false);

  // Password gate
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);

  // Client identity
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [view, setView] = useState<"rooms" | "room" | "render" | "settings">("rooms");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [pendingRestoreRequests, setPendingRestoreRequests] = useState<Set<string>>(new Set());

  // Client upload
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);

  function buildHeaders(): HeadersInit {
    const h: Record<string, string> = {};
    if (unlockedPassword) h["x-share-password"] = unlockedPassword;
    return h;
  }

  async function fetchProject(password?: string) {
    const headers: Record<string, string> = {};
    if (password) headers["x-share-password"] = password;

    const r = await fetch(`/api/share/${token}`, { headers });

    if (r.status === 410) { setExpired(true); return null; }
    if (r.status === 403) {
      const data = await r.json();
      if (data.moduleHidden) { setModuleHidden(true); return null; }
      setNotFound(true);
      return null;
    }
    if (r.status === 401) {
      const data = await r.json();
      if (data.passwordRequired) { setPasswordRequired(true); return null; }
      setNotFound(true);
      return null;
    }
    if (!r.ok) { setNotFound(true); return null; }
    return r.json() as Promise<Project>;
  }

  useEffect(() => {
    const saved = localStorage.getItem(`veedeck-author-${token}`);
    const savedEmail = localStorage.getItem(`veedeck-author-email-${token}`);
    if (saved) { setAuthorName(saved); setNameSet(true); }
    if (savedEmail) setAuthorEmail(savedEmail);

    fetchProject().then((data) => {
      if (data) setProject(data);
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Apply accent color when project loads
  useEffect(() => {
    if (project?.accentColor) {
      document.documentElement.style.setProperty("--share-accent", project.accentColor);
    }
    return () => {
      document.documentElement.style.removeProperty("--share-accent");
    };
  }, [project?.accentColor]);

  // Subscribe to share channel after project loads
  useEffect(() => {
    if (!project) return;

    const channel = pusherClient.subscribe(`share-${token}`);
    channel.unbind_all();

    channel.bind("status-request-resolved", (data: {
      requestId: string;
      renderId: string;
      result: string;
      message: string;
      newRenderStatus: RenderStatus;
    }) => {
      toast(data.message, { duration: 8000 });
      setPendingRequests((prev) => { const next = new Set(prev); next.delete(data.renderId); return next; });
      updateRenderInState(data.renderId, data.newRenderStatus);
    });

    channel.bind("render-status-changed", (data: { renderId: string; status: RenderStatus }) => {
      updateRenderInState(data.renderId, data.status);
      toast(data.status === "ACCEPTED" ? "Render został zaakceptowany" : "Status renderu zmieniony na: Do weryfikacji", { duration: 5000 });
    });

    channel.bind("new-reply", (data: { commentId: string; renderId: string; reply: Reply }) => {
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((room) => ({
            ...room,
            renders: room.renders.map((r) => {
              if (r.id !== data.renderId) return r;
              return {
                ...r,
                comments: r.comments.map((c) => {
                  if (c.id !== data.commentId) return c;
                  if (c.replies.some((rep) => rep.id === data.reply.id)) return c;
                  return { ...c, replies: [...c.replies, data.reply] };
                }),
              };
            }),
          })),
        };
      });
      if (data.reply.author !== authorName) {
        toast(`Nowa odpowiedź od ${data.reply.author}`, { duration: 5000 });
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`share-${token}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, token]);

  function updateRenderInState(renderId: string, status: RenderStatus) {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((room) => ({
          ...room,
          renders: room.renders.map((r) => r.id === renderId ? { ...r, status } : r),
        })),
      };
    });
    setSelectedRender((prev) => prev?.id === renderId ? { ...prev, status } : prev);
  }

  async function handlePasswordSubmit() {
    if (!passwordInput.trim()) return;
    setPasswordLoading(true);
    setPasswordError(false);
    const data = await fetchProject(passwordInput.trim());
    if (data) {
      setUnlockedPassword(passwordInput.trim());
      setProject(data);
      setPasswordRequired(false);
    } else if (!expired && !notFound) {
      setPasswordError(true);
    }
    setPasswordLoading(false);
  }

  function handleSetName() {
    if (!nameInput.trim()) return;
    if (project?.requireClientEmail && !emailInput.trim()) return;
    localStorage.setItem(`veedeck-author-${token}`, nameInput.trim());
    if (emailInput.trim()) localStorage.setItem(`veedeck-author-email-${token}`, emailInput.trim());
    setAuthorName(nameInput.trim());
    setAuthorEmail(emailInput.trim());
    setNameSet(true);
  }

  async function handleStatusRequest(renderId: string) {
    if (pendingRequests.has(renderId)) return;
    const res = await fetch(`/api/share/${token}/renders/${renderId}/status-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildHeaders() },
      body: JSON.stringify({ clientName: authorName }),
    });
    if (res.ok) {
      setPendingRequests((prev) => new Set([...prev, renderId]));
      toast.success("Prośba o zmianę statusu wysłana do projektanta.");
    } else {
      toast.error("Błąd podczas wysyłania prośby.");
    }
  }

  async function handleVersionRestore(renderId: string, versionId: string) {
    const res = await fetch(`/api/share/${token}/renders/${renderId}/restore-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildHeaders() },
      body: JSON.stringify({ versionId }),
    });
    if (!res.ok) throw new Error("Błąd przywracania wersji");

    const updated = await fetchProject(unlockedPassword ?? undefined);
    if (updated) {
      setProject(updated);
      const updatedRender = updated.rooms.flatMap((r) => r.renders).find((r) => r.id === renderId);
      if (updatedRender) setSelectedRender(updatedRender);
    }
  }

  async function handleVersionRestoreRequest(renderId: string, versionId: string) {
    if (pendingRestoreRequests.has(`${renderId}-${versionId}`)) return;
    const res = await fetch(`/api/share/${token}/renders/${renderId}/version-restore-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildHeaders() },
      body: JSON.stringify({ clientName: authorName, versionId }),
    });
    if (res.ok) {
      setPendingRestoreRequests((prev) => new Set([...prev, `${renderId}-${versionId}`]));
    } else {
      throw new Error("Błąd wysyłania prośby");
    }
  }

  async function handleRenderStatusChange(renderId: string, status: RenderStatus) {
    await fetch(`/api/share/${token}/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...buildHeaders() },
      body: JSON.stringify({ status }),
    });
    updateRenderInState(renderId, status);
  }

  async function handleAddFolder() {
    if (!newFolderName.trim() || !selectedRoom) return;
    setAddingFolder(true);
    try {
      const res = await fetch(`/api/share/${token}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
        body: JSON.stringify({ name: newFolderName.trim(), roomId: selectedRoom.id }),
      });
      if (!res.ok) throw new Error();
      const folder = await res.json();
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === selectedRoom.id
              ? { ...r, folders: [...r.folders, { id: folder.id, name: folder.name, pinned: false }] }
              : r
          ),
        };
      });
      setSelectedRoom((prev) =>
        prev ? { ...prev, folders: [...prev.folders, { id: folder.id, name: folder.name, pinned: false }] } : prev
      );
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder dodany");
    } catch {
      toast.error("Błąd dodawania folderu");
    } finally {
      setAddingFolder(false);
    }
  }

  function addRenderToState(render: { id: string; name: string; fileUrl: string; status: RenderStatus; roomId?: string | null; folderId?: string | null }) {
    const newRender: Render = {
      id: render.id,
      name: render.name,
      fileUrl: render.fileUrl,
      status: render.status,
      comments: [],
      versions: [],
      folder: null,
    };
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === render.roomId
            ? { ...r, renders: [...r.renders, newRender] }
            : r
        ),
      };
    });
    if (selectedRoom?.id === render.roomId) {
      setSelectedRoom((prev) =>
        prev ? { ...prev, renders: [...prev.renders, newRender] } : prev
      );
    }
  }

  const accent = project?.accentColor ?? "#2563eb";
  const { theme, setTheme } = useTheme();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <p className="text-gray-400 animate-pulse">Ładowanie...</p>
    </div>
  );

  if (expired) return (
    <div className="flex items-center justify-center min-h-screen text-center bg-background">
      <div>
        <p className="text-4xl mb-4">⏰</p>
        <p className="text-gray-700 dark:text-gray-200 font-semibold">Link wygasł</p>
        <p className="text-gray-400 text-sm mt-1">Ten link do podglądu projektu nie jest już aktywny.</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="flex items-center justify-center min-h-screen text-center bg-background">
      <div>
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-500">Projekt nie został znaleziony</p>
      </div>
    </div>
  );

  if (moduleHidden) return (
    <div className="flex items-center justify-center min-h-screen text-center bg-background px-4">
      <div>
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-gray-700 dark:text-gray-200 font-semibold">Brak dostępu</p>
        <p className="text-gray-400 text-sm mt-1">Skonsultuj się z administratorem projektu.</p>
      </div>
    </div>
  );

  if (passwordRequired) return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image src="/logo.svg" alt="RenderFlow" width={32} height={32} className="block dark:hidden" />
          <Image src="/logo-dark.svg" alt="RenderFlow" width={32} height={32} className="hidden dark:block" />
          <h1 className="text-2xl font-bold">Render<span className="text-[#C45824] dark:text-white">Flow</span></h1>
        </div>
        <div className="flex justify-center mb-4">
          <Lock size={20} className="text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Ten projekt jest chroniony hasłem</p>
        <div className="flex gap-2">
          <Input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Hasło dostępu"
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            autoFocus
            className={passwordError ? "border-red-400" : ""}
          />
          <Button onClick={handlePasswordSubmit} disabled={passwordLoading || !passwordInput.trim()}>
            {passwordLoading ? "..." : "Dalej"}
          </Button>
        </div>
        {passwordError && <p className="text-sm text-red-500 mt-2">Nieprawidłowe hasło</p>}
      </div>
    </div>
  );

  if (!nameSet) return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {project?.clientLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.clientLogoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <>
              <Image src="/logo.svg" alt="RenderFlow" width={32} height={32} className="block dark:hidden" />
              <Image src="/logo-dark.svg" alt="RenderFlow" width={32} height={32} className="hidden dark:block" />
            </>
          )}
          {project?.designerName && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.designerName}</h1>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Podaj swoje imię aby przeglądać projekt</p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Twoje imię"
              onKeyDown={(e) => e.key === "Enter" && !project?.requireClientEmail && handleSetName()}
              autoFocus
            />
          </div>
          {project?.requireClientEmail && (
            <Input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Twój email"
              onKeyDown={(e) => e.key === "Enter" && handleSetName()}
            />
          )}
          <Button
            onClick={handleSetName}
            disabled={!nameInput.trim() || (!!project?.requireClientEmail && !emailInput.trim())}
            className="w-full"
          >
            Dalej
          </Button>
        </div>
      </div>
    </div>
  );

  if (!project) return null;

  const isSidebar = project.navMode === "sidebar";

  // Render view — full screen
  if (view === "render" && selectedRender && selectedRoom) {
    // Scope navigation to current folder if one is selected, otherwise to renders without folder
    const scopedRenders = selectedFolder
      ? selectedRoom.renders.filter((r) => r.folder?.id === selectedFolder.id)
      : selectedRoom.renders.filter((r) => !r.folder);
    const roomRenders = scopedRenders.map((r) => ({
      id: r.id,
      name: r.name,
      fileUrl: r.fileUrl,
    }));

    const renderViewer = (
      <RenderViewer
        key={selectedRender.id}
        renderId={selectedRender.id}
        renderName={selectedRender.name}
        projectTitle={project.title}
        roomName={selectedRoom.name}
        folderName={selectedRender.folder?.name ?? undefined}
        imageUrl={selectedRender.fileUrl}
        initialComments={selectedRender.comments}
        authorName={authorName}
        isDesigner={false}
        roomRenders={roomRenders}
        initialRenderStatus={selectedRender.status}
        allowDirectStatusChange={project.allowDirectStatusChange}
        allowClientComments={project.allowClientComments}
        allowClientAcceptance={project.allowClientAcceptance}
        hideCommentCount={project.hideCommentCount}
        versions={selectedRender.versions.map((v) => ({ ...v, archivedAt: typeof v.archivedAt === "string" ? v.archivedAt : new Date(v.archivedAt).toISOString() }))}
        allowClientVersionRestore={project.allowClientVersionRestore}
        onVersionRestore={
          project.allowClientVersionRestore
            ? (versionId) => handleVersionRestore(selectedRender.id, versionId)
            : undefined
        }
        onVersionRestoreRequest={
          !project.allowClientVersionRestore
            ? (versionId) => handleVersionRestoreRequest(selectedRender.id, versionId)
            : undefined
        }
        onRenderStatusChange={(status) => handleRenderStatusChange(selectedRender.id, status)}
        onStatusRequest={
          project.allowDirectStatusChange || pendingRequests.has(selectedRender.id)
            ? undefined
            : () => handleStatusRequest(selectedRender.id)
        }
        onBack={() => setView("room")}
        onRenderSelect={(r) => {
          const full = selectedRoom.renders.find((render) => render.id === r.id);
          if (full) setSelectedRender(full);
        }}
        shareToken={token}
      />
    );

    const renderNav = (
      <nav className="bg-card border-b flex-shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 gap-4">
          <div className="flex items-center gap-3">
            {!isSidebar && (
              <Link
                href={`/share/${token}/home`}
                title="Strona główna projektu"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
              >
                <Grid2x2 size={18} />
              </Link>
            )}
            {project.clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.clientLogoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <>
                <Image src="/logo.svg" alt="RenderFlow" width={26} height={26} className="block dark:hidden" />
                <Image src="/logo-dark.svg" alt="RenderFlow" width={26} height={26} className="hidden dark:block" />
              </>
            )}
            {project.designerName ? (
              <span className="font-bold text-gray-900 dark:text-gray-100">{project.designerName}</span>
            ) : !project.clientLogoUrl && (
              <span className="font-bold text-lg">Render<span style={{ color: accent }}>Flow</span></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
              className={`relative flex items-center w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${
                theme === "dark" ? "bg-slate-700" : "bg-gray-200"
              }`}
            >
              <Sun size={12} className={`absolute left-1.5 transition-opacity duration-200 ${theme === "dark" ? "opacity-30 text-gray-400" : "opacity-100 text-yellow-500"}`} />
              <Moon size={12} className={`absolute right-1.5 transition-opacity duration-200 ${theme === "dark" ? "opacity-100 text-blue-300" : "opacity-30 text-gray-400"}`} />
              <span className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                theme === "dark" ? "translate-x-7" : "translate-x-1"
              }`} />
            </button>
            <button
              onClick={() => setView("settings")}
              title="Ustawienia"
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">{authorName}</span>
            </button>
          </div>
        </div>
      </nav>
    );

    if (isSidebar) {
      return (
        <div className="h-screen flex flex-col bg-background">
          {renderNav}
          <div className="flex flex-1 min-h-0">
            <ShareSidebar
              token={token}
              showRenderFlow={!project.hiddenModules.includes("renderflow")}
              showListy={!project.hiddenModules.includes("listy")}
              shoppingLists={project.shoppingLists}
              onRenderFlowClick={() => setView("rooms")}
            />
            <div className="flex-1 min-h-0">
              {renderViewer}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-20 bg-background flex flex-col">
        {renderNav}
        <div className="flex-1 min-h-0">
          {renderViewer}
        </div>
      </div>
    );
  }

  const pageContent = (
    <>
      {/* Settings view */}
      {view === "settings" && (
        <ClientSettingsView
          authorName={authorName}
          onSave={(newName) => { localStorage.setItem(`veedeck-author-${token}`, newName); setAuthorName(newName); }}
          onBack={() => setView("rooms")}
        />
      )}

      {/* Rooms view */}
      {view === "rooms" && (
        <>
          {project.clientWelcomeMessage && (
            <div className="mb-6 p-4 bg-muted rounded-xl text-sm text-gray-600 dark:text-gray-400">
              {project.clientWelcomeMessage}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Pomieszczenia</h2>
          {project.rooms.length === 0 ? (
            <p className="text-gray-400 text-center py-16">Brak pomieszczeń w tym projekcie.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
              {project.rooms.map((room) => {
                const Icon = getRoomIcon(room.type, room.icon);
                const renderCount = room.renders.length;
                return (
                  <button key={room.id} onClick={() => { setSelectedRoom(room); setSelectedFolder(null); setView("room"); }} className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#C45824]/30 transition-all">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
                      <Icon size={28} className="text-[#C45824]" />
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{room.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{renderCount} render{renderCount === 1 ? "" : renderCount < 5 ? "y" : "ów"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Room renders view */}
      {view === "room" && selectedRoom && (() => {
        const sortedFolders = [...selectedRoom.folders].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
        const ungrouped = selectedRoom.renders.filter((r) => !r.folder);
        const folderRenders = selectedFolder ? selectedRoom.renders.filter((r) => r.folder?.id === selectedFolder.id) : [];
        const hasContent = selectedRoom.folders.length > 0 || selectedRoom.renders.length > 0;
        const goToRooms = () => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); };
        const goToRoom = () => setSelectedFolder(null);
        return (
          <>
            <nav className="flex items-center gap-2 mb-6">
              <button onClick={selectedFolder ? goToRoom : goToRooms} className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <ol className="flex items-center gap-1 text-sm min-w-0">
                <li className="flex items-center gap-1 min-w-0">
                  <button onClick={goToRooms} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[160px]">{project.title}</button>
                </li>
                <li className="flex items-center gap-1 min-w-0">
                  <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
                  {selectedFolder ? (
                    <button onClick={goToRoom} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[160px]">{selectedRoom.name}</button>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedFolder ? selectedFolder.name : selectedRoom.name}</h2>
              {project.clientCanUpload && (
                <div className="flex items-center gap-2">
                  {!selectedFolder && (
                    <div className="flex items-center gap-2">
                      {showNewFolder ? (
                        <>
                          <Input
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Nazwa folderu"
                            className="h-8 text-sm w-40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddFolder();
                              if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                            }}
                          />
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
                            Anuluj
                          </Button>
                          <Button size="sm" className="h-8" disabled={!newFolderName.trim() || addingFolder} onClick={handleAddFolder}>
                            Dodaj
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShowNewFolder(true)}>
                          <FolderPlus size={14} />
                          Nowy folder
                        </Button>
                      )}
                    </div>
                  )}
                  <UploadButton<OurFileRouter, "clientRenderUploader">
                    endpoint="clientRenderUploader"
                    headers={{ "x-share-token": token }}
                    content={{ button: "+ Dodaj pliki", allowedContent: "" }}
                    onClientUploadComplete={async (res) => {
                      for (const file of res) {
                        const name = file.name.replace(/\.[^.]+$/, "");
                        const r = await fetch(`/api/share/${token}/renders`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...buildHeaders() },
                          body: JSON.stringify({
                            name,
                            fileUrl: file.url,
                            fileKey: file.key,
                            roomId: selectedRoom.id,
                            folderId: selectedFolder?.id ?? null,
                          }),
                        });
                        if (r.ok) {
                          const render = await r.json();
                          addRenderToState({ ...render, roomId: selectedRoom.id });
                        }
                      }
                      toast.success(`Dodano ${res.length} plik${res.length === 1 ? "" : res.length < 5 ? "i" : "ów"}`);
                    }}
                    onUploadError={(err) => toast.error(`Błąd uploadu: ${err.message}`)}
                    appearance={{
                      button: "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 rounded-md text-sm font-medium px-3 h-8 ut-uploading:opacity-70",
                      allowedContent: "hidden",
                      container: "flex-shrink-0",
                    }}
                  />
                </div>
              )}
            </div>
            {!hasContent ? (
              <p className="text-gray-400 text-center py-16">Brak plików w tym pomieszczeniu.</p>
            ) : selectedFolder ? (
              folderRenders.length === 0 ? (
                <p className="text-gray-400 text-center py-16">Brak plików w tym folderze.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {folderRenders.map((render) => (
                    <button key={render.id} onClick={() => { setSelectedRender(render); setView("render"); fetch(`/api/share/${token}/renders/${render.id}/view`, { method: "POST" }); }} className="text-left bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#C45824]/30 transition-all group">
                      <div className="aspect-video bg-muted overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{render.name}</p>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}</span>
                        </div>
                        {!project.hideCommentCount && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1"><MessageSquare size={11} />{render.comments.length > 0 ? `${render.comments.length} uwag` : "Brak uwag"}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-8">
                {sortedFolders.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {sortedFolders.map((folder) => {
                      const count = selectedRoom.renders.filter((r) => r.folder?.id === folder.id).length;
                      return (
                        <button key={folder.id} onClick={() => setSelectedFolder(folder)} className="group relative text-left bg-white dark:bg-card border border-gray-100 dark:border-border rounded-2xl p-5 shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#C45824]/30 transition-all">
                          <div className="w-14 h-14 bg-gray-100 dark:bg-muted rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-muted/80 transition-colors">
                            <Folder size={28} className="text-[#C45824] dark:text-foreground" />
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-foreground truncate">{folder.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{count} plik{count === 1 ? "" : count < 5 ? "i" : "ów"}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                {ungrouped.length > 0 && (
                  <div>
                    {sortedFolders.length > 0 && <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pozostałe pliki</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                      {ungrouped.map((render) => (
                        <button key={render.id} onClick={() => { setSelectedRender(render); setView("render"); fetch(`/api/share/${token}/renders/${render.id}/view`, { method: "POST" }); }} className="text-left bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-[#C45824]/30 transition-all group">
                          <div className="aspect-video bg-muted overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={render.fileUrl} alt={render.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          </div>
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{render.name}</p>
                              <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${render.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}</span>
                            </div>
                            {!project.hideCommentCount && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1"><MessageSquare size={11} />{render.comments.length > 0 ? `${render.comments.length} uwag` : "Brak uwag"}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </>
  );

  return (
    <div className={`${isSidebar ? "h-screen" : "min-h-screen"} flex flex-col bg-background`}>
      {/* Nav */}
      <nav className="bg-card border-b flex-shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 gap-4">
          <div className="flex items-center gap-3">
            {!isSidebar && (
              <Link href={`/share/${token}/home`} title="Strona główna projektu" className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
                <Grid2x2 size={18} />
              </Link>
            )}
            {project.clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.clientLogoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <>
                <Image src="/logo.svg" alt="RenderFlow" width={26} height={26} className="block dark:hidden" />
                <Image src="/logo-dark.svg" alt="RenderFlow" width={26} height={26} className="hidden dark:block" />
              </>
            )}
            {project.designerName ? (
              <span className="font-bold text-gray-900 dark:text-gray-100">{project.designerName}</span>
            ) : !project.clientLogoUrl && (
              <span className="font-bold text-lg">Render<span style={{ color: accent }}>Flow</span></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Tryb jasny" : "Tryb ciemny"} className={`relative flex items-center w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${theme === "dark" ? "bg-slate-700" : "bg-gray-200"}`}>
              <Sun size={12} className={`absolute left-1.5 transition-opacity duration-200 ${theme === "dark" ? "opacity-30 text-gray-400" : "opacity-100 text-yellow-500"}`} />
              <Moon size={12} className={`absolute right-1.5 transition-opacity duration-200 ${theme === "dark" ? "opacity-100 text-blue-300" : "opacity-30 text-gray-400"}`} />
              <span className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${theme === "dark" ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <button onClick={() => setView("settings")} title="Ustawienia" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <Settings size={15} />
              <span className="hidden sm:inline">{authorName}</span>
            </button>
          </div>
        </div>
      </nav>

      {isSidebar ? (
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token={token}
            showRenderFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            shoppingLists={project.shoppingLists}
            onRenderFlowClick={() => setView("rooms")}
          />
          <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
            {pageContent}
          </main>
        </div>
      ) : (
        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
          {pageContent}
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: React.ElementType }[] = [
  { value: "light",  label: "Jasny",     Icon: Sun },
  { value: "dark",   label: "Ciemny",    Icon: Moon },
  { value: "system", label: "Systemowy", Icon: Monitor },
];

function ClientSettingsView({
  authorName,
  onSave,
  onBack,
}: {
  authorName: string;
  onSave: (name: string) => void;
  onBack: () => void;
}) {
  const [nameInput, setNameInput] = useState(authorName);
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ChevronLeft size={15} /> Wróć
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ustawienia</h2>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserRound size={18} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Twoja tożsamość</h3>
        </div>
        <p className="text-xs text-gray-400">Imię widoczne przy Twoich komentarzach i prośbach do projektanta.</p>
        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Nazwa</label>
          <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Twoje imię" onKeyDown={(e) => e.key === "Enter" && onSave(nameInput.trim())} autoFocus />
        </div>
        <Button onClick={() => { if (nameInput.trim()) onSave(nameInput.trim()); }} disabled={!nameInput.trim() || nameInput.trim() === authorName} size="sm">
          Zapisz
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h3>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                theme === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
