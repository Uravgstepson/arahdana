"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  localArahDanaStorage,
  STORAGE_KEYS,
} from "@/lib/storage/localStorage";
import {
  normalizeSettings,
  saveCloudAlertRules,
  saveCloudAnalysisResults,
  saveCloudGoalContributions,
  saveCloudGoals,
  saveCloudPortfolio,
  saveCloudReports,
  saveCloudSettings,
  saveCloudWatchlist,
} from "@/lib/supabase/sync";

const SYNC_DEBOUNCE_MS = 650;

export function CloudDataSync({ user }: { user: User | null }) {
  const timersRef = useRef(new Map<string, number>());

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    const timers = timersRef.current;

    function handleStorageWrite(event: Event) {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { key?: string; userId?: string | null } | null)
          : null;
      const key = detail?.key;
      if (!key || detail?.userId !== currentUser.id) return;

      const currentTimer = timers.get(key);
      if (currentTimer) window.clearTimeout(currentTimer);

      const nextTimer = window.setTimeout(() => {
        timers.delete(key);
        void syncKeyToCloud(currentUser, key).catch(() => undefined);
      }, SYNC_DEBOUNCE_MS);
      timers.set(key, nextTimer);
    }

    window.addEventListener("arahdana:storage-write", handleStorageWrite);
    return () => {
      window.removeEventListener("arahdana:storage-write", handleStorageWrite);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [user]);

  return null;
}

async function syncKeyToCloud(user: User, key: string) {
  switch (key) {
    case STORAGE_KEYS.portfolio:
      await saveCloudPortfolio(user, localArahDanaStorage.readPortfolio() ?? []);
      return;
    case STORAGE_KEYS.watchlist:
      await saveCloudWatchlist(user, localArahDanaStorage.readWatchlist() ?? []);
      return;
    case STORAGE_KEYS.settings:
      await saveCloudSettings(
        user,
        normalizeSettings(localArahDanaStorage.readSettings()),
      );
      return;
    case STORAGE_KEYS.analysisResults:
      await saveCloudAnalysisResults(
        user,
        localArahDanaStorage.readAnalysisResults() ?? [],
      );
      return;
    case STORAGE_KEYS.goals:
      await saveCloudGoals(user, localArahDanaStorage.readGoals() ?? []);
      return;
    case STORAGE_KEYS.goalContributions:
      await saveCloudGoalContributions(
        user,
        localArahDanaStorage.readGoalContributions() ?? [],
      );
      return;
    case STORAGE_KEYS.alertRules:
      await saveCloudAlertRules(user, localArahDanaStorage.readAlertRules() ?? []);
      return;
    case STORAGE_KEYS.reports:
      await saveCloudReports(user, localArahDanaStorage.readReports() ?? []);
      return;
    default:
      return;
  }
}
