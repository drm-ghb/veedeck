"use client";

import Link from "next/link";
import { Pin, Image } from "@/components/ui/icons";
import ProjectMenu from "./ProjectMenu";
import { accentColors } from "@/lib/accent-color";
import { useT } from "@/lib/i18n";

interface ProjectCardProps {
  id: string;
  title: string;
  clientName?: string | null;
  clientEmail?: string | null;
  description?: string | null;
  renderCount: number;
  createdAt: string;
  shareToken: string;
  pinned?: boolean;
  hiddenModules?: string[];
  hasClientAccounts?: boolean;
  clientHasNoAccount?: boolean;
  accentColor?: string | null;
}

export default function ProjectCard({
  id,
  title,
  clientName,
  clientEmail,
  description,
  renderCount,
  createdAt,
  shareToken,
  pinned,
  hiddenModules = [],
  accentColor,
}: ProjectCardProps) {
  const t = useT();
  const colors = clientName
    ? accentColors(accentColor)
    : { bar: "#94a3b8", tint: "#EEF2FF", deep: "#4F46E5" };

  return (
    <Link href={`/projekty/${id}`} className="block group">
      <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] p-4 cursor-pointer transition-[box-shadow,transform] duration-[180ms] hover:shadow-[0_8px_24px_-12px_rgba(24,24,50,.18)] hover:-translate-y-0.5">
        {/* Accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: colors.bar }} />

        {/* Header: title + chip + menu */}
        <div className="flex items-start justify-between gap-2 pl-3">
          <p className="font-semibold text-[14px] leading-snug text-[#24252B] flex items-center gap-1.5 min-w-0">
            {pinned && <Pin size={13} className="text-red-500 fill-red-500 shrink-0 translate-y-px" />}
            <span className="truncate">{title}</span>
          </p>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.preventDefault()}>
            <span
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: colors.tint, color: colors.deep }}
            >
              <Image size={13} />
              {renderCount}
            </span>
            <ProjectMenu
              project={{ id, title, clientName, clientEmail, description, pinned }}
            />
          </div>
        </div>

        {/* Client line */}
        <p className="text-[12.5px] text-[#8A8D98] mt-[5px] truncate pl-3">
          {clientName ? `${t.projekty.colClient}: ${clientName}` : "\u00A0"}
        </p>

        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] pl-3">
          <p className="text-[11.5px] text-[#8A8D98]">
            {t.projekty.createdAt} {new Date(createdAt).toLocaleDateString("pl-PL")}
          </p>
        </div>
      </div>
    </Link>
  );
}
