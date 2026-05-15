"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { cn } from "@/lib/utils/format";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: "home" | "portfolio" | "analyzer" | "watchlist" | "settings" | "market" | "integrations";
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", shortLabel: "Home", icon: "home" },
  { href: "/portfolio", label: "Portofolio", shortLabel: "Porto", icon: "portfolio" },
  { href: "/analyzer", label: "Analisis", shortLabel: "Analisis", icon: "analyzer" },
  { href: "/watchlist", label: "Pantauan", shortLabel: "Pantau", icon: "watchlist" },
  { href: "/settings", label: "Profil", shortLabel: "Saya", icon: "settings" },
];

const desktopExtras: NavItem[] = [
  { href: "/market-prices", label: "Harga Pasar", shortLabel: "Pasar", icon: "market" },
  { href: "/integrations", label: "Integrasi", shortLabel: "Integrasi", icon: "integrations" },
];

export function Sidebar() {
  const pathname = usePathname();
  const desktopNav = [...primaryNav, ...desktopExtras];

  return (
    <>
      <aside className="motion-nav fixed inset-y-5 left-5 z-50 hidden w-[5.5rem] flex-col items-center rounded-[1.8rem] border border-white/45 bg-white/58 px-2 py-4 shadow-sm backdrop-blur-3xl lg:flex">
        <Link
          href="/dashboard"
          className="grid h-12 w-12 place-items-center rounded-[1.2rem] bg-emerald-700 text-sm font-bold text-white shadow-sm"
          aria-label="ArahDana dashboard"
        >
          AD
        </Link>

        <nav className="mt-7 flex flex-1 flex-col items-center gap-2" aria-label="Navigasi utama">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "motion-link group grid h-12 w-12 place-items-center rounded-[1.15rem] text-stone-500",
                pathname === item.href
                  ? "bg-stone-950 text-white shadow-sm"
                  : "hover:bg-white/72 hover:text-stone-950",
              )}
            >
              <NavGlyph icon={item.icon} />
            </Link>
          ))}
        </nav>

        <p className="writing-vertical hidden text-[0.62rem] font-semibold tracking-[0.18em] text-stone-400 xl:block">
          {APP_VERSION_LABEL}
        </p>
      </aside>

      <nav
        aria-label="Navigasi utama"
        className="motion-nav fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[1.6rem] border border-white/55 bg-white/76 p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-3xl lg:hidden"
      >
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "motion-link flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 text-[0.68rem] font-semibold",
                isActive
                  ? "bg-stone-950 text-white shadow-sm"
                  : "text-stone-500 active:bg-stone-100",
              )}
            >
              <NavGlyph icon={item.icon} />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavGlyph({ icon }: { icon: NavItem["icon"] }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      {icon === "home" ? (
        <>
          <path {...common} d="M4 10.5 12 4l8 6.5" />
          <path {...common} d="M6.5 10v9h11v-9" />
        </>
      ) : null}
      {icon === "portfolio" ? (
        <>
          <path {...common} d="M5 8.5h14v10H5z" />
          <path {...common} d="M9 8.5V6h6v2.5" />
          <path {...common} d="M8 14h8" />
        </>
      ) : null}
      {icon === "analyzer" ? (
        <>
          <path {...common} d="M5 18V8" />
          <path {...common} d="M10 18V5" />
          <path {...common} d="M15 18v-7" />
          <path {...common} d="M20 18V9" />
        </>
      ) : null}
      {icon === "watchlist" ? (
        <>
          <path {...common} d="M5 6h14" />
          <path {...common} d="M5 12h14" />
          <path {...common} d="M5 18h9" />
          <path {...common} d="m17 17 1.5 1.5L22 15" />
        </>
      ) : null}
      {icon === "settings" ? (
        <>
          <circle {...common} cx="12" cy="8" r="3" />
          <path {...common} d="M5.5 20c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
        </>
      ) : null}
      {icon === "market" ? (
        <>
          <path {...common} d="M4 18h16" />
          <path {...common} d="m5 14 4-4 3 3 6-7" />
        </>
      ) : null}
      {icon === "integrations" ? (
        <>
          <path {...common} d="M8 8h8v8H8z" />
          <path {...common} d="M4 12h4" />
          <path {...common} d="M16 12h4" />
          <path {...common} d="M12 4v4" />
          <path {...common} d="M12 16v4" />
        </>
      ) : null}
    </svg>
  );
}
