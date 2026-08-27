import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({
  items,
  className = "",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-1.5 text-sm ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex items-center gap-1.5"
          >
            {i > 0 && (
              <ChevronRight
                size={14}
                className="text-gray-400 dark:text-zinc-500 shrink-0"
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-semibold text-gray-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
