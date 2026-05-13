/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import FolderCard from "@/components/render/FolderCard";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/components/render/FolderMenu", () => ({
  default: () => <div data-testid="folder-menu" />,
}));

const folder = {
  id: "folder-1",
  name: "Sypialnia",
  renderCount: 3,
  pinned: false,
};

describe("FolderCard", () => {
  it("wyświetla nazwę folderu", () => {
    render(<FolderCard folder={folder} projectId="proj-1" roomId="room-1" />);
    expect(screen.getByText("Sypialnia")).toBeInTheDocument();
  });

  it("link kieruje do właściwej ścieżki", () => {
    render(<FolderCard folder={folder} projectId="proj-1" roomId="room-1" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/proj-1/rooms/room-1/folders/folder-1");
  });

  it("wyświetla liczbę plików — 1 plik (forma pojedyncza)", () => {
    render(<FolderCard folder={{ ...folder, renderCount: 1 }} projectId="p" roomId="r" />);
    expect(screen.getByText("1 plik")).toBeInTheDocument();
  });

  it("wyświetla liczbę plików — 2 pliki (forma mnoga 2-4)", () => {
    render(<FolderCard folder={{ ...folder, renderCount: 2 }} projectId="p" roomId="r" />);
    expect(screen.getByText("2 pliki")).toBeInTheDocument();
  });

  it("wyświetla liczbę plików — 5 plików (forma mnoga 5+)", () => {
    render(<FolderCard folder={{ ...folder, renderCount: 5 }} projectId="p" roomId="r" />);
    expect(screen.getByText("5 plików")).toBeInTheDocument();
  });

  it("NIE wyświetla ikony pinezki gdy folder nie jest przypięty", () => {
    render(<FolderCard folder={{ ...folder, pinned: false }} projectId="p" roomId="r" />);
    // Pinezka jest renderowana tylko gdy pinned=true, jako span.fill-red-500 obok nazwy
    const nameEl = screen.getByText("Sypialnia");
    const nameParagraph = nameEl.closest("p");
    expect(nameParagraph?.querySelector("span.fill-red-500")).toBeNull();
  });

  it("wyświetla ikonę pinezki obok nazwy gdy folder jest przypięty", () => {
    render(<FolderCard folder={{ ...folder, pinned: true }} projectId="p" roomId="r" />);
    const nameEl = screen.getByText("Sypialnia");
    const nameParagraph = nameEl.closest("p");
    // Pin (material-symbols) renderuje się jako span z klasą fill-red-500
    const pin = nameParagraph?.querySelector("span");
    expect(pin).not.toBeNull();
    expect(pin?.getAttribute("class")).toContain("fill-red-500");
  });

  it("renderuje menu folderu", () => {
    render(<FolderCard folder={folder} projectId="p" roomId="r" />);
    expect(screen.getByTestId("folder-menu")).toBeInTheDocument();
  });
});
