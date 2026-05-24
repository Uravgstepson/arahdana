"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { LoadingState } from "@/components/AppState";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { AutoPriceRefresh } from "@/components/AutoPriceRefresh";
import { BrandMark } from "@/components/BrandMark";
import { NotificationManager } from "@/components/NotificationManager";
import { Sidebar } from "@/components/Sidebar";
import { ToastViewport } from "@/components/ToastViewport";
import { useAuth } from "@/components/AuthProvider";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { signOut } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils/format";
import { usePerformanceMode } from "@/lib/utils/performanceMode";
import {
  normalizeLanguage,
  translate,
  type TranslationKey,
} from "@/lib/i18n";

const titleKeys: Record<string, TranslationKey> = {
  "/dashboard": "home",
  "/portfolio": "portfolio",
  "/alerts": "alerts",
  "/reports": "reports",
  "/notifications": "notifications",
  "/analyzer": "analysis",
  "/watchlist": "watch",
  "/pantau": "watch",
  "/settings": "settings",
  "/profile": "profile",
  "/journal": "journal",
};

const fallbackTitles: Record<string, string> = {
  "/goals": "Tujuan",
  "/goals/new": "Tujuan Baru",
  "/goals/edit": "Edit Tujuan",
  "/market": "Market",
  "/market/search": "Market Search",
  "/market/compare": "Compare",
  "/market/watchlist/add": "Tambah Pantau",
  "/market-insight": "Market Insight",
  "/market-prices": "Harga Pasar",
  "/analysis/new": "Analysis Setup",
  "/analysis/result": "Analysis Result",
  "/porto/add": "Tambah Porto",
  "/porto/edit": "Edit Porto",
  "/porto/import": "Import Porto",
  "/porto/manage": "Manage Porto",
  "/review": "Review",
  "/integrations": "Integrasi",
  "/onboarding": "Onboarding",
  "/changelog": "Changelog",
  "/feedback": "Feedback",
  "/beta-test": "Beta Test",
  "/login": "Login",
  "/register": "Register",
  "/auth/confirm": "Konfirmasi Email",
  "/home": "Home",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/beta" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/auth/confirm";
  const language = useLanguagePreference();
  const title = titleKeys[pathname]
    ? translate(language, titleKeys[pathname])
    : fallbackTitles[pathname] ?? "ArahDana";
  const unreadCount = useUnreadNotificationCount();
  const performanceProfile = usePerformanceMode();
  const dynamicTitleItems = useDynamicTitleItems(title);
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.performanceMode = performanceProfile.mode;
    root.dataset.reduceBlur = performanceProfile.reduceBlurEffects
      ? "true"
      : "false";
    root.dataset.simplifyTooltips = performanceProfile.simplifyTooltips
      ? "true"
      : "false";
  }, [performanceProfile]);

  useEffect(() => {
    if (
      isPublicRoute ||
      !auth.isConfigured ||
      auth.isLoading ||
      auth.user
    ) {
      return;
    }

    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", pathname);
    router.replace(`${loginUrl.pathname}${loginUrl.search}`);
  }, [
    auth.isConfigured,
    auth.isLoading,
    auth.user,
    isPublicRoute,
    pathname,
    router,
  ]);

  if (isPublicRoute) {
    return (
      <div className="min-h-screen text-stone-950">
        <ToastViewport />
        {children}
      </div>
    );
  }

  if (auth.isConfigured && (auth.isLoading || !auth.user)) {
    return (
      <div className="min-h-screen text-stone-950">
        <ToastViewport />
        <main className="relative mx-auto min-h-screen w-full max-w-3xl px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
          <LoadingState
            title="Memuat akun"
            message="Menyiapkan sesi dan data akun kamu."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-950">
      <Sidebar />
      <AutoPriceRefresh />
      <NotificationManager />
      <ToastViewport />
      <main className="relative mx-auto min-h-screen w-full min-w-0 max-w-7xl overflow-x-clip px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+6rem)] sm:px-5 lg:pb-8 lg:pl-32 lg:pr-6 lg:pt-0">
        <div className="top-atmosphere" aria-hidden="true" />
        <header className="app-header fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.9rem)] z-50 h-12 pointer-events-none sm:inset-x-5 lg:static lg:mb-8 lg:grid lg:h-auto lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-2.5 lg:pb-7 lg:pt-7">
          <div className="app-header-title-zone pointer-events-auto fixed left-4 top-[calc(env(safe-area-inset-top)+0.9rem)] z-10 flex h-12 w-[min(12.75rem,calc(100vw-8rem))] items-center justify-center px-3 sm:left-5 sm:w-[14rem] sm:px-4 lg:static lg:w-full lg:max-w-[14rem]">
            <DynamicTitleCapsule items={dynamicTitleItems} />
          </div>
          <div className="app-header-actions pointer-events-auto fixed right-4 top-[calc(env(safe-area-inset-top)+0.9rem)] z-10 flex h-12 w-[5.75rem] shrink-0 items-center justify-center gap-1 p-1 sm:right-5 lg:static lg:w-auto">
            <NotificationBellButton unreadCount={unreadCount} />
            <ProfileButton />
          </div>
        </header>
        <div key={pathname} className="page-flow relative z-0">
          {children}
        </div>
        <div className="relative z-0 mt-5 grid gap-3">
          <OnboardingPrompt />
          <Disclaimer />
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

function DynamicTitleCapsule({
  items,
}: {
  items: Array<{ kind: "text" | "brand"; label: string }>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setActiveIndex(0), 0);
    return () => window.clearTimeout(timeoutId);
  }, [items]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [items.length]);

  return (
    <div className="dynamic-title-track" aria-label={items[activeIndex]?.label ?? "ArahDana"}>
      {items.map((item, index) => (
        <span
          key={`${item.kind}-${item.label}-${index}`}
          className="dynamic-title-item"
          data-active={index === activeIndex}
          aria-hidden={index !== activeIndex}
        >
          {item.kind === "brand" ? (
            <BrandMark variant="full" className="h-7 w-32 rounded-none p-0" />
          ) : (
            <span className="app-header-title w-full truncate text-center text-[1.16rem] font-bold leading-none tracking-tight sm:text-[1.35rem]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function NotificationBellButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      className={cn(
        "relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm ring-1 transition-all",
        unreadCount > 0
          ? "bg-emerald-400/16 text-emerald-200 ring-emerald-300/24 hover:bg-emerald-400/22"
          : "bg-white/6 text-slate-100 ring-white/10 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
      )}
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
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[0.65rem] font-bold text-stone-950 ring-2 ring-slate-950/80">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function ProfileButton() {
  const { profile, refreshAuth, user } = useAuth();
  const router = useRouter();
  const language = useLanguagePreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(
    profile?.full_name ?? profile?.display_name,
    user?.email,
  );
  const email = profile?.email || user?.email || "Data aman";
  const initials = getInitials(displayName);
  const avatarUrl = profile?.avatar_url || getAvatarUrl(user?.user_metadata);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleLogout() {
    if (!user) return;
    setIsBusy(true);
    try {
      await signOut();
      await refreshAuth();
      setIsOpen(false);
      router.replace("/login");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="profile-trigger grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/6 text-sm font-bold text-slate-100 ring-1 ring-white/10 active:bg-white/12"
        aria-label="Buka menu profil"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>
      {isOpen ? (
        <div className="profile-popover absolute right-0 top-[calc(100%+0.75rem)] z-[100] w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-white/70 bg-white/95 p-4 text-stone-950 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-3xl">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-50 text-base font-bold text-emerald-800 ring-1 ring-emerald-100">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                {email}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <ProfileMenuLink href="/profile" label={translate(language, "profile")} onClick={() => setIsOpen(false)} />
            <ProfileMenuLink href="/settings" label={translate(language, "settings")} onClick={() => setIsOpen(false)} />
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isBusy}
                className="profile-menu-action min-h-11 rounded-[1rem] bg-rose-50 px-4 text-left text-sm font-semibold text-rose-700 ring-1 ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Logout..." : translate(language, "logout")}
              </button>
            ) : (
              <ProfileMenuLink href="/login" label={translate(language, "login")} onClick={() => setIsOpen(false)} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="profile-menu-action flex min-h-11 items-center rounded-[1rem] bg-stone-100 px-4 text-sm font-semibold text-stone-950"
    >
      {label}
    </Link>
  );
}

function getDisplayName(displayName?: string | null, email?: string | null) {
  const profileName = displayName?.trim();
  if (profileName) return profileName;

  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) return titleCase(emailName);

  return "Investor";
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "I";
}

function getAvatarUrl(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const record = metadata as Record<string, unknown>;
  const avatar =
    typeof record.avatar_url === "string"
      ? record.avatar_url
      : typeof record.picture === "string"
        ? record.picture
        : "";
  return avatar;
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

function useDynamicTitleItems(title: string) {
  return useMemo(() => {
    return [
      { kind: "text" as const, label: title },
      { kind: "text" as const, label: "Smart Finance" },
      { kind: "brand" as const, label: "arah dana" },
    ];
  }, [title]);
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

function readUnreadNotificationCount() {
  if (typeof window === "undefined") return 0;
  return (localArahDanaStorage.readNotifications() ?? []).filter(
    (item) => !item.readAt,
  ).length;
}
