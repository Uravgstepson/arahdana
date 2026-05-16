"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import {
  normalizeLanguage,
  translate,
  type TranslationKey,
} from "@/lib/i18n";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { cn } from "@/lib/utils/format";

type IconName =
  | "alerts"
  | "analyzer"
  | "goals"
  | "health"
  | "home"
  | "insight"
  | "journal"
  | "market"
  | "menu"
  | "portfolio"
  | "reports"
  | "watchlist";

type FeatureItem = {
  href: string;
  label: string;
  labelKey?: TranslationKey;
  helper: string;
  icon: IconName;
};

const featureMenu: FeatureItem[] = [
  {
    href: "/portfolio",
    label: "Porto",
    labelKey: "portfolio",
    helper: "Holding dan alokasi",
    icon: "portfolio",
  },
  {
    href: "/watchlist",
    label: "Pantau",
    labelKey: "watch",
    helper: "Watchlist dan target beli",
    icon: "watchlist",
  },
  {
    href: "/market-prices",
    label: "Harga Pasar",
    helper: "Data harga dan sumber pasar",
    icon: "market",
  },
  {
    href: "/goals",
    label: "Tujuan / DCA Planner",
    helper: "Rencana kontribusi berkala",
    icon: "goals",
  },
  {
    href: "/alerts",
    label: "Alerts",
    labelKey: "alerts",
    helper: "Sinyal risiko dan pengingat",
    icon: "alerts",
  },
  {
    href: "/journal",
    label: "Journal",
    labelKey: "journal",
    helper: "Catatan keputusan investasi",
    icon: "journal",
  },
  {
    href: "/reports",
    label: "Reports",
    labelKey: "reports",
    helper: "Ringkasan review berkala",
    icon: "reports",
  },
  {
    href: "/portfolio#health-score",
    label: "Health Score",
    labelKey: "healthScore",
    helper: "Kesehatan portofolio",
    icon: "health",
  },
  {
    href: "/market-insight",
    label: "Market Insight",
    helper: "Konteks pasar Indonesia",
    icon: "insight",
  },
];

const menuRoutes = new Set(
  featureMenu.map((item) => item.href.split("#")[0]).filter(Boolean),
);

export function Sidebar() {
  const pathname = usePathname();
  const language = useLanguagePreference();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBottomHidden, setIsBottomHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isFeatureActive = menuRoutes.has(pathname);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      if (scrollFrame.current !== null) return;

      scrollFrame.current = window.requestAnimationFrame(() => {
        scrollFrame.current = null;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (currentScrollY < 48 || isMenuOpen) {
          setIsBottomHidden(false);
        } else if (delta > 10) {
          setIsBottomHidden(true);
        } else if (delta < -10) {
          setIsBottomHidden(false);
        }

        lastScrollY.current = currentScrollY;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrame.current !== null) {
        window.cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = null;
      }
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="motion-nav fixed inset-y-6 left-5 z-50 hidden w-[5.25rem] flex-col items-center rounded-[1.65rem] border border-white/50 bg-white/70 px-2 py-4 shadow-sm backdrop-blur-3xl lg:flex">
        <nav className="flex flex-1 flex-col items-center justify-center gap-3" aria-label="Navigasi utama">
          <RailLink
            href="/dashboard"
            label={translate(language, "home")}
            icon="home"
            active={pathname === "/dashboard"}
          />
          <RailButton
            label="Menu"
            icon="menu"
            active={isFeatureActive || isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          />
          <RailLink
            href="/analyzer"
            label={translate(language, "analysis")}
            icon="analyzer"
            active={pathname === "/analyzer"}
          />
        </nav>
        <p className="writing-vertical hidden text-[0.62rem] font-semibold tracking-[0.18em] text-stone-400 xl:block">
          {APP_VERSION_LABEL}
        </p>
      </aside>

      <nav
        aria-label="Navigasi utama"
        className={cn(
          "motion-nav fixed inset-x-4 bottom-4 z-50 grid grid-cols-3 rounded-[1.5rem] border border-white/60 bg-white/86 p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-3xl transition-all duration-300 ease-out lg:hidden",
          isBottomHidden
            ? "translate-y-28 opacity-80"
            : "translate-y-0 opacity-100",
        )}
      >
        <BottomLink
          href="/dashboard"
          label={translate(language, "home")}
          icon="home"
          active={pathname === "/dashboard"}
        />
        <BottomButton
          label="Menu"
          icon="menu"
          active={isFeatureActive || isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        />
        <BottomLink
          href="/analyzer"
          label={translate(language, "analysis")}
          icon="analyzer"
          active={pathname === "/analyzer"}
        />
      </nav>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Menu fitur">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/36 backdrop-blur-[2px]"
            aria-label="Tutup menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            className="motion-drawer absolute inset-x-0 bottom-0 mx-auto max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-white/60 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(15,23,42,0.22)] backdrop-blur-3xl lg:bottom-6 lg:rounded-[2rem]"
            onTouchStart={(event) => {
              touchStartY.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const startY = touchStartY.current;
              touchStartY.current = null;
              const endY = event.changedTouches[0]?.clientY;
              if (startY !== null && endY && endY - startY > 72) {
                setIsMenuOpen(false);
              }
            }}
          >
            <div className="motion-handle flex justify-center py-1">
              <span className="h-1.5 w-11 rounded-full bg-stone-300" />
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                Menu
              </h2>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600"
                aria-label="Tutup menu"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  x
                </span>
              </button>
            </div>
            <div className="mt-4 grid max-h-[62vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {featureMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "motion-link flex min-h-[4.8rem] items-center gap-3 rounded-[1.35rem] px-4 text-left",
                    pathname === item.href.split("#")[0]
                      ? "bg-stone-950 text-white"
                      : "bg-stone-100 text-stone-950 hover:bg-white",
                  )}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-white/72 text-emerald-700 ring-1 ring-stone-200">
                    <NavGlyph icon={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {item.labelKey ? translate(language, item.labelKey) : item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-stone-500">
                      {item.helper}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RailLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={railClass(active)}
    >
      <NavGlyph icon={icon} />
    </Link>
  );
}

function RailButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={railClass(active)}
    >
      <NavGlyph icon={icon} />
    </button>
  );
}

function BottomLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={bottomClass(active)}
    >
      <NavGlyph icon={icon} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function BottomButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={bottomClass(active)}
    >
      <NavGlyph icon={icon} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function railClass(active: boolean) {
  return cn(
    "motion-link grid h-12 w-12 place-items-center rounded-[1.1rem]",
    active
      ? "bg-stone-950 text-white shadow-sm"
      : "text-stone-500 hover:bg-white/72 hover:text-stone-950",
  );
}

function bottomClass(active: boolean) {
  return cn(
    "motion-link flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] px-1 text-[0.7rem] font-semibold",
    active
      ? "bg-stone-950 text-white shadow-sm"
      : "text-stone-500 active:bg-stone-100",
  );
}

function useLanguagePreference() {
  const [language, setLanguage] = useState(() => readLanguagePreference());

  useEffect(() => {
    function handleUpdate() {
      setLanguage(readLanguagePreference());
    }

    window.addEventListener("arahdana:settings-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("arahdana:settings-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return language;
}

function readLanguagePreference() {
  return normalizeLanguage(localArahDanaStorage.readSettings()?.language);
}

function NavGlyph({ icon }: { icon: IconName }) {
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
      {icon === "menu" ? (
        <>
          <path {...common} d="M5 7h14" />
          <path {...common} d="M5 12h14" />
          <path {...common} d="M5 17h14" />
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
      {icon === "insight" ? (
        <>
          <path {...common} d="M4 18h16" />
          <path {...common} d="M6 14l4-4 3 3 5-7" />
          <path {...common} d="M6 6h.01" />
          <path {...common} d="M10 6h.01" />
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
      {icon === "market" ? (
        <>
          <path {...common} d="M4 18h16" />
          <path {...common} d="m5 14 4-4 3 3 6-7" />
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
      {icon === "journal" ? (
        <>
          <path {...common} d="M6 5h12v14H6z" />
          <path {...common} d="M9 9h6" />
          <path {...common} d="M9 13h4" />
        </>
      ) : null}
      {icon === "health" ? (
        <>
          <path {...common} d="M12 20s7-4.5 7-10a4 4 0 0 0-7-2.6A4 4 0 0 0 5 10c0 5.5 7 10 7 10Z" />
          <path {...common} d="M9 12h6" />
          <path {...common} d="M12 9v6" />
        </>
      ) : null}
    </svg>
  );
}
