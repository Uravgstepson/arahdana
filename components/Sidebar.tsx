"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { cn } from "@/lib/utils/format";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon:
    | "home"
    | "portfolio"
    | "goals"
    | "analyzer"
    | "watchlist"
    | "settings"
    | "market"
    | "integrations"
    | "info"
    | "notes"
    | "feedback"
    | "notifications"
    | "alerts"
    | "reports";
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", shortLabel: "Home", icon: "home" },
  { href: "/portfolio", label: "Portofolio", shortLabel: "Porto", icon: "portfolio" },
  { href: "/analyzer", label: "Analisis", shortLabel: "Analisis", icon: "analyzer" },
  { href: "/watchlist", label: "Pantauan", shortLabel: "Pantau", icon: "watchlist" },
  { href: "/settings", label: "Profil", shortLabel: "Saya", icon: "settings" },
];

const desktopExtras: NavItem[] = [
  { href: "/goals", label: "Goals/DCA", shortLabel: "DCA", icon: "goals" },
  { href: "/alerts", label: "Alerts", shortLabel: "Alerts", icon: "alerts" },
  { href: "/reports", label: "Reports", shortLabel: "Reports", icon: "reports" },
  { href: "/market-prices", label: "Harga Pasar", shortLabel: "Pasar", icon: "market" },
  { href: "/notifications", label: "Notifikasi", shortLabel: "Notif", icon: "notifications" },
  { href: "/integrations", label: "Integrasi", shortLabel: "Integrasi", icon: "integrations" },
  { href: "/onboarding", label: "Onboarding", shortLabel: "Mulai", icon: "info" },
  { href: "/changelog", label: "Changelog", shortLabel: "Rilis", icon: "notes" },
  { href: "/feedback", label: "Feedback", shortLabel: "Saran", icon: "feedback" },
];

export function Sidebar() {
  const pathname = usePathname();
  const desktopNav = [...primaryNav, ...desktopExtras];

  return (
    <>
      <aside className="motion-nav fixed inset-y-5 left-5 z-50 hidden w-[5.5rem] flex-col items-center rounded-[1.8rem] border border-white/45 bg-white/58 px-2 py-4 shadow-sm backdrop-blur-3xl lg:flex">
        <Link
          href="/dashboard"
          className="grid h-12 w-12 place-items-center overflow-hidden rounded-[1.2rem] bg-white shadow-sm ring-1 ring-emerald-100"
          aria-label="ArahDana dashboard"
        >
          <Image
            src="/icons/arahdana-logo.png"
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            priority
          />
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
      {icon === "goals" ? (
        <>
          <path {...common} d="M12 20s7-4.5 7-10a4 4 0 0 0-7-2.6A4 4 0 0 0 5 10c0 5.5 7 10 7 10Z" />
          <path {...common} d="M12 10v5" />
          <path {...common} d="M9.5 12.5h5" />
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
      {icon === "info" ? (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 11v5" />
          <path {...common} d="M12 8h.01" />
        </>
      ) : null}
      {icon === "notes" ? (
        <>
          <path {...common} d="M7 4h8l3 3v13H7z" />
          <path {...common} d="M15 4v4h4" />
          <path {...common} d="M10 12h5" />
          <path {...common} d="M10 16h5" />
        </>
      ) : null}
      {icon === "feedback" ? (
        <>
          <path {...common} d="M5 6h14v10H9l-4 4z" />
          <path {...common} d="M9 10h6" />
          <path {...common} d="M9 13h4" />
        </>
      ) : null}
      {icon === "notifications" ? (
        <>
          <path {...common} d="M7 10a5 5 0 0 1 10 0c0 4 2 5 2 5H5s2-1 2-5" />
          <path {...common} d="M10 18a2 2 0 0 0 4 0" />
        </>
      ) : null}
      {icon === "alerts" ? (
        <>
          <path {...common} d="M12 4v6" />
          <path {...common} d="M12 14h.01" />
          <path {...common} d="M5 20h14l-7-16z" />
        </>
      ) : null}
      {icon === "reports" ? (
        <>
          <path {...common} d="M7 4h10l2 2v14H7z" />
          <path {...common} d="M10 10h6" />
          <path {...common} d="M10 14h6" />
          <path {...common} d="M10 18h3" />
        </>
      ) : null}
    </svg>
  );
}
