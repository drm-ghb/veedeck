"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RenderViewer from "@/components/render/RenderViewer";
import ClientThemeApplier from "@/components/share/ClientThemeApplier";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareSidebar from "@/components/share/ShareSidebar";
import ClientDiscussionView from "@/components/dyskusje/ClientDiscussionView";
import { getRoomIcon } from "@/lib/roomIcons";
import { ChevronLeft, ChevronRight, MessageSquare, FileText, Folder } from "lucide-react";
import { toast } from "sonner";

type RenderStatus = "REVIEW" | "ACCEPTED";

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
  const [view, setView] = useState<"rooms" | "room" | "render" | "discussion">("rooms");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);

  const authorName = (session?.user as any)?.name || session?.user?.name || "Klient";
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    if ((session?.user as any)?.role !== "client") { router.push("/dashboard"); return; }

    fetch(`/api/client/${projectId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setProject(data); setLoading(false); })
      .catch(() => { toast.error("Nie udało się załadować projektu"); setLoading(false); });
  }, [projectId, status, session, router]);

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

  const isSidebar = project.navMode === "sidebar";
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
      />
    );

    if (isSidebar) {
      return (
        <div className="h-dvh flex flex-col bg-muted/60">
          {themeApplier}
          <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} />
          <div className="flex flex-1 min-h-0">
            <ShareSidebar
              token=""
              discussionId={project.discussionId}
              showRenderFlow={!project.hiddenModules.includes("renderflow")}
              showListy={!project.hiddenModules.includes("listy")}
              showDyskusje={!project.hiddenModules.includes("dyskusje")}
              shoppingLists={project.shoppingLists}
              onHomeClick={() => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); }}
              onRenderFlowClick={() => setView("rooms")}
              onDiscussionClick={() => setView("discussion")}
              clientProjectId={projectId}
              activeView={view}
              currentUserId={currentUserId}
            />
            <main className="flex-1 overflow-hidden bg-background rounded-tl-2xl flex flex-col">{content}</main>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-muted/60">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} />
        <main className="flex-1 overflow-hidden flex flex-col px-3 sm:px-6 py-4 sm:py-6">{content}</main>
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

    if (isSidebar) {
      return (
        <div className="h-dvh flex flex-col bg-muted/60">
          {themeApplier}
          <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} />
          <div className="flex flex-1 min-h-0">
            <ShareSidebar
              token=""
              discussionId={project.discussionId}
              showRenderFlow={!project.hiddenModules.includes("renderflow")}
              showListy={!project.hiddenModules.includes("listy")}
              showDyskusje={!project.hiddenModules.includes("dyskusje")}
              shoppingLists={project.shoppingLists}
              onHomeClick={() => { setView("rooms"); setSelectedRoom(null); setSelectedFolder(null); }}
              onRenderFlowClick={() => setView("rooms")}
              onDiscussionClick={() => setView("discussion")}
              clientProjectId={projectId}
              activeView={view}
              currentUserId={currentUserId}
            />
            <div className="flex-1 min-h-0 bg-background">{renderViewer}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-20 bg-background flex flex-col">
        {themeApplier}
        <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} />
        <div className="flex-1 min-h-0">{renderViewer}</div>
      </div>
    );
  }

  const pageContent = (
    <>
      {view === "rooms" && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Pomieszczenia</h2>
          {project.rooms.length === 0 ? (
            <p className="text-gray-400 text-center py-16">Brak pomieszczeń w tym projekcie.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
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
          {!isSidebar && project.hasDiscussion && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Inne moduły</h3>
              <button
                onClick={() => setView("discussion")}
                className="inline-flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Dyskusje</p>
                  <p className="text-[11px] text-muted-foreground">Czat z projektantem</p>
                </div>
              </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {folderRenders.map((render) => (
                    <RenderCard key={render.id} render={render} hideCommentCount={project.hideCommentCount} onClick={() => { setSelectedRender(render); setView("render"); fetch(`/api/client/${projectId}/renders/${render.id}/view`, { method: "POST" }); }} />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
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
    </>
  );

  return (
    <div className={`${isSidebar ? "h-dvh" : "min-h-screen"} flex flex-col bg-muted/60`}>
      {themeApplier}
      <ShareNavbar clientLogoUrl={project.clientLogoUrl} designerName={project.designerName ?? undefined} clientName={authorName} />
      {isSidebar ? (
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token=""
            discussionId={project.discussionId}
            showRenderFlow={!project.hiddenModules.includes("renderflow")}
            showListy={!project.hiddenModules.includes("listy")}
            showDyskusje={!project.hiddenModules.includes("dyskusje")}
            shoppingLists={project.shoppingLists}
            onRenderFlowClick={() => setView("rooms")}
            onDiscussionClick={() => setView("discussion")}
            clientProjectId={projectId}
            activeView={view}
            currentUserId={currentUserId}
          />
          <main className="flex-1 overflow-y-auto px-6 py-6 bg-background rounded-tl-2xl">{pageContent}</main>
        </div>
      ) : (
        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-8">{pageContent}</div>
      )}
    </div>
  );
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
            <MessageSquare size={11} />{render.comments.length > 0 ? `${render.comments.length} uwag` : "Brak uwag"}
          </p>
        )}
      </div>
    </button>
  );
}
