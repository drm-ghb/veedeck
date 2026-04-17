import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShareNavbar from "@/components/share/ShareNavbar";
import ShareListClient from "@/components/listy/ShareListClient";
import ShareSidebar from "@/components/share/ShareSidebar";

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

export default async function PublicListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const list = await prisma.shoppingList.findUnique({
    where: { shareToken: token },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          shareToken: true,
          archived: true,
          hiddenModules: true,
          clientName: true,
          renders: { select: { id: true }, take: 1 },
          shoppingLists: { where: { archived: false }, select: { id: true, name: true, shareToken: true } },
          user: { select: { clientLogoUrl: true, name: true, navMode: true, showProfileName: true } },
        },
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          products: {
            where: { hidden: false },
            orderBy: { order: "asc" },
            include: { _count: { select: { comments: true } } },
          },
        },
      },
    },
  });

  if (!list || list.archived || list.project?.archived) notFound();

  const allProducts = list.sections.flatMap((s) => s.products);
  const grandTotal = allProducts.reduce((sum, p) => {
    const n = parsePrice(p.price);
    return n !== null ? sum + n * p.quantity : sum;
  }, 0);
  const grandCurrency = getCurrency(allProducts.find((p) => getCurrency(p.price))?.price ?? null);
  const hasTotal = allProducts.some((p) => parsePrice(p.price) !== null);

  const isSidebar = list.project?.user?.navMode === "sidebar";
  const projectToken = list.project?.shareToken;
  const showRenderFlow = !list.project?.hiddenModules.includes("renderflow");
  const showListy = !list.project?.hiddenModules.includes("listy");
  const hasRenders = (list.project?.renders.length ?? 0) > 0;

  const mapProduct = (p: typeof list.sections[0]["products"][0]) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    imageUrl: p.imageUrl,
    price: p.price,
    manufacturer: p.manufacturer,
    color: p.color,
    dimensions: p.dimensions,
    description: p.description,
    deliveryTime: p.deliveryTime,
    quantity: p.quantity,
    order: p.order,
    commentCount: p._count.comments,
    approval: p.approval,
  });

  // Separate unsorted products — they will be shown as "Pozostałe" at the bottom
  const unsortedProducts = list.sections
    .filter((s) => s.unsorted)
    .flatMap((s) => s.products)
    .map(mapProduct);

  const regularSections = list.sections
    .filter((s) => !s.unsorted)
    .map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      products: s.products.map(mapProduct),
    }));

  const sections = [
    ...regularSections,
    ...(unsortedProducts.length > 0
      ? [{ id: "__unsorted__", name: "Pozostałe", order: 9999, products: unsortedProducts }]
      : []),
  ];

  const mainContent = (
    <main className="flex-1 overflow-y-auto px-6 py-6 bg-background rounded-tl-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          {list.project && (
            <>
              <a
                href={`/share/${list.project.shareToken}/home`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {list.project.title}
              </a>
              <span className="text-muted-foreground">/</span>
            </>
          )}
          <h1 className="text-xl font-bold truncate">{list.name}</h1>
        </div>
        {hasTotal && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground">Suma:</span>
            <span className="text-sm font-semibold tabular-nums">
              {grandTotal.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {grandCurrency}
            </span>
          </div>
        )}
      </div>

      <ShareListClient
        listId={list.id}
        listShareToken={token}
        listName={list.name}
        projectTitle={list.project?.title}
        projectShareToken={list.project?.shareToken}
        sections={sections}
        grandTotal={grandTotal}
        grandCurrency={grandCurrency}
        hasTotal={hasTotal}
        designerName={list.project?.user?.showProfileName ? (list.project.user.name ?? undefined) : undefined}
        designerLogoUrl={list.project?.user?.clientLogoUrl ?? undefined}
      />
    </main>
  );

  return (
    <div className={`${isSidebar ? "h-screen" : "min-h-screen"} flex flex-col bg-muted/60`}>
      <ShareNavbar
        backHref={isSidebar ? undefined : (projectToken ? `/share/${projectToken}/home` : undefined)}
        backLabel={list.project?.title}
        clientLogoUrl={list.project?.user?.clientLogoUrl}
        designerName={list.project?.user?.showProfileName ? (list.project.user.name ?? undefined) : undefined}
        listToken={token}
        projectShareToken={list.project?.shareToken}
      />

      {isSidebar && projectToken ? (
        <div className="flex flex-1 min-h-0">
          <ShareSidebar
            token={projectToken}
            showRenderFlow={showRenderFlow && hasRenders}
            showListy={showListy}
            shoppingLists={list.project?.shoppingLists ?? []}
          />
          {mainContent}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {mainContent}
        </div>
      )}
    </div>
  );
}
