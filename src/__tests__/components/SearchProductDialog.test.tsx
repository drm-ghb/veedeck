/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SearchProductDialog } from "@/components/produkty/SearchProductDialog";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockProducts = [
  {
    id: "prod-1",
    name: "Lampa sufitowa",
    category: "Oświetlenie",
    manufacturer: "IKEA",
    color: "Biały",
    price: "299 PLN",
    imageUrl: "https://example.com/lamp.jpg",
    description: "Nowoczesna lampa",
  },
  {
    id: "prod-2",
    name: "Biurko",
    category: "Meble",
    manufacturer: "NOWY STYL",
    color: "Wenge",
    price: "899 PLN",
    imageUrl: "https://example.com/desk.jpg",
    description: "Solidne biurko",
  },
];

const mockFilters = {
  categories: ["Oświetlenie", "Meble"],
  manufacturers: ["IKEA", "NOWY STYL"],
  colors: ["Biały", "Wenge"],
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("SearchProductDialog", () => {
  it("renderuje dialog gdy open=true", () => {
    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    expect(screen.getByText("Dodaj produkt z bazy")).toBeInTheDocument();
  });

  it("NIE renderuje dialog gdy open=false", () => {
    const { container } = render(
      <SearchProductDialog
        open={false}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    // Dialog powinien być w DOM ale hidden
    const dialogContent = container.querySelector('[role="dialog"]');
    expect(dialogContent).not.toBeVisible();
  });

  it("wyświetla pola do wyszukiwania i filtry", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockFilters,
    });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Szukaj produktu...")).toBeInTheDocument();
    });

    expect(screen.getByText("Kategorie")).toBeInTheDocument();
    expect(screen.getByText("Producenci")).toBeInTheDocument();
    expect(screen.getByText("Kolory")).toBeInTheDocument();
  });

  it("ładuje dostępne filtry przy montażu", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockFilters,
    });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/products?action=filters")
      );
    });
  });

  it("wyświetla wyszukane produkty", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: mockProducts,
          total: 2,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    // Input search
    const searchInput = screen.getByPlaceholderText("Szukaj produktu...");
    fireEvent.change(searchInput, { target: { value: "lampa" } });

    await waitFor(() => {
      expect(screen.getByText("Lampa sufitowa")).toBeInTheDocument();
    });
  });

  it("filtruje produkty po kategorii", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [mockProducts[0]],
          total: 1,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    // Poczekaj na załadowanie
    await waitFor(() => {
      expect(screen.getByText("Oświetlenie")).toBeInTheDocument();
    });

    // Zaznacz kategorię
    const categoryCheckbox = screen.getByRole("checkbox", { name: /Oświetlenie/ });
    fireEvent.click(categoryCheckbox);

    await waitFor(() => {
      expect(screen.getByText("Lampa sufitowa")).toBeInTheDocument();
    });
  });

  it("wyświetla badge z ilością aktywnych filtrów", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: mockProducts.slice(0, 1),
          total: 1,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Kategororie")).toBeInTheDocument();
    });

    const categoryCheckbox = screen.getByRole("checkbox", { name: /Oświetlenie/ });
    fireEvent.click(categoryCheckbox);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument(); // Badge z licznikiem
    });
  });

  it("resetuje filtry po kliknięciu przycisku", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: mockProducts.slice(0, 1),
          total: 1,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Kategorie")).toBeInTheDocument();
    });

    // Zaznacz filtr
    const checkbox = screen.getByRole("checkbox", { name: /Oświetlenie/ });
    fireEvent.click(checkbox);

    // Kliknij "Wyczyść filtry"
    const clearButton = screen.getByText("Wyczyść filtry");
    fireEvent.click(clearButton);

    // Filtr powinien być niezaznaczony
    expect(checkbox).not.toBeChecked();
  });

  it("wywoła onSelectProduct gdy kliknięty produkt", async () => {
    const onSelectProduct = vi.fn();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: mockProducts,
          total: 2,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={onSelectProduct}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Lampa sufitowa")).toBeInTheDocument();
    });

    // Kliknij produkt
    const productButton = screen.getByText("Lampa sufitowa").closest("button");
    fireEvent.click(productButton!);

    expect(onSelectProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        name: "Lampa sufitowa",
      })
    );
  });

  it("zamyka dialog po wyborze produktu", async () => {
    const onOpenChange = vi.fn();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: mockProducts,
          total: 2,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={onOpenChange}
        onSelectProduct={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Lampa sufitowa")).toBeInTheDocument();
    });

    const productButton = screen.getByText("Lampa sufitowa").closest("button");
    fireEvent.click(productButton!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("wyświetla empty state gdy brak wyników", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [],
          total: 0,
          hasMore: false,
        }),
      });

    render(
      <SearchProductDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectProduct={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("Szukaj produktu...");
    fireEvent.change(searchInput, { target: { value: "xyzabc" } });

    await waitFor(() => {
      expect(screen.getByText("Brak wyników")).toBeInTheDocument();
    });
  });
});
