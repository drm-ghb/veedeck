"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import RenderViewer from "@/components/render/RenderViewer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getRoomIcon } from "@/lib/roomIcons";
import { ChevronLeft, MessageSquare, UserRound, Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";

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

interface Render {
  id: string;
  name: string;
  fileUrl: string;
  status: RenderStatus;
  comments: Comment[];
}

interface Room {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  renders: Render[];
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  rooms: Room[];
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [view, setView] = useState<"rooms" | "room" | "render" | "settings">("rooms");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("renderflow-author");
    if (saved) {
      setAuthorName(saved);
      setNameSet(true);
    }

    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setProject(data);
      })
      .finally(() => setLoading(false));

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
      setPendingRequests((prev) => {
        const next = new Set(prev);
        next.delete(data.renderId);
        return next;
      });
      const newStatus = data.newRenderStatus;
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((room) => ({
            ...room,
            renders: room.renders.map((r) =>
              r.id === data.renderId ? { ...r, status: newStatus } : r
            ),
          })),
        };
      });
      setSelectedRender((prev) =>
        prev?.id === data.renderId ? { ...prev, status: newStatus } : prev
      );
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`share-${token}`);
    };
  }, [token]);

  function handleSetName() {
    if (!nameInput.trim()) return;
    localStorage.setItem("renderflow-author", nameInput.trim());
    setAuthorName(nameInput.trim());
    setNameSet(true);
  }

  async function handleStatusRequest(renderId: string) {
    if (pendingRequests.has(renderId)) return;
    const res = await fetch(`/api/share/${token}/renders/${renderId}/status-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: authorName }),
    });
    if (res.ok) {
      setPendingRequests((prev) => new Set([...prev, renderId]));
      toast.success("Prośba o zmianę statusu pliku została wysłana do projektanta.");
    } else {
      toast.error("Błąd podczas wysyłania prośby.");
    }
  }

  async function handleRenderStatusChange(renderId: string, status: RenderStatus) {
    await fetch(`/api/share/${token}/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // Update local state
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((room) => ({
          ...room,
          renders: room.renders.map((r) =>
            r.id === renderId ? { ...r, status } : r
          ),
        })),
      };
    });
    if (selectedRender?.id === renderId) {
      setSelectedRender((prev) => prev ? { ...prev, status } : prev);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 animate-pulse">Ładowanie...</p>
    </div>
  );

  if (notFound) return (
    <div className="flex items-center justify-center min-h-screen text-center">
      <div>
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-500">Projekt nie został znaleziony</p>
      </div>
    </div>
  );

  if (!nameSet) return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image src="/logo.svg" alt="RenderFlow" width={32} height={32} className="block dark:hidden" />
          <Image src="/logo-dark.svg" alt="RenderFlow" width={32} height={32} className="hidden dark:block" />
          <h1 className="text-2xl font-bold">
            Render<span className="text-blue-600">Flow</span>
          </h1>
        </div>
        <p className="text-gray-500 mb-6">Podaj swoje imię aby przeglądać projekt</p>
        <div className="flex gap-2">
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Twoje imię"
            onKeyDown={(e) => e.key === "Enter" && handleSetName()}
            autoFocus
          />
          <Button onClick={handleSetName} disabled={!nameInput.trim()}>
            Dalej
          </Button>
        </div>
      </div>
    </div>
  );

  if (!project) return null;

  // Render view — full screen
  if (view === "render" && selectedRender && selectedRoom) {
    const roomRenders = selectedRoom.renders.map((r) => ({
      id: r.id,
      name: r.name,
      fileUrl: r.fileUrl,
    }));

    return (
      <div className="flex flex-col h-screen">
        <RenderViewer
          renderId={selectedRender.id}
          renderName={selectedRender.name}
          projectTitle={project.title}
          roomName={selectedRoom.name}
          imageUrl={selectedRender.fileUrl}
          initialComments={selectedRender.comments}
          authorName={authorName}
          isDesigner={false}
          roomRenders={roomRenders.length > 1 ? roomRenders : []}
          initialRenderStatus={selectedRender.status}
          onRenderStatusChange={(status) =>
            handleRenderStatusChange(selectedRender.id, status)
          }
          onStatusRequest={
            pendingRequests.has(selectedRender.id)
              ? undefined
              : () => handleStatusRequest(selectedRender.id)
          }
          onBack={() => setView("room")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="bg-card border-b flex-shrink-0">
        <div className="flex items-center justify-between max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="RenderFlow" width={26} height={26} className="block dark:hidden" />
            <Image src="/logo-dark.svg" alt="RenderFlow" width={26} height={26} className="hidden dark:block" />
            <span className="font-bold text-lg">
              Render<span className="text-blue-600">Flow</span>
            </span>
            <span className="text-gray-300 mx-1">|</span>
            {view === "rooms" ? (
              <span className="text-gray-700 font-medium">{project.title}</span>
            ) : (
              <>
                <button
                  onClick={() => setView("rooms")}
                  className="text-gray-400 hover:text-gray-700 transition-colors text-sm"
                >
                  {project.title}
                </button>
                {selectedRoom && (
                  <>
                    <span className="text-gray-300 mx-1">›</span>
                    <span className="text-gray-700 font-medium text-sm">{selectedRoom.name}</span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("settings")}
              title="Ustawienia"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <UserRound size={15} />
              <span className="hidden sm:inline">{authorName}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Settings view */}
        {view === "settings" && (
          <ClientSettingsView
            authorName={authorName}
            onSave={(newName) => {
              localStorage.setItem("renderflow-author", newName);
              setAuthorName(newName);
              setView("rooms");
            }}
            onBack={() => setView("rooms")}
          />
        )}

        {/* Rooms view */}
        {view === "rooms" && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pomieszczenia</h2>
            {project.rooms.length === 0 ? (
              <p className="text-gray-400 text-center py-16">Brak pomieszczeń w tym projekcie.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {project.rooms.map((room) => {
                  const Icon = getRoomIcon(room.type, room.icon);
                  const renderCount = room.renders.length;
                  return (
                    <button
                      key={room.id}
                      onClick={() => { setSelectedRoom(room); setView("room"); }}
                      className="group text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                    >
                      <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                        <Icon size={28} className="text-orange-400" />
                      </div>
                      <p className="font-semibold text-gray-800 truncate">{room.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {renderCount} render{renderCount === 1 ? "" : renderCount < 5 ? "y" : "ów"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Room renders view */}
        {view === "room" && selectedRoom && (
          <>
            <button
              onClick={() => setView("rooms")}
              className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
            >
              <ChevronLeft size={15} /> {project.title}
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{selectedRoom.name}</h2>

            {selectedRoom.renders.length === 0 ? (
              <p className="text-gray-400 text-center py-16">Brak plików w tym pomieszczeniu.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedRoom.renders.map((render) => (
                  <button
                    key={render.id}
                    onClick={() => { setSelectedRender(render); setView("render"); }}
                    className="text-left bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={render.fileUrl}
                        alt={render.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{render.name}</p>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          render.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {render.status === "ACCEPTED" ? "Zaakceptowany" : "Do weryfikacji"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MessageSquare size={11} />
                        {render.comments.length > 0
                          ? `${render.comments.length} uwag`
                          : "Brak uwag"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
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

  function handleSave() {
    if (!nameInput.trim()) return;
    onSave(nameInput.trim());
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
        >
          <ChevronLeft size={15} /> Wróć
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ustawienia</h2>
      </div>

      {/* Tożsamość */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserRound size={18} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Twoja tożsamość</h3>
        </div>
        <p className="text-xs text-gray-400">
          Imię widoczne przy Twoich komentarzach i prośbach do projektanta.
        </p>
        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Imię wyświetlane</label>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Twoje imię"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!nameInput.trim() || nameInput.trim() === authorName}
          size="sm"
        >
          Zapisz
        </Button>
      </div>

      {/* Motyw */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Motyw interfejsu</h3>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                theme === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:bg-muted"
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
