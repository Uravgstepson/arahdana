"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { clampNumber, cn } from "@/lib/utils/format";

const nav = [
  { href: "/dashboard", label: "Dasbor", shortLabel: "Dasbor", icon: "DB" },
  { href: "/portfolio", label: "Portofolio", shortLabel: "Porto", icon: "PF" },
  { href: "/analyzer", label: "Analisis", shortLabel: "Analisis", icon: "AN" },
  { href: "/watchlist", label: "Pantauan", shortLabel: "Pantau", icon: "WL" },
  { href: "/market-prices", label: "Harga Pasar", shortLabel: "Pasar", icon: "MK" },
  { href: "/settings", label: "Pengaturan", shortLabel: "Setelan", icon: "ST" },
  { href: "/integrations", label: "Integrasi", shortLabel: "Integrasi", icon: "IN" },
];

const primaryNav = nav.slice(0, 3);
const secondaryNav = nav.slice(3);

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMoreNavOpen, setIsMoreNavOpen] = useState(false);
  const [isDraggingPrimaryNav, setIsDraggingPrimaryNav] = useState(false);
  const [previewPrimaryNav, setPreviewPrimaryNav] = useState<{
    href?: string;
    position: number;
  } | null>(null);
  const primaryNavRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const primaryDragStartX = useRef<number | null>(null);
  const primaryDragMoved = useRef(false);
  const suppressPrimaryClick = useRef(false);

  const activePrimaryIndex = primaryNav.findIndex((item) => item.href === pathname);
  const previewPosition =
    previewPrimaryNav && previewPrimaryNav.href !== pathname
      ? previewPrimaryNav.position
      : null;
  const indicatorPosition =
    previewPosition ?? (activePrimaryIndex >= 0 ? activePrimaryIndex : null);

  function rememberTouchStart(event: React.TouchEvent) {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startY = touchStartY.current;
    touchStartY.current = null;
    const endY = event.changedTouches[0]?.clientY;
    if (startY === null || endY === undefined) return;

    const travel = endY - startY;
    if (travel < -24) setIsMoreNavOpen(true);
    if (travel > 24) setIsMoreNavOpen(false);
  }

  function getPrimaryNavPosition(clientX: number) {
    const navElement = primaryNavRef.current;
    if (!navElement) return { index: activePrimaryIndex >= 0 ? activePrimaryIndex : 0, position: 0 };

    const rect = navElement.getBoundingClientRect();
    const horizontalPadding = 6;
    const segmentWidth = Math.max(1, (rect.width - horizontalPadding * 2) / primaryNav.length);
    const centeredX = clientX - rect.left - horizontalPadding - segmentWidth / 2;
    const position = clampNumber(centeredX / segmentWidth, 0, primaryNav.length - 1);
    const index = Math.round(position);

    return { index, position };
  }

  function handlePrimaryPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    // If the user tapped/clicked a nav button, let the button click win.
    // Capturing the pointer on the container can swallow the click on mobile.
    const target = event.target as HTMLElement | null;
    if (target?.closest?.("[data-primary-nav-item='true']")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    primaryDragStartX.current = event.clientX;
    primaryDragMoved.current = false;
    setIsDraggingPrimaryNav(true);
    setPreviewPrimaryNav({ position: getPrimaryNavPosition(event.clientX).position });
  }

  function handlePrimaryPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPrimaryNav) return;

    const startX = primaryDragStartX.current;
    if (startX !== null && Math.abs(event.clientX - startX) > 6) {
      primaryDragMoved.current = true;
    }

    setPreviewPrimaryNav({ position: getPrimaryNavPosition(event.clientX).position });
  }

  function handlePrimaryPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPrimaryNav) return;

    const { index } = getPrimaryNavPosition(event.clientX);
    const wasDragging = primaryDragMoved.current;
    primaryDragStartX.current = null;
    primaryDragMoved.current = false;
    setIsDraggingPrimaryNav(false);

    if (!wasDragging) {
      setPreviewPrimaryNav(null);
      return;
    }

    suppressPrimaryClick.current = true;
    const item = primaryNav[index];
    if (!item) return;

    setPreviewPrimaryNav({ href: item.href, position: index });
    router.push(item.href);
  }

  function handlePrimaryNavClick(index: number) {
    if (suppressPrimaryClick.current) {
      suppressPrimaryClick.current = false;
      return;
    }

    const item = primaryNav[index];
    if (!item) return;

    setPreviewPrimaryNav({ href: item.href, position: index });
    router.push(item.href);
  }

  return (
    <aside className="motion-nav pointer-events-none fixed inset-x-3 bottom-3 z-50 lg:pointer-events-auto lg:inset-y-6 lg:left-5 lg:right-auto lg:bottom-auto lg:w-64 lg:rounded-[2rem] lg:border lg:border-white/30 lg:bg-white/54 lg:px-4 lg:py-5 lg:shadow-sm lg:backdrop-blur-3xl">
      <Link href="/dashboard" className="hidden items-center gap-3 lg:flex">
        <span className="grid h-12 w-12 place-items-center rounded-[1.35rem] bg-emerald-700 text-lg font-bold text-white shadow-sm">
          AD
        </span>
        <div>
          <p className="text-lg font-semibold text-stone-950">ArahDana</p>
          <p className="text-xs text-stone-500">Pendukung keputusan</p>
        </div>
      </Link>

      <nav className="hidden lg:mt-8 lg:flex lg:flex-col lg:gap-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
              className={cn(
                "motion-link flex min-w-0 items-center justify-start gap-3 rounded-[1.4rem] px-3 py-3 text-sm font-semibold transition",
              pathname === item.href
                ? "bg-white/80 text-stone-950 shadow-sm"
                : "text-stone-500 hover:bg-white/60 hover:text-stone-950",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-[0.68rem] font-bold",
                pathname === item.href
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-black/[0.04]",
              )}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pointer-events-auto mx-auto max-w-[25rem] lg:hidden">
        <div
          className="mb-2"
          onTouchStart={rememberTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isMoreNavOpen ? (
            <nav
              aria-label="Navigasi lainnya"
              className="motion-drawer no-scrollbar flex snap-x gap-1.5 overflow-x-auto rounded-full border border-white/35 bg-white/38 p-1 shadow-[0_12px_36px_rgba(15,23,42,0.12)] backdrop-blur-3xl"
            >
              {secondaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreNavOpen(false)}
                  className={cn(
                    "motion-link flex min-h-8 min-w-[5.45rem] snap-start items-center justify-center rounded-full px-3 text-[0.72rem] font-semibold",
                    pathname === item.href
                      ? "bg-white/92 text-stone-950 shadow-[0_5px_16px_rgba(15,23,42,0.14)] ring-1 ring-white/80"
                      : "text-stone-600 hover:bg-white/54",
                  )}
                >
                  {item.shortLabel}
                </Link>
              ))}
            </nav>
          ) : (
            <button
              type="button"
              aria-label="Tampilkan navigasi lainnya"
              aria-expanded={isMoreNavOpen}
              onClick={() => setIsMoreNavOpen(true)}
              className="motion-handle mx-auto flex h-6 w-24 items-center justify-center rounded-full border border-white/35 bg-white/38 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-3xl"
            >
              <span className="h-1 w-12 rounded-full bg-stone-400/70" />
            </button>
          )}
        </div>
        <nav
          aria-label="Navigasi utama"
          className="motion-capsule relative grid grid-cols-3 rounded-full border border-white/40 bg-white/68 p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-3xl"
          ref={primaryNavRef}
          onPointerDown={handlePrimaryPointerDown}
          onPointerMove={handlePrimaryPointerMove}
          onPointerUp={handlePrimaryPointerUp}
          onPointerCancel={() => {
            primaryDragStartX.current = null;
            primaryDragMoved.current = false;
            setIsDraggingPrimaryNav(false);
          }}
        >
          {indicatorPosition !== null ? (
            <span
              className={cn(
                "pointer-events-none absolute bottom-1.5 top-1.5 rounded-full bg-stone-950 shadow-[0_8px_24px_rgba(15,23,42,0.22)]",
                isDraggingPrimaryNav
                  ? "transition-none"
                  : "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              )}
              style={{
                left: "0.375rem",
                width: "calc((100% - 0.75rem) / 3)",
                transform: `translateX(${indicatorPosition * 100}%)`,
              }}
            />
          ) : null}
          {primaryNav.map((item, index) => {
            const isActive =
              (previewPosition === null && activePrimaryIndex === index) ||
              Math.round(indicatorPosition ?? -1) === index;

            return (
              <button
                key={item.href}
                type="button"
                data-primary-nav-item="true"
                onClick={() => handlePrimaryNavClick(index)}
                className={cn(
                  "motion-link relative z-10 flex min-h-12 min-w-0 items-center justify-center rounded-full px-2 text-[0.78rem] font-semibold transition",
                  isActive
                    ? "text-white"
                    : "text-stone-500 hover:bg-white/56 hover:text-stone-950",
                )}
              >
                <span className="truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 hidden rounded-[1.6rem] bg-white/48 p-4 text-xs leading-5 text-stone-500 ring-1 ring-white/60 lg:block">
        Impor portofolio semi-otomatis tersimpan lokal. Kredensial bank,
        e-wallet, atau Bibit tidak diminta maupun disimpan.
      </div>
    </aside>
  );
}
