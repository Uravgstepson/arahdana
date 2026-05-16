"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
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
  "/market-insight": "Market Insight",
  "/market-prices": "Harga Pasar",
  "/integrations": "Integrasi",
  "/onboarding": "Onboarding",
  "/changelog": "Changelog",
  "/feedback": "Feedback",
  "/beta-test": "Beta Test",
  "/login": "Login",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/" || pathname === "/beta";
  const language = useLanguagePreference();
  const title = titleKeys[pathname]
    ? translate(language, titleKeys[pathname])
    : fallbackTitles[pathname] ?? "ArahDana";
  const unreadCount = useUnreadNotificationCount();
  const performanceProfile = usePerformanceMode();

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
      <main className="relative mx-auto min-h-screen w-full max-w-7xl px-5 pb-28 pt-0 sm:px-6 lg:pb-8 lg:pl-32 lg:pr-6">
        <div className="top-atmosphere" aria-hidden="true" />
        <header className="motion-shell app-header sticky top-0 z-40 mb-6 flex items-center justify-between gap-3 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] sm:mb-7 lg:static lg:pb-7 lg:pt-6">
          <div className="app-header-title-zone relative z-10 flex min-h-[3.25rem] min-w-0 max-w-[calc(100%-7rem)] items-center px-4 py-2">
            <h1 className="app-header-title truncate text-[1.85rem] font-bold leading-none tracking-tight text-white sm:text-[2rem]">
              {title}
            </h1>
          </div>
          <div className="app-header-actions relative z-10 flex min-h-[3.25rem] shrink-0 items-center gap-2 p-1">
            <NotificationBellButton unreadCount={unreadCount} />
            <ProfileButton />
          </div>
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
      className={cn(
        "relative grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-sm ring-1",
        unreadCount > 0
          ? "bg-emerald-400 text-stone-950 ring-white/25 active:bg-emerald-300"
          : "bg-white/14 text-white ring-white/20 backdrop-blur-xl active:bg-white/22",
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
        <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-emerald-400 px-1 text-[0.65rem] font-bold text-stone-950 ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function ProfileButton() {
  const { profile, refreshAuth, user } = useAuth();
  const language = useLanguagePreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(profile?.display_name, user?.email);
  const email = profile?.email || user?.email || "Local mode";
  const initials = getInitials(displayName);
  const avatarUrl = getAvatarUrl(user?.user_metadata);

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
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="profile-trigger grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/14 text-sm font-bold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-xl active:bg-white/22"
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
