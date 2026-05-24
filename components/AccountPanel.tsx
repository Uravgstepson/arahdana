"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import {
  signOut,
  upsertUserProfile,
} from "@/lib/supabase/auth";
import {
  loadCloudUserData,
  syncLocalDataToCloud,
  writeUserDataSnapshotToLocal,
} from "@/lib/supabase/sync";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export function AccountPanel() {
  const router = useRouter();
  const { isConfigured, isLoading, user, profile, refreshAuth } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [isDisplayNameEdited, setIsDisplayNameEdited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const displayNameValue = isDisplayNameEdited
    ? displayName
    : (profile?.full_name ?? profile?.display_name ?? "");

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
      router.replace("/login");
    });
  }

  async function handleSyncLocalToCloud() {
    if (!user) {
      setStatus({ tone: "error", message: "Masuk dulu untuk menjaga data akun." });
      return;
    }

    await runTask(async () => {
      const result = await syncLocalDataToCloud(user);
      setStatus({
        tone: "success",
        message: `Data akun siap: ${result.portfolioCount} holding, ${result.watchlistCount} pantauan, ${result.goalCount} tujuan, ${result.analysisCount} analisis, ${result.alertRuleCount} pantauan otomatis, ${result.reportCount} laporan.`,
      });
      dispatchToast({
        tone: "success",
        title: "Data aman",
        message: "Data berhasil dijaga untuk akun ini.",
      });
    });
  }

  async function handleLoadCloudToLocal() {
    if (!user) return;

    await runTask(async () => {
      const snapshot = await loadCloudUserData(user);
      writeUserDataSnapshotToLocal(snapshot);
      window.dispatchEvent(new Event("arahdana:local-data-updated"));
      setStatus({
        tone: "success",
        message: `Data akun dipulihkan: ${snapshot.portfolio.length} holding, ${snapshot.watchlist.length} pantauan, ${snapshot.goals.length} tujuan, ${snapshot.analysisResults.length} analisis, ${snapshot.alertRules.length} pantauan otomatis, ${snapshot.reports.length} laporan.`,
      });
      dispatchToast({
        tone: "success",
        title: "Data dipulihkan",
        message: "Data akun sudah siap di perangkat ini.",
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
        <h2 className="text-lg font-semibold text-stone-950">Akun & data</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Akun online belum aktif di perangkat ini. ArahDana tetap bisa dipakai
          dengan data lokal.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Akun & data</h2>
        <p className="mt-2 text-sm text-stone-600">Memeriksa sesi login...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Akun & data</h2>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            user
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-amber-50 text-amber-800 ring-amber-100"
          }`}
        >
          {user ? "Data aman" : "Aman"}
        </span>
      </div>

      {!user ? (
        <div className="mt-5 rounded-[1.25rem] bg-stone-100 p-4">
          <Link
            href="/login"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
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
                className="min-h-11 rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Simpan profil
              </button>
            </div>
          </div>

          <div className="rounded-[1.25rem] bg-stone-100 p-4">
            <p className="text-sm font-semibold text-stone-950">Data akun</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSyncLocalToCloud}
                disabled={isBusy}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Jaga data akun
              </button>
              <button
                type="button"
                onClick={handleLoadCloudToLocal}
                disabled={isBusy}
                className="min-h-11 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Pulihkan ke perangkat ini
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isBusy}
                className="min-h-11 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
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
