import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionKey } from "@/lib/extension-auth";

const BUILT_IN_CATEGORIES = [
  { value: "OSWIETLENIE", label: "Oświetlenie" },
  { value: "AKCESORIA", label: "Akcesoria" },
  { value: "MEBLE", label: "Meble" },
  { value: "ARMATURA", label: "Armatura" },
  { value: "OKLADZINY_SCIENNE", label: "Okładziny ścienne" },
  { value: "PODLOGA", label: "Podłoga" },
];

/** GET — returns lists (with sections), projects and categories for the extension popup */
export async function GET(req: Request) {
  const user = await validateExtensionKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [lists, projects, userData] = await Promise.all([
    prisma.shoppingList.findMany({
      where: { userId: user.workspaceId, archived: false },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        projectId: true,
        project: { select: { title: true } },
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            products: { select: { url: true, name: true } },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { userId: user.workspaceId, archived: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.user.findUnique({
      where: { id: user.workspaceId },
      select: { customCategories: true, listsCategoryOrder: true },
    }),
  ]);

  const customCats = (userData?.customCategories ?? []).map((c) => ({ value: c, label: c }));
  const allCats = [...BUILT_IN_CATEGORIES, ...customCats];
  const order = userData?.listsCategoryOrder ?? [];
  const categories = order.length
    ? [
        ...order.map((v) => allCats.find((c) => c.value === v)).filter(Boolean) as typeof allCats,
        ...allCats.filter((c) => !order.includes(c.value)),
      ]
    : allCats;

  return NextResponse.json({ lists, projects, categories });
}
