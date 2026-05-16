"use client";

import { useEffect } from "react";
import { dispatchToast } from "@/components/ToastViewport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  generateCalmNotifications,
  normalizeNotificationPreferences,
  showBrowserNotification,
} from "@/lib/notifications/notificationSystem";

const generatedTodayKey = "arahdana.notifications.generatedToday";

export function NotificationManager() {
  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (window.sessionStorage.getItem(generatedTodayKey) === todayKey) return;

    const settings = localArahDanaStorage.readSettings();
    if (!settings) return;

    const preferences = normalizeNotificationPreferences(settings.notificationPreferences);
    if (!preferences.enabled || preferences.quietMode) return;

    const existing = localArahDanaStorage.readNotifications() ?? [];
    const generated = generateCalmNotifications({
      settings: {
        capital: 10_000_000,
        riskTolerance: 15,
        timeHorizon: "medium",
        preferredInstruments: [],
        ...settings,
        notificationPreferences: preferences,
      },
      portfolio: localArahDanaStorage.readPortfolio() ?? [],
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
  }, []);

  return null;
}
