import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  backHref?: string;
}

export function Breadcrumb({ items, backHref }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const backDest = backHref ?? (items.length > 1 ? items[items.length - 2].href : undefined);

  return (
    <nav className="flex items-center gap-2 mb-6">
      {/* Back arrow */}
      {backDest && (
        <>
          <Link
            href={backDest}
            className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        </>
      )}

      {/* Crumbs */}
      <ol className="flex items-center gap-1 text-sm min-w-0">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight size={13} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />
              )}
              {isLast || !item.href ? (
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors truncate max-w-[160px]"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
