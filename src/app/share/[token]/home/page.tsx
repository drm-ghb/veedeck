import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ImageIcon, ShoppingBag } from "lucide-react";

export default async function ProjectHomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({
    where: { shareToken: token },
    include: {
      renders: { where: { archived: false }, select: { id: true }, take: 1 },
      shoppingLists: {
        select: { id: true, name: true, shareToken: true },
      },
    },
  });

  if (!project) notFound();

  const hasRenders = project.renders.length > 0;
  const lists = project.shoppingLists;

  const modules: {
    label: string;
    description: string;
    href: string;
    icon: React.ReactNode;
  }[] = [];

  if (hasRenders) {
    modules.push({
      label: "RenderFlow",
      description: "Wizualizacje i rendery projektu",
      href: `/share/${token}`,
      icon: <ImageIcon size={28} className="text-[#19213D]" />,
    });
  }

  for (const list of lists) {
    modules.push({
      label: list.name,
      description: "Lista zakupowa",
      href: `/share/list/${list.shareToken}`,
      icon: <ShoppingBag size={28} className="text-[#19213D]" />,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-lg font-bold text-foreground">{project.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Widok klienta</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Wybierz moduł, który chcesz przeglądać:
        </p>

        {modules.length === 0 && (
          <p className="text-center text-muted-foreground py-16">Brak dostępnych modułów.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:border-[#19213D]/30 hover:bg-[#19213D]/5 transition-colors group"
            >
              <div className="w-14 h-14 rounded-xl bg-[#19213D]/10 flex items-center justify-center shrink-0 group-hover:bg-[#19213D]/15 transition-colors">
                {mod.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{mod.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
