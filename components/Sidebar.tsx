"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AboutArahDana } from "@/components/AboutArahDana";
import { BrandMark } from "@/components/BrandMark";
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
    href: "/analyzer",
    label: "Analysis",
    labelKey: "analysis",
    helper: "Analisis aset dan skor keputusan",
    icon: "analyzer",
  },
  {
    href: "/review",
    label: "Review",
    helper: "Jurnal, laporan, health score",
    icon: "reports",
  },
  {
    href: "/alerts",
    label: "Alerts",
    labelKey: "alerts",
    helper: "Sinyal risiko dan pengingat",
    icon: "alerts",
  },
];

const menuRouteBases = ["/analyzer", "/analysis", "/review", "/alerts"];
export function Sidebar() {
  const pathname = usePathname();
  const language = useLanguagePreference();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBottomHidden, setIsBottomHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const idleRevealTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const bottomNavRef = useRef<HTMLElement | null>(null);
  const [drawerDragY, setDrawerDragY] = useState(0);
  const isMenuActive = menuRouteBases.some((base) => isRouteActive(pathname, base));
  const isPortfolioActive =
    isRouteActive(pathname, "/portfolio") || isRouteActive(pathname, "/porto");
  const isMarketActive =
    isRouteActive(pathname, "/market") ||
    isRouteActive(pathname, "/market-insight") ||
    isRouteActive(pathname, "/market-prices");
  const portfolioLabel = language === "id" ? "Portofolio" : "Portfolio";

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function clearIdleReveal() {
      if (idleRevealTimer.current !== null) {
        window.clearTimeout(idleRevealTimer.current);
        idleRevealTimer.current = null;
      }
    }

    function revealBottomNav() {
      clearIdleReveal();
      setIsBottomHidden(false);
    }

    function scheduleIdleReveal() {
      clearIdleReveal();
      idleRevealTimer.current = window.setTimeout(() => {
        setIsBottomHidden(false);
        idleRevealTimer.current = null;
      }, 10_000);
    }

    function handleTouchStart(event: TouchEvent | PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        bottomNavRef.current?.contains(target)
      ) {
        revealBottomNav();
        return;
      }

      if (isMenuOpen || isNearPageTop() || isAtPageBottom()) {
        revealBottomNav();
        return;
      }

      setIsBottomHidden(true);
      scheduleIdleReveal();
    }

    function handleScroll() {
      if (scrollFrame.current !== null) return;

      scrollFrame.current = window.requestAnimationFrame(() => {
        scrollFrame.current = null;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (isMenuOpen || isNearPageTop() || isAtPageBottom()) {
          revealBottomNav();
        } else if (delta > 10) {
          setIsBottomHidden(true);
          scheduleIdleReveal();
        } else if (delta < -10) {
          setIsBottomHidden(false);
          scheduleIdleReveal();
        }

        lastScrollY.current = currentScrollY;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("pointerdown", handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("pointerdown", handleTouchStart);
      clearIdleReveal();
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
    const timeoutId = window.setTimeout(() => setIsMenuOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return (
    <>
      <aside className="motion-nav fixed inset-y-6 left-5 z-50 hidden w-[5rem] flex-col items-center rounded-[1.45rem] border border-white/12 bg-stone-950/68 px-2 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-[18px] lg:flex">
        <BrandMark variant="icon" className="h-10 w-10 rounded-[1rem] bg-white/10 ring-1 ring-white/12" />
        <nav className="flex flex-1 flex-col items-center justify-center gap-2.5" aria-label="Navigasi utama">
          <RailLink
            href="/dashboard"
            label={translate(language, "home")}
            icon="home"
            active={pathname === "/dashboard"}
          />
          <RailLink
            href="/portfolio"
            label={portfolioLabel}
            icon="portfolio"
            active={isPortfolioActive}
          />
          <RailLink
            href="/market"
            label="Market"
            icon="market"
            active={isMarketActive}
          />
          <RailButton
            label="Menu"
            icon="menu"
            active={isMenuActive || isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          />
        </nav>
        <p className="writing-vertical hidden text-[0.62rem] font-semibold tracking-[0.18em] text-stone-400 xl:block">
          {APP_VERSION_LABEL}
        </p>
      </aside>

      <nav
        ref={bottomNavRef}
        aria-label="Navigasi utama"
        className={cn(
          "motion-nav fixed inset-x-5 bottom-[calc(0.85rem+env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-md grid-cols-4 rounded-[1.35rem] border border-white/12 bg-stone-950/76 p-1 shadow-[0_18px_44px_rgba(15,23,42,0.22)] backdrop-blur-[18px] transition-all duration-300 ease-out lg:hidden",
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
        <BottomLink
          href="/portfolio"
          label={portfolioLabel}
          icon="portfolio"
          active={isPortfolioActive}
        />
        <BottomLink
          href="/market"
          label="Market"
          icon="market"
          active={isMarketActive}
        />
        <BottomButton
          label="Menu"
          icon="menu"
          active={isMenuActive || isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        />
      </nav>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Menu fitur">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/48 backdrop-blur-sm"
            aria-label="Tutup area menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            className="motion-drawer absolute inset-x-0 bottom-0 mx-auto max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-stone-600/20 bg-stone-950/95 p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_80px_rgba(15,23,42,0.32)] backdrop-blur-[18px] lg:bottom-6 lg:rounded-[2rem]"
            style={{
              transform: drawerDragY ? `translateY(${drawerDragY}px)` : undefined,
              transition: drawerDragY ? "none" : undefined,
            }}
            onTouchStart={(event) => {
              touchStartY.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchMove={(event) => {
              const startY = touchStartY.current;
              const currentY = event.touches[0]?.clientY;
              if (startY === null || currentY === undefined) return;
              setDrawerDragY(Math.max(0, Math.min(140, currentY - startY)));
            }}
            onTouchEnd={(event) => {
              const startY = touchStartY.current;
              touchStartY.current = null;
              const endY = event.changedTouches[0]?.clientY;
              if (startY !== null && endY && endY - startY > 72) {
                setIsMenuOpen(false);
              }
              setDrawerDragY(0);
            }}
          >
            <div className="motion-handle flex justify-center py-1">
              <span className="h-1.5 w-11 rounded-full bg-stone-400/30" />
            </div>
            <div className="mt-4 px-1">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Menu
              </h2>
            </div>
            <div className="mt-5 grid max-h-[62vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {featureMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "motion-link flex min-h-[4.8rem] items-center gap-3 rounded-[1.35rem] px-4 text-left transition-all 260ms cubic-bezier(0.16,1,0.3,1)",
                    isFeatureItemActive(pathname, item.href)
                      ? "bg-emerald-400/20 text-white ring-1 ring-emerald-500/30"
                      : "bg-stone-900/40 text-stone-100 hover:bg-stone-900/60",
                  )}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-500/30">
                    <NavGlyph icon={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {item.labelKey ? translate(language, item.labelKey) : item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-stone-400">
                      {item.helper}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <AboutArahDana compact />
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
      <span className="mt-0.5 max-w-full truncate text-[0.64rem] font-semibold leading-none">
        {label}
      </span>
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
      <span className="mt-0.5 max-w-full truncate text-[0.64rem] font-semibold leading-none">
        {label}
      </span>
    </button>
  );
}

function railClass(active: boolean) {
  return cn(
    "motion-link grid h-11 w-11 place-items-center rounded-[1rem] transition-all",
    active
      ? "bg-emerald-400 text-stone-950 shadow-[0_10px_24px_rgba(16,185,129,0.22)]"
      : "text-stone-400 hover:bg-white/10 hover:text-stone-100",
  );
}

function bottomClass(active: boolean) {
  return cn(
    "motion-link relative flex min-h-14 min-w-0 flex-col items-center justify-center rounded-[1rem] px-1 text-stone-400 outline-none transition-[color,transform,opacity] duration-200 ease-out before:absolute before:left-1/2 before:top-[1.42rem] before:h-9 before:w-9 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-emerald-300/12 before:opacity-0 before:blur-[2px] before:transition-opacity before:duration-200 before:ease-out after:absolute after:bottom-1.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-300 after:opacity-0 after:transition-opacity after:duration-200 after:ease-out hover:-translate-y-0.5 hover:text-emerald-200 hover:before:opacity-100 active:translate-y-0 active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-emerald-300/45 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950/70",
    active
      ? "text-emerald-200 before:opacity-100 after:opacity-100"
      : "hover:after:opacity-0",
  );
}

function isRouteActive(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function isFeatureItemActive(pathname: string, href: string) {
  const basePath = href.split("#")[0] ?? href;
  return (
    isRouteActive(pathname, basePath) ||
    (basePath === "/analyzer" && isRouteActive(pathname, "/analysis"))
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

function isNearPageTop() {
  return window.scrollY < 48;
}

function isAtPageBottom() {
  const viewportBottom = window.scrollY + window.innerHeight;
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  return documentHeight - viewportBottom < 32;
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
