import Link from "next/link";
import Image from "next/image";

interface Module {
  id: string;
  name: string;
  description: string;
  href: string;
  iconDark: string;
  color: string;
}

const modules: Module[] = [
  {
    id: "renderflow",
    name: "RenderFlow",
    description: "Zarządzanie renderami i feedbackiem",
    href: "/dashboard",
    iconDark: "/logo-dark.svg",
    color: "#19213D",
  },
];

export default function HomePage() {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
        Aplikacje
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {modules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.href}
            className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150"
              style={{ backgroundColor: mod.color }}
            >
              <Image
                src={mod.iconDark}
                alt={mod.name}
                width={36}
                height={36}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground leading-tight">
                {mod.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {mod.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
