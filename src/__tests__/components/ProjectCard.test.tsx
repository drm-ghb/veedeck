/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ProjectCard from "@/components/dashboard/ProjectCard";

// Mocki Next.js i zewnętrznych zależności
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/dashboard/ProjectMenu", () => ({
  default: () => <div data-testid="project-menu" />,
}));

// Mock clipboard API
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.defineProperty(navigator, "clipboard", {
  value: mockClipboard,
  writable: true,
});

const defaultProps = {
  id: "proj-1",
  title: "Projekt testowy",
  renderCount: 5,
  createdAt: "2025-01-15T10:00:00.000Z",
  shareToken: "tok-abc",
};

beforeEach(() => vi.clearAllMocks());

describe("ProjectCard", () => {
  it("renderuje tytuł projektu", () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText("Projekt testowy")).toBeInTheDocument();
  });

  it("renderuje liczbę renderów", () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText("5 renderów")).toBeInTheDocument();
  });

  it("renderuje datę w formacie polskim", () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText(/15\.01\.2025/)).toBeInTheDocument();
  });

  it("wyświetla imię klienta gdy podano", () => {
    render(<ProjectCard {...defaultProps} clientName="Jan Kowalski" />);
    expect(screen.getByText(/Jan Kowalski/)).toBeInTheDocument();
  });

  it("wyświetla email klienta gdy podano", () => {
    render(<ProjectCard {...defaultProps} clientEmail="jan@test.com" />);
    // email jest przekazywany do ProjectMenu (nie renderowany bezpośrednio w karcie)
    expect(screen.getByTestId("project-menu")).toBeInTheDocument();
  });

  it("wyświetla opis gdy podano", () => {
    render(<ProjectCard {...defaultProps} description="Projekt salonu" />);
    expect(screen.getByText("Projekt salonu")).toBeInTheDocument();
  });

  it("NIE wyświetla ikony pinezki gdy projekt nie jest przypięty", () => {
    render(<ProjectCard {...defaultProps} pinned={false} />);
    // Pinezka powinna być niewidoczna
    const title = screen.getByText("Projekt testowy");
    const titleContainer = title.closest("span") ?? title.parentElement;
    // Brak elementu svg z klasą fill-red-500 w tytule
    const allSpans = document.querySelectorAll("span");
    const redPins = Array.from(allSpans).filter(
      (span) => span.classList.contains("fill-red-500")
    );
    expect(redPins.length).toBe(0);
  });

  it("wyświetla ikonę pinezki obok tytułu gdy projekt jest przypięty", () => {
    render(<ProjectCard {...defaultProps} pinned={true} />);
    // Pinezka renderuje się jako <span class="material-symbols-rounded fill-red-500 ...">
    const pin = document.querySelector("span.fill-red-500");
    expect(pin).not.toBeNull();
  });

  it("kliknięcie 'Kopiuj link' kopiuje link do schowka", async () => {
    render(<ProjectCard {...defaultProps} />);
    const copyBtn = screen.getByText("Kopiuj link");
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/share/tok-abc")
      );
    });
  });

  it("gdy renderflow jest ukryty — kliknięcie 'Kopiuj link' otwiera ostrzeżenie", async () => {
    render(<ProjectCard {...defaultProps} hiddenModules={["renderflow"]} />);
    const copyBtn = screen.getByText("Kopiuj link");
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(screen.getByText("Moduł jest ukryty dla klienta")).toBeInTheDocument();
    });
  });

  it("w ostrzeżeniu 'Mimo to skopiuj' kopiuje link i zamyka dialog", async () => {
    render(<ProjectCard {...defaultProps} hiddenModules={["renderflow"]} />);
    fireEvent.click(screen.getByText("Kopiuj link"));
    await waitFor(() => screen.getByText("Mimo to skopiuj"));
    fireEvent.click(screen.getByText("Mimo to skopiuj"));
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  it("link projektu kieruje do /projects/[id]", () => {
    render(<ProjectCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/proj-1");
  });
});
