"use client";

import Link from "next/link";
import { useState } from "react";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import {
  signOut,
  upsertUserProfile,
} from "@/lib/supabase/auth";
import {
  loadCloudAnalysisResults,
  loadCloudAlertRules,
  loadCloudGoalContributions,
  loadCloudGoals,
  loadCloudPortfolio,
  loadCloudReports,
  loadCloudSettings,
  loadCloudWatchlist,
  syncLocalDataToCloud,
} from "@/lib/supabase/sync";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export function AccountPanel() {
  const { isConfigured, isLoading, user, profile, refreshAuth } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [isDisplayNameEdited, setIsDisplayNameEdited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const displayNameValue = isDisplayNameEdited
    ? displayName
    : (profile?.display_name ?? "");

  async function handleSaveProfile() {
    if (!user) return;

    await runTask(async () => {
      await upsertUserProfile(user, displayNameValue);
      await refreshAuth();
      setIsDisplayNameEdited(false);
      setStatus({ tone: "success", message: "Profil berhasil disimpan." });
    });
  }

  async function handleSignOut() {
    await runTask(async () => {
      await signOut();
      await refreshAuth();
      setStatus({ tone: "success", message: "Kamu sudah logout dari akun ini." });
    });
  }

  async function handleSyncLocalToCloud() {
    if (!user) {
      setStatus({ tone: "error", message: "Login dulu untuk sinkronisasi cloud." });
      return;
    }

    await runTask(async () => {
      const result = await syncLocalDataToCloud(user);
      setStatus({
        tone: "success",
        message: `Data lokal tersinkron: ${result.portfolioCount} holding, ${result.watchlistCount} pantauan, ${result.goalCount} tujuan, ${result.analysisCount} hasil analisis, ${result.alertRuleCount} alert, ${result.reportCount} laporan.`,
      });
      dispatchToast({
        tone: "success",
        title: "Sync complete",
        message: "Data lokal berhasil tersinkron ke cloud.",
      });
    });
  }

  async function handleLoadCloudToLocal() {
    if (!user) return;

    await runTask(async () => {
      const [portfolio, watchlist, settings, analysisResults, goals, goalContributions, alertRules, reports] = await Promise.all([
        loadCloudPortfolio(user),
        loadCloudWatchlist(user),
        loadCloudSettings(user),
        loadCloudAnalysisResults(user),
        loadCloudGoals(user),
        loadCloudGoalContributions(user),
        loadCloudAlertRules(user),
        loadCloudReports(user),
      ]);

      localArahDanaStorage.writePortfolio(portfolio);
      localArahDanaStorage.writeWatchlist(watchlist);
      if (settings) localArahDanaStorage.writeSettings(settings);
      localArahDanaStorage.writeAnalysisResults(analysisResults);
      localArahDanaStorage.writeGoals(goals);
      localArahDanaStorage.writeGoalContributions(goalContributions);
      localArahDanaStorage.writeAlertRules(alertRules);
      localArahDanaStorage.writeReports(reports);
      window.dispatchEvent(new Event("arahdana:local-data-updated"));
      setStatus({
        tone: "success",
        message: `Cloud dipulihkan ke browser ini: ${portfolio.length} holding, ${watchlist.length} pantauan, ${goals.length} tujuan, ${analysisResults.length} hasil analisis, ${alertRules.length} alert, ${reports.length} laporan.`,
      });
      dispatchToast({
        tone: "success",
        title: "Cloud dipulihkan",
        message: "Data cloud sudah dicadangkan ke browser ini.",
      });
    });
  }

  async function runTask(task: () => Promise<void>) {
    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      setStatus({
        tone: "error",
        message: formatUnknownError(error),
      });
    } finally {
      setIsBusy(false);
    }
  }

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Akun & cloud sync</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Supabase belum dikonfigurasi. Tambahkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, lalu jalankan SQL di{" "}
          <code>supabase/arahdana-schema.sql</code>.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Akun & cloud sync</h2>
        <p className="mt-2 text-sm text-stone-600">Memeriksa sesi login...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Akun & cloud sync</h2>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            user
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-amber-50 text-amber-800 ring-amber-100"
          }`}
        >
          {user ? "Cloud sync enabled" : "Local mode"}
        </span>
      </div>

      {!user ? (
        <div className="mt-5 rounded-[1.25rem] bg-stone-100 p-4">
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Masuk ke akun
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="rounded-[1.25rem] bg-stone-100 p-4">
            <p className="text-sm font-semibold text-stone-950">Profil pengguna</p>
            <p className="mt-1 text-sm text-stone-600">{profile?.email ?? user.email}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="input"
                value={displayNameValue}
                onChange={(event) => {
                  setIsDisplayNameEdited(true);
                  setDisplayName(event.target.value);
                }}
                placeholder="Nama tampilan"
              />
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isBusy}
                className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Simpan profil
              </button>
            </div>
          </div>

          <div className="rounded-[1.25rem] bg-stone-100 p-4">
            <p className="text-sm font-semibold text-stone-950">Sync antar perangkat</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSyncLocalToCloud}
                disabled={isBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sync Local Data to Cloud
              </button>
              <button
                type="button"
                onClick={handleLoadCloudToLocal}
                disabled={isBusy}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ambil cloud ke perangkat ini
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isBusy}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {status ? (
        <p
          className={`mt-4 whitespace-pre-line text-sm font-medium ${
            status.tone === "success"
              ? "text-emerald-700"
              : status.tone === "error"
                ? "text-rose-700"
                : "text-stone-600"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "Terjadi kesalahan saat memproses akun. Coba jalankan ulang supabase/arahdana-schema.sql di Supabase SQL Editor.";
}
