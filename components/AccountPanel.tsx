"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { useAuth } from "@/components/AuthProvider";
import { collectArahDanaData, validateBackupData, type ArahDanaBackupFile } from "@/lib/utils/backup";
import {
  loadBackupOnline,
  saveBackupOnline,
  sendLoginLink,
  signOut,
  upsertUserProfile,
} from "@/lib/supabase/cloudStorage";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export function AccountPanel() {
  const { isConfigured, isLoading, user, profile, refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDisplayNameEdited, setIsDisplayNameEdited] = useState(false);
  const [lastSync, setLastSync] = useState<{
    userId: string;
    updatedAt: string | null;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    loadBackupOnline(user)
      .then((data) => {
        if (isMounted) {
          setLastSync({ userId: user.id, updatedAt: data?.updated_at ?? null });
        }
      })
      .catch(() => {
        if (isMounted) setLastSync({ userId: user.id, updatedAt: null });
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayNameValue = isDisplayNameEdited
    ? displayName
    : (profile?.display_name ?? "");
  const lastSyncedAt = user && lastSync?.userId === user.id ? lastSync.updatedAt : null;

  const formattedSyncTime = useMemo(() => {
    if (!lastSyncedAt) return "Belum ada data cloud.";
    return `Terakhir sync: ${new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(lastSyncedAt))}`;
  }, [lastSyncedAt]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setStatus({ tone: "error", message: "Masukkan email untuk login." });
      return;
    }

    await runTask(async () => {
      await sendLoginLink(email.trim());
      setStatus({
        tone: "success",
        message: "Link login sudah dikirim. Buka email di perangkat ini untuk masuk.",
      });
    });
  }

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

  async function handleSaveOnline() {
    if (!user) return;

    await runTask(async () => {
      const backup: ArahDanaBackupFile = {
        app: "ArahDana",
        version: "0.2.0",
        exportedAt: new Date().toISOString(),
        data: collectArahDanaData(),
      };
      const validation = validateBackupData(backup);
      if (!validation.ok) {
        setStatus({ tone: "error", message: validation.message });
        return;
      }
      const backupData = validation.data;
      if (!backupData) {
        setStatus({ tone: "error", message: "Data backup lokal tidak lengkap." });
        return;
      }

      const result = await saveBackupOnline(user, backupData);
      setLastSync({ userId: user.id, updatedAt: result.updated_at });
      setStatus({
        tone: "success",
        message: `Data lokal disimpan ke cloud: ${backupData.portfolio.length} portofolio dan ${backupData.watchlist.length} pantauan.`,
      });
    });
  }

  async function handleLoadOnline() {
    if (!user) return;

    await runTask(async () => {
      const cloudData = await loadBackupOnline(user);
      if (!cloudData) {
        setStatus({
          tone: "info",
          message: "Belum ada backup cloud untuk akun ini.",
        });
        return;
      }

      const validation = validateBackupData({
          app: "ArahDana",
          version: "0.2.0",
          exportedAt: cloudData.updated_at ?? new Date().toISOString(),
          data: {
            portfolio: cloudData.portfolio,
            watchlist: cloudData.watchlist,
            settings: cloudData.settings,
            analysisResults: [],
          },
        });

      if (!validation.ok) {
        setStatus({ tone: "error", message: validation.message });
        return;
      }
      const backupData = validation.data;
      if (!backupData) {
        setStatus({ tone: "error", message: "Data backup cloud tidak lengkap." });
        return;
      }

      localArahDanaStorage.writePortfolio(backupData.portfolio);
      localArahDanaStorage.writeWatchlist(backupData.watchlist);
      localArahDanaStorage.writeSettings(backupData.settings);
      setLastSync({ userId: user.id, updatedAt: cloudData.updated_at });
      window.dispatchEvent(new Event("arahdana:local-data-updated"));
      setStatus({
        tone: "success",
        message: `Data cloud berhasil dipulihkan ke perangkat ini: ${backupData.portfolio.length} portofolio dan ${backupData.watchlist.length} pantauan.`,
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
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses akun.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  if (!isConfigured) {
    return (
      <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Akun & sync cloud</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Supabase belum dikonfigurasi. Tambahkan env
          {" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
          {" "}
          dan
          {" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          , lalu jalankan SQL di
          {" "}
          <code>supabase/arahdana-schema.sql</code>
          .
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Akun & sync cloud</h2>
        <p className="mt-2 text-sm text-stone-600">Memeriksa sesi login...</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Akun & sync cloud</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Login untuk menyimpan portofolio online dan memulihkannya di perangkat lain.
          </p>
        </div>
        {user ? (
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Online
          </span>
        ) : null}
      </div>

      {!user ? (
        <form onSubmit={handleLogin} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="email@contoh.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kirim link login
          </button>
        </form>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="rounded-lg bg-stone-100 p-4">
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

          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-semibold text-stone-950">Sync antar device</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{formattedSyncTime}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSaveOnline}
                disabled={isBusy}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Simpan lokal ke cloud
              </button>
              <button
                type="button"
                onClick={handleLoadOnline}
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
          className={`mt-4 text-sm font-medium ${
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
