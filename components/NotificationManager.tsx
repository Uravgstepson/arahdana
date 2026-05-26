"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  generateCalmNotifications,
  normalizeNotificationPreferences,
  showBrowserNotification,
} from "@/lib/notifications/notificationSystem";
import { loadCloudPortfolio } from "@/lib/supabase/sync";

const generatedTodayKey = "arahdana.notifications.generatedToday";

export function NotificationManager() {
  const { isConfigured, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    let isMounted = true;
    const todayKey = new Date().toISOString().slice(0, 10);
    if (window.sessionStorage.getItem(generatedTodayKey) === todayKey) return;

    void (async () => {
      const settings = localArahDanaStorage.readSettings();
      if (!settings) return;

      const preferences = normalizeNotificationPreferences(settings.notificationPreferences);
      if (!preferences.enabled || preferences.quietMode) return;

      const portfolio = user
        ? await loadCloudPortfolio(user).catch(() => [])
        : !isConfigured
          ? localArahDanaStorage.readPortfolio() ?? []
          : [];
      if (!isMounted) return;

      const existing = localArahDanaStorage.readNotifications() ?? [];
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
        portfolio,
        watchlist: localArahDanaStorage.readWatchlist() ?? [],
        goals: localArahDanaStorage.readGoals() ?? [],
        goalContributions: localArahDanaStorage.readGoalContributions() ?? [],
        existing,
      });

      if (generated.length === 0) return;
      const nextNotifications = [...generated, ...existing].slice(0, 80);
      localArahDanaStorage.writeNotifications(nextNotifications);
      localArahDanaStorage.writeSettings({
        capital: 10_000_000,
        riskTolerance: 15,
        timeHorizon: "medium",
        preferredInstruments: [],
        language: "id",
        ...settings,
        notificationPreferences: {
          ...preferences,
          lastGeneratedAt: {
            ...preferences.lastGeneratedAt,
            reminder: new Date().toISOString(),
            risk: new Date().toISOString(),
            watchlist: new Date().toISOString(),
            goal: new Date().toISOString(),
            portfolio: new Date().toISOString(),
            market: new Date().toISOString(),
            weekly_summary: new Date().toISOString(),
          },
        },
      });
      window.sessionStorage.setItem(generatedTodayKey, todayKey);
      window.dispatchEvent(new Event("arahdana:notifications-updated"));

      const first = generated[0];
      dispatchToast({
        tone: first.type === "risk" ? "warning" : "info",
        title: first.title,
        message: first.message,
      });
      showBrowserNotification(first, preferences);
    })();

    return () => {
      isMounted = false;
    };
  }, [isConfigured, isLoading, user]);

  return null;
}
