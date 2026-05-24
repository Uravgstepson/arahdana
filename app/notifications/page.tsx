"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  generateCalmNotifications,
  normalizeNotificationPreferences,
  notificationTypeLabels,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications/notificationSystem";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import type { AppNotification, NotificationType, UserSettings } from "@/lib/types/investment";

const badgeStyles: Record<NotificationType, string> = {
  reminder: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  risk: "bg-amber-50 text-amber-800 ring-amber-100",
  watchlist: "bg-sky-50 text-sky-700 ring-sky-100",
  goal: "bg-violet-50 text-violet-700 ring-violet-100",
  portfolio: "bg-stone-100 text-stone-700 ring-stone-200",
  market: "bg-blue-50 text-blue-700 ring-blue-100",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(
    () => readStoredNotifications(),
  );
  const [settings, setSettings] = useState<Partial<UserSettings>>(
    () => readStoredSettings(),
  );
  const [permission, setPermission] = useState(() => readBrowserPermission());

  useEffect(() => {
    function handleUpdate() {
      setNotifications(readStoredNotifications());
      setSettings(readStoredSettings());
      setPermission(readBrowserPermission());
    }

    window.addEventListener("arahdana:notifications-updated", handleUpdate);
    return () => window.removeEventListener("arahdana:notifications-updated", handleUpdate);
  }, []);

  const preferences = normalizeNotificationPreferences(settings?.notificationPreferences);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  function persist(next: AppNotification[]) {
    setNotifications(next);
    localArahDanaStorage.writeNotifications(next);
    window.dispatchEvent(new Event("arahdana:notifications-updated"));
  }

  function markAsRead(id: string) {
    persist(
      notifications.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
    );
  }

  function markAllAsRead() {
    const now = new Date().toISOString();
    persist(notifications.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    dispatchToast({ tone: "success", title: "Notifikasi ditandai terbaca" });
  }

  function clearNotifications() {
    persist([]);
    dispatchToast({ tone: "info", title: "Pusat notifikasi dibersihkan" });
  }

  async function enableBrowserNotifications() {
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    if (nextPermission === "granted") {
      const nextSettings = {
        capital: 10_000_000,
        riskTolerance: 15,
        timeHorizon: "medium" as const,
        preferredInstruments: [],
        language: "id" as const,
        ...settings,
        notificationPreferences: {
          ...preferences,
          enabled: true,
          browserEnabled: true,
        },
      };
      localArahDanaStorage.writeSettings(nextSettings);
      setSettings(nextSettings);
      dispatchToast({ tone: "success", title: "Browser notifications aktif" });
    }
  }

  function generateNow() {
    const generated = generateCalmNotifications({
      settings: {
        capital: 10_000_000,
        riskTolerance: 15,
        timeHorizon: "medium",
        preferredInstruments: [],
        language: "id",
        ...settings,
        notificationPreferences: preferences,
      },
      portfolio: localArahDanaStorage.readPortfolio() ?? [],
      watchlist: localArahDanaStorage.readWatchlist() ?? [],
      goals: localArahDanaStorage.readGoals() ?? [],
      goalContributions: localArahDanaStorage.readGoalContributions() ?? [],
      existing: notifications,
    });
    if (generated.length === 0) {
      dispatchToast({
        tone: "info",
        title: "Belum ada notifikasi baru",
        message: "Semua pengingat masih dalam frekuensi yang kamu pilih.",
      });
      return;
    }
    const next = [...generated, ...notifications].slice(0, 80);
    persist(next);
    showBrowserNotification(generated[0], preferences);
    dispatchToast({
      tone: generated[0].type === "risk" ? "warning" : "info",
      title: generated[0].title,
      message: generated[0].message,
    });
  }

  return (
    <div className="max-w-4xl space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-5 text-white sm:p-6">
        <p className="text-sm font-medium text-white/62">Notification Center</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Pengingat yang tenang
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          ArahDana memakai bahasa kalem untuk menjaga disiplin, bukan mendorong trading impulsif.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <HeaderMetric label="Unread" value={`${unreadCount}`} />
          <HeaderMetric label="Total" value={`${notifications.length}`} />
          <HeaderMetric label="Status" value={user ? "Data aman" : "Aman"} />
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-950">Preferensi aktif</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Reminder {frequencyLabel(preferences.reminderFrequency)}, {preferences.quietMode ? "quiet mode aktif" : "quiet mode off"}, browser {permissionLabel(permission)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permission !== "granted" && permission !== "unsupported" ? (
              <button
                type="button"
                onClick={enableBrowserNotifications}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Enable Notifications
              </button>
            ) : null}
            <button
              type="button"
              onClick={generateNow}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cek sekarang
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Notifikasi</h2>
            <p className="mt-1 text-sm text-stone-500">Reminder, risiko, goal, watchlist, portofolio, dan market.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              Tandai terbaca
            </button>
            <button
              type="button"
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          {notifications.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-stone-300 p-8 text-center">
              <h3 className="font-semibold text-stone-950">Belum ada notifikasi</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
                ArahDana akan menampilkan pengingat yang relevan setelah ada portofolio, tujuan, atau watchlist.
              </p>
            </div>
          ) : null}
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`rounded-[1.2rem] border p-4 ${item.readAt ? "border-stone-200 bg-white/60" : "border-emerald-100 bg-emerald-50/40"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeStyles[item.type]}`}>
                      {notificationTypeLabels[item.type]}
                    </span>
                    {!item.readAt ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Unread
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold text-stone-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{item.message}</p>
                  <p className="mt-2 text-xs font-semibold text-stone-400">{formatDateTime(item.createdAt)}</p>
                </div>
                {!item.readAt ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-white"
                  >
                    Mark as read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function readStoredNotifications() {
  if (typeof window === "undefined") return [];
  return localArahDanaStorage.readNotifications() ?? [];
}

function readStoredSettings() {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS;
  return localArahDanaStorage.readSettings() ?? DEFAULT_USER_SETTINGS;
}

function readBrowserPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function frequencyLabel(value: string) {
  if (value === "daily") return "harian";
  if (value === "weekly") return "mingguan";
  return "bulanan";
}

function permissionLabel(value: string) {
  if (value === "granted") return "aktif";
  if (value === "denied") return "ditolak";
  if (value === "unsupported") return "tidak didukung";
  return "belum aktif";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
