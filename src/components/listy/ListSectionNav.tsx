"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

interface Section {
  id: string;
  name: string;
}

interface Props {
  sections: Section[];
  /** Pixels to offset when scrolling to section (e.g. sticky toolbar height). Default 0. */
  scrollOffset?: number;
}

export default function ListSectionNav({ sections, scrollOffset = 0 }: Props) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (sections.length === 0) return;

    const scrollEl =
      (document.querySelector("main[data-scroll-root]") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null);
    if (!scrollEl) return;

    function update() {
      let found: string | null = null;
      // threshold = toolbar height + a bit of breathing room
      const threshold = scrollOffset + 40;
      for (const s of sections) {
        const el = document.getElementById(`section-nav-${s.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - scrollEl!.getBoundingClientRect().top;
        if (top < threshold) found = s.id;
      }
      setActiveId(found ?? sections[0]?.id ?? null);
    }

    scrollEl.addEventListener("scroll", update, { passive: true });
    update();
    return () => scrollEl.removeEventListener("scroll", update);
  }, [sections, scrollOffset]);

  if (sections.length <= 1) return null;

  function goTo(id: string) {
    const el = document.getElementById(`section-nav-${id}`);
    if (!el) return;
    const scrollEl =
      (document.querySelector("main[data-scroll-root]") as HTMLElement | null) ??
      (document.querySelector("main") as HTMLElement | null);
    if (scrollEl) {
      const elTop = el.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
      scrollEl.scrollTop += elTop - scrollOffset - 16;
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveId(id);
  }

  return (
    <nav className="py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 pl-3">{t.listy.sectionsNavTitle}</p>
      <div className="relative pl-3 pr-2">

      {sections.map((s) => {
        const active = activeId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => goTo(s.id)}
            title={s.name}
            className={`relative w-full text-left py-1 pl-2 pr-1 text-xs transition-all duration-150 truncate block ${
              active
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {/* Active indicator — colored left bar */}
            <span
              className={`absolute left-0 top-[2px] bottom-[2px] w-[3px] rounded-full transition-all duration-200 ${
                active ? "bg-primary opacity-100" : "opacity-0"
              }`}
            />
            {s.name}
          </button>
        );
      })}
      </div>
    </nav>
  );
}
