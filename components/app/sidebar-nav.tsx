"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPath, type AppBase } from "@/lib/app-path";

const NAV_ITEMS = [
  { suffix: "/dashboard", label: "Dashboard" },
  { suffix: "/customers", label: "Customers" },
  { suffix: "/playbooks", label: "Playbooks" },
  { suffix: "/experiments", label: "Experiments" },
] as const;

function navIcon(suffix: string) {
  switch (suffix) {
    case "/dashboard":
      return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "/customers":
      return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "/experiments":
      return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M9 3h6v7l5 9H4l5-9V3z" />
          <path d="M10 3h4" />
        </svg>
      );
    default:
      return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );
  }
}

export function SidebarNav({ base = "" }: { base?: AppBase }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map((item) => {
        const href = appPath(base, item.suffix);
        const active =
          pathname === href ||
          (item.suffix !== "/dashboard" && pathname.startsWith(`${href}/`)) ||
          (item.suffix !== "/dashboard" && pathname === href);

        return (
          <Link
            key={item.suffix}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-[var(--radius)] px-2.5 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
              active
                ? "bg-[var(--brand-light)] text-[var(--brand-dark)] shadow-[inset_0_0_0_1px_rgb(99_102_241_/_0.12)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--brand)]"
                : "text-[var(--muted)] hover:bg-[var(--brand-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className={active ? "text-[var(--brand)]" : "text-[var(--muted)]"}>
              {navIcon(item.suffix)}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
