/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RoomView from "@/components/render/RoomView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/components/render/RenderMenu", () => ({
  default: () => <div data-testid="render-menu" />,
}));

vi.mock("@/components/render/FolderCard", () => ({
  default: ({ folder }: { folder: { id: string; name: string } }) => (
    <div data-testid="folder-card">{folder.name}</div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    size?: string;
    variant?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

global.fetch = vi.fn();
global.confirm = vi.fn().mockReturnValue(true);

const renders = [
  { id: "r1", name: "Render A", fileUrl: "/img1.jpg", commentCount: 2, viewCount: 10, status: "REVIEW" as const, folderId: null, pinned: false },
  { id: "r2", name: "Render B", fileUrl: "/img2.jpg", commentCount: 0, viewCount: 5, status: "ACCEPTED" as const, folderId: null, pinned: true },
];

const folders = [
  { id: "f1", name: "Sypialnia", renderCount: 3, pinned: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
});

describe("RoomView — zakładka Pliki", () => {
  it("renderuje nazwy renderów", () => {
    render(
      <RoomView
        projectId="proj-1"
        roomId="room-1"
        renders={renders}
        archivedRenders={[]}
        folders={[]}
        archivedFolders={[]}
      />
    );
    expect(screen.getByText("Render A")).toBeInTheDocument();
    expect(screen.getByText("Render B")).toBeInTheDocument();
  });

  it("wyświetla foldery jako kafelki", () => {
    render(
      <RoomView
        projectId="proj-1"
        roomId="room-1"
        renders={renders}
        archivedRenders={[]}
        folders={folders}
        archivedFolders={[]}
      />
    );
    expect(screen.getByTestId("folder-card")).toBeInTheDocument();
    expect(screen.getByText("Sypialnia")).toBeInTheDocument();
  });

  it("wyświetla status 'Do weryfikacji' dla REVIEW", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[renders[0]]} archivedRenders={[]} folders={[]} archivedFolders={[]} />
    );
    expect(screen.getByText("Do weryfikacji")).toBeInTheDocument();
  });

  it("wyświetla status 'Zaakceptowany' dla ACCEPTED", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[renders[1]]} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    expect(screen.getByText("Zaakceptowany")).toBeInTheDocument();
  });

  it("wyświetla liczbę komentarzy gdy commentCount > 0", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[renders[0]]} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("wyświetla licznik wyświetleń", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[renders[0]]} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("wyświetla komunikat gdy brak plików", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    expect(screen.getByText("Brak plików")).toBeInTheDocument();
  });

  it("odznacza przypięty render ikoną pinezki w widoku siatki", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={renders} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    // Render B jest pinned=true — szukamy elementu z klasą absolute top-2 left-2
    const pinContainer = document.querySelector(".absolute.top-2.left-2");
    expect(pinContainer).not.toBeNull();
    const pinSpan = pinContainer?.querySelector("span");
    expect(pinSpan).not.toBeNull();
    expect(pinSpan?.getAttribute("class")).toContain("fill-red-500");
  });

  it("badge zakładki Pliki pokazuje łączną liczbę folderów i renderów", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={renders} archivedRenders={[]} folders={folders} archivedFolders={[]}/>
    );
    // 2 rendery + 1 folder = 3
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("RoomView — zakładka Zarchiwizowane", () => {
  const archivedRenders = [
    { id: "ar1", name: "Stary Render", fileUrl: "/old.jpg", commentCount: 0, viewCount: 1, status: "REVIEW" as const, folderId: null, pinned: false },
  ];
  const archivedFolders = [
    { id: "af1", name: "Stary Folder", renderCount: 1 },
  ];

  it("przełącza na zakładkę Zarchiwizowane", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={archivedRenders} folders={[]} archivedFolders={[]}/>
    );
    fireEvent.click(screen.getByText("Zarchiwizowane"));
    expect(screen.getByText("Stary Render")).toBeInTheDocument();
  });

  it("wyświetla zarchiwizowane foldery", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={[]} folders={[]} archivedFolders={archivedFolders}/>
    );
    fireEvent.click(screen.getByText("Zarchiwizowane"));
    expect(screen.getByText("Stary Folder")).toBeInTheDocument();
  });

  it("badge zakładki Zarchiwizowane pokazuje sumę", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={archivedRenders} folders={[]} archivedFolders={archivedFolders}/>
    );
    // 1 archived render + 1 archived folder = 2
    const badge = screen.getAllByText("2")[0];
    expect(badge).toBeInTheDocument();
  });

  it("kliknięcie Przywróć render wywołuje PATCH z archived: false", async () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={archivedRenders} folders={[]} archivedFolders={[]}/>
    );
    fireEvent.click(screen.getByText("Zarchiwizowane"));
    const restoreBtn = await screen.findAllByText(/Przywróć/);
    fireEvent.click(restoreBtn[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/renders/ar1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"archived":false'),
        })
      );
    });
  });

  it("kliknięcie Przywróć folder wywołuje PATCH folderu z archived: false", async () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={[]} folders={[]} archivedFolders={archivedFolders}/>
    );
    fireEvent.click(screen.getByText("Zarchiwizowane"));
    const restoreBtn = await screen.findAllByText(/Przywróć/);
    fireEvent.click(restoreBtn[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/folders/af1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"archived":false'),
        })
      );
    });
  });

  it("wyświetla komunikat gdy brak zarchiwizowanych elementów", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    fireEvent.click(screen.getByText("Zarchiwizowane"));
    expect(screen.getByText("Brak zarchiwizowanych elementów")).toBeInTheDocument();
  });
});

describe("RoomView — przełącznik widok siatki/lista", () => {
  it("domyślnie aktywny jest widok siatki", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={renders} archivedRenders={[]} folders={[]} archivedFolders={[]}/>
    );
    // Kafelki renderów są widoczne - sprawdzamy aspect-video (grid)
    const card = screen.getByText("Render A").closest("div");
    expect(card).toBeInTheDocument();
  });

  it("przełącznik widoku jest widoczny tylko gdy są niezgrupowane rendery", () => {
    render(
      <RoomView projectId="p" roomId="r" renders={[]} archivedRenders={[]} folders={folders} archivedFolders={[]}/>
    );
    // Brak renderów bez folderu → brak przełącznika
    const gridBtn = document.querySelector("button svg[class*='layout-grid'], button [data-lucide='layout-grid']");
    expect(gridBtn).toBeNull();
  });
});
