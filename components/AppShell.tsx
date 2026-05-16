"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Disclaimer } from "@/components/Disclaimer";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { NotificationManager } from "@/components/NotificationManager";
import { ToastViewport } from "@/components/ToastViewport";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { localArahDanaStorage } from "@/lib/storage/localStorage";

const titles: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/portfolio": "Portofolio",
  "/goals": "Goals/DCA",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/notifications": "Notifikasi",
  "/analyzer": "Analisis",
  "/watchlist": "Pantauan",
  "/market-prices": "Harga Pasar",
  "/settings": "Pengaturan",
  "/integrations": "Integrasi",
  "/onboarding": "Onboarding",
  "/changelog": "Changelog",
  "/feedback": "Feedback",
  "/beta-test": "Beta Test",
  "/profile": "Akun",
  "/login": "Login",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname === "/beta";
  const title = titles[pathname] ?? "ArahDana";
  const unreadCount = useUnreadNotificationCount();

  if (isPublicRoute) {
    return (
      <div className="min-h-screen text-stone-950">
        <ToastViewport />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-950">
      <Sidebar />
      <NotificationManager />
      <ToastViewport />
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-4 sm:px-5 lg:pb-8 lg:pl-32 lg:pr-6 lg:pt-6">
        <header className="motion-shell sticky top-3 z-40 mb-5 flex min-h-16 items-center justify-between gap-3 rounded-[1.5rem] border border-white/50 bg-white/72 px-3 py-2 shadow-sm backdrop-blur-3xl sm:static sm:rounded-[1.7rem] sm:px-4">
          <Link
            href="/dashboard"
            className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[1.05rem] bg-white shadow-sm ring-1 ring-emerald-100 lg:hidden"
            aria-label="ArahDana dashboard"
          >
            <Image
              src="/icons/arahdana-logo.png"
              alt=""
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:block">
              ArahDana
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
                {title}
              </h1>
              <Link
                href="/beta-test"
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-emerald-100"
              >
                ArahDana Beta
              </Link>
            </div>
          </div>
          <NotificationBellButton unreadCount={unreadCount} />
        </header>
        <OnboardingPrompt />
        <Disclaimer />
        <div key={pathname} className="page-flow relative z-0">
          {children}
        </div>
        <footer className="mt-8 flex items-center justify-center gap-3 text-center text-[0.68rem] font-medium tracking-[0.08em] text-stone-400 lg:hidden">
          <span>{APP_VERSION_LABEL}</span>
          <Link
            href="/beta-test"
            className="rounded-full bg-white px-3 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100"
          >
            Report bug
          </Link>
        </footer>
      </main>
    </div>
  );
}

function NotificationBellButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] bg-stone-950 text-white shadow-sm ring-1 ring-stone-900/10 active:bg-stone-800"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notifikasi belum dibaca`
          : "Buka notifikasi"
      }
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M7 10a5 5 0 0 1 10 0c0 4 2 5 2 5H5s2-1 2-5" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-emerald-400 px-1 text-[0.65rem] font-bold text-stone-950 ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function useUnreadNotificationCount() {
  const [count, setCount] = useState(() => readUnreadNotificationCount());

  useEffect(() => {
    function handleUpdate() {
      setCount(readUnreadNotificationCount());
    }

    window.addEventListener("arahdana:notifications-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("arahdana:notifications-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return useMemo(() => count, [count]);
}

function readUnreadNotificationCount() {
  if (typeof window === "undefined") return 0;
  return (localArahDanaStorage.readNotifications() ?? []).filter(
    (item) => !item.readAt,
  ).length;
}
