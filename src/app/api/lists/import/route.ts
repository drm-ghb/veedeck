import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { getWorkspaceUserId } from "@/lib/workspace";
import { checkTeamPermission } from "@/lib/permissions";

interface ImportProduct {
  name: string;
  url?: string;
  imageUrl?: string;
  price?: string;
  manufacturer?: string;
  color?: string;
  dimensions?: string;
  description?: string;
  deliveryTime?: string;
  quantity?: number;
  unit?: string;
  catalogNumber?: string;
  supplier?: string;
  category?: string;
  note?: string;
}

interface ImportSection {
  name: string;
  products: ImportProduct[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await checkTeamPermission(session, "listCanCreate")) {
    return NextResponse.json({ error: "Brak uprawnień do tworzenia list" }, { status: 403 });
  }

  const userId = getWorkspaceUserId(session);

  let body: { name?: string; projectId?: string; clientId?: string; sections?: ImportSection[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const { name, projectId, clientId, sections } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nazwa listy jest wymagana" }, { status: 400 });
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "Brak sekcji do importu" }, { status: 400 });
  }

  const totalProducts = sections.reduce((sum, s) => sum + (s.products?.length ?? 0), 0);
  if (totalProducts === 0) {
    return NextResponse.json({ error: "Brak produktów do importu" }, { status: 400 });
  }

  // Verify ownership
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return NextResponse.json({ error: "Projekt nie istnieje" }, { status: 403 });
  }
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, designerId: userId } });
    if (!client) return NextResponse.json({ error: "Klient nie istnieje" }, { status: 403 });
  }

  try {
    const slug = await uniqueSlug(name.trim(), (s) =>
      prisma.shoppingList.findUnique({ where: { slug: s } }).then(Boolean)
    );

    const list = await prisma.shoppingList.create({
      data: {
        name: name.trim(),
        slug,
        userId,
        projectId: projectId ?? null,
        clientId: clientId ?? null,
        shareToken: crypto.randomUUID(),
        isSharedWithClient: false,
      },
    });

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const validProducts = (section.products ?? []).filter((p) => p.name?.trim());
      if (validProducts.length === 0) continue;

      const createdSection = await prisma.listSection.create({
        data: {
          name: (section.name?.trim() || "Produkty"),
          listId: list.id,
          order: si,
        },
      });

      await prisma.listProduct.createMany({
        data: validProducts.map((p, pi) => ({
          name: p.name.trim(),
          url: p.url?.trim() || null,
          imageUrl: p.imageUrl?.trim() || null,
          price: p.price?.trim() || null,
          manufacturer: p.manufacturer?.trim() || null,
          color: p.color?.trim() || null,
          dimensions: p.dimensions?.trim() || null,
          description: p.description?.trim() || null,
          deliveryTime: p.deliveryTime?.trim() || null,
          quantity: typeof p.quantity === "number" && p.quantity >= 1 ? Math.round(p.quantity) : 1,
          unit: p.unit?.trim() || "szt.",
          catalogNumber: p.catalogNumber?.trim() || null,
          supplier: p.supplier?.trim() || null,
          category: p.category?.trim() || null,
          note: p.note?.trim() || null,
          sectionId: createdSection.id,
          order: pi,
        })),
      });
    }

    return NextResponse.json({ listId: list.id, slug: list.slug }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/lists/import]", err);
    return NextResponse.json({ error: "Błąd importu listy" }, { status: 500 });
  }
}
