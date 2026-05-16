"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  InvestmentType,
  NotificationPreferences,
  NotificationType,
  TimeHorizon,
  UserSettings,
} from "@/lib/types/investment";
import { dispatchToast } from "@/components/ToastViewport";
import { AccountPanel } from "@/components/AccountPanel";
import { LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import { InstrumentOptions } from "@/components/PortfolioTable";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  clearArahDanaData,
  exportArahDanaData,
  importArahDanaData,
  validateBackupData,
} from "@/lib/utils/backup";
import {
  loadCloudSettings,
  saveCloudSettings,
} from "@/lib/supabase/sync";
import {
  clampNumber,
  formatRupiah,
  investmentTypeLabel,
  nonNegativeNumber,
} from "@/lib/utils/format";
import {
  browserNotificationsAvailable,
  normalizeNotificationPreferences,
  notificationTypeLabels,
  requestBrowserNotificationPermission,
} from "@/lib/notifications/notificationSystem";

const defaults = DEFAULT_USER_SETTINGS;
const THEME_KEY = "arahdana.theme";

export default function SettingsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [preferred, setPreferred] = useState<InvestmentType>("stock");
  const [clearStatus, setClearStatus] = useState("");
  const [backupStatus, setBackupStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(THEME_KEY) === "dark",
  );
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [browserPermission, setBrowserPermission] = useState(
    () => readBrowserPermission(),
  );
  const suppressNextSettingsWrite = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const localSettings = readStoredSettings();
        if (!user) {
          if (!isMounted) return;
          setSettings(localSettings);
          setCloudSyncStatus({
            tone: "info",
            message: "Local mode. Login untuk sinkronisasi antar perangkat.",
          });
          setIsHydrated(true);
          return;
        }

        try {
          const cloudSettings = await loadCloudSettings(user);
          if (!isMounted) return;
          const nextSettings = cloudSettings ?? localSettings;
          setSettings(nextSettings);
          localArahDanaStorage.writeSettings(nextSettings);
          setCloudSyncStatus({
            tone: "success",
            message: cloudSettings
              ? "Cloud sync enabled. Settings dimuat dari Supabase."
              : "Cloud sync enabled. Belum ada settings cloud; data lokal akan dicadangkan saat berubah.",
          });
        } catch (error) {
          if (!isMounted) return;
          setSettings(localSettings);
          setCloudSyncStatus({
            tone: "error",
            message:
              error instanceof Error
                ? `Cloud settings gagal dimuat, memakai localStorage. ${error.message}`
                : "Cloud settings gagal dimuat, memakai localStorage.",
          });
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isHydrated) return;
    if (suppressNextSettingsWrite.current) {
      suppressNextSettingsWrite.current = false;
      return;
    }
    localArahDanaStorage.writeSettings(settings);
    if (!user) return;

    void saveCloudSettings(user, settings)
      .then(() => {
        setCloudSyncStatus({
          tone: "success",
          message:
            "Cloud sync enabled. Settings tersimpan di Supabase dan localStorage.",
        });
      })
      .catch((error) => {
        setCloudSyncStatus({
          tone: "error",
          message:
            error instanceof Error
              ? `Settings tersimpan lokal, cloud sync gagal. ${error.message}`
              : "Settings tersimpan lokal, cloud sync gagal.",
        });
      });
  }, [isHydrated, settings, user]);

  function addPreferred() {
    setSettings((current) =>
      current.preferredInstruments.includes(preferred)
        ? current
        : {
            ...current,
            preferredInstruments: [...current.preferredInstruments, preferred],
          },
    );
    setClearStatus("");
    setBackupStatus(null);
  }

  function removePreferred(type: InvestmentType) {
    setSettings((current) => ({
      ...current,
      preferredInstruments: current.preferredInstruments.filter(
        (item) => item !== type,
      ),
    }));
    setClearStatus("");
    setBackupStatus(null);
  }

  function clearAllData() {
    const confirmed = window.confirm(
      "Hapus semua data lokal ArahDana dari browser ini? Data browser lain tidak akan disentuh.",
    );
    if (!confirmed) return;

    const result = clearArahDanaData();
    suppressNextSettingsWrite.current = true;
    setSettings(defaults);
    setPreferred("stock");
    setBackupStatus(null);
    setClearStatus(result.message);
  }

  function exportBackup() {
    const result = exportArahDanaData();
    setClearStatus("");
    setBackupStatus({
      tone: result.ok ? "success" : "error",
      message: result.message,
    });
    dispatchToast({
      tone: result.ok ? "success" : "error",
      title: result.ok ? "Backup berhasil" : "Backup gagal",
      message: result.message,
    });
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    let parsedBackup: unknown;

    try {
      parsedBackup = JSON.parse(await file.text());
    } catch {
      setClearStatus("");
      setBackupStatus({
        tone: "error",
        message: "File backup bukan JSON yang valid.",
      });
      return;
    }

    const validation = validateBackupData(parsedBackup);
    if (!validation.ok) {
      setClearStatus("");
      setBackupStatus({ tone: "error", message: validation.message });
      return;
    }

    try {
      const confirmed = window.confirm(
        "Import backup akan mengganti data ArahDana lokal di browser ini. Lanjutkan?",
      );
      if (!confirmed) return;

      const result = await importArahDanaData(file);
      if (!result.ok) {
        setClearStatus("");
        setBackupStatus({ tone: "error", message: result.message });
        return;
      }

      setSettings(result.data?.settings ?? defaults);
      setPreferred("stock");
      setClearStatus("");
      setBackupStatus({
        tone: "success",
        message: result.message,
      });
      dispatchToast({
        tone: "success",
        title: "Import backup berhasil",
        message: result.message,
      });
    } catch {
      setClearStatus("");
      setBackupStatus({
        tone: "error",
        message: "Backup gagal dibaca. Coba pilih file JSON lain.",
      });
    }
  }

  function updateNotificationPreferences(next: Partial<NotificationPreferences>) {
    setSettings((current) => ({
      ...current,
      notificationPreferences: {
        ...normalizeNotificationPreferences(current.notificationPreferences),
        ...next,
      },
    }));
  }

  async function enableBrowserNotifications() {
    const permission = await requestBrowserNotificationPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      updateNotificationPreferences({ enabled: true, browserEnabled: true });
      dispatchToast({
        tone: "success",
        title: "Notifikasi aktif",
        message: "ArahDana akan mengirim pengingat yang tenang dan terbatas.",
      });
      return;
    }
    dispatchToast({
      tone: "warning",
      title: "Notifikasi browser belum aktif",
      message: "Kamu tetap bisa memakai pusat notifikasi di dalam aplikasi.",
    });
  }

  if (!isHydrated) {
    return (
      <LoadingState
        title="Memuat pengaturan"
        message="Mengambil preferensi lokal dan cloud bila akun tersedia."
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <SectionHeader
        title="Preferensi"
        description="Pengaturan aplikasi, profil risiko, dan notifikasi."
      />

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">App preferences</h2>
            <p className="mt-1 text-sm text-stone-500">
              Mode {user ? "cloud" : "lokal"} - {APP_VERSION_LABEL}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDarkMode((current) => !current)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
              isDarkMode
                ? "bg-stone-950 text-white"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {isDarkMode ? "Dark on" : "Dark off"}
          </button>
        </div>
        {cloudSyncStatus ? (
          <p
            className={`mt-3 whitespace-pre-line text-sm font-medium ${
              cloudSyncStatus.tone === "success"
                ? "text-emerald-700"
                : cloudSyncStatus.tone === "error"
                  ? "text-rose-700"
                  : "text-stone-600"
            }`}
          >
            {cloudSyncStatus.message}
          </p>
        ) : null}
        <div className="mt-5 grid gap-4">
          <Field label={`Modal bawaan: ${formatRupiah(settings.capital)}`}>
            <input
              className="input"
              type="number"
              min="0"
              value={settings.capital}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  capital: nonNegativeNumber(Number(e.target.value)),
                })
              }
            />
          </Field>
          <Field label={`Toleransi risiko: ${settings.riskTolerance}%`}>
            <input
              type="range"
              min="5"
              max="30"
              value={settings.riskTolerance}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  riskTolerance: clampNumber(Number(e.target.value), 5, 30),
                })
              }
            />
          </Field>
          <Field label="Jangka waktu">
            <select
              className="input"
              value={settings.timeHorizon}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  timeHorizon: e.target.value as TimeHorizon,
                })
              }
            >
              <option value="short">Jangka pendek</option>
              <option value="medium">Jangka menengah</option>
              <option value="long">Jangka panjang</option>
            </select>
          </Field>
          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-semibold">Instrumen pilihan</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <select
                className="input"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value as InvestmentType)}
              >
                <InstrumentOptions />
              </select>
              <button
                type="button"
                onClick={addPreferred}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Tambah
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.preferredInstruments.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => removePreferred(item)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
                >
                  {investmentTypeLabel(item)} x
                </button>
              ))}
              {settings.preferredInstruments.length === 0 ? (
                <span className="text-sm text-stone-500">
                  Belum ada instrumen pilihan.
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-semibold">Estimasi imbal hasil RDPU</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Dipakai hanya untuk reksadana pasar uang jika NAV resmi belum
              terhubung, supaya “bunga” di portofolio bisa naik secara masuk
              akal.
            </p>
            <Field
              label={`APR RDPU (per tahun): ${Math.round((settings.aprMoneyMarketFund ?? defaults.aprMoneyMarketFund ?? 0) * 10000) / 100}%`}
            >
              <input
                className="input"
                type="number"
                min="0"
                max="0.5"
                step="0.001"
                value={
                  settings.aprMoneyMarketFund ??
                  defaults.aprMoneyMarketFund ??
                  0
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aprMoneyMarketFund: nonNegativeNumber(
                      Number(e.target.value),
                    ),
                  })
                }
              />
            </Field>
          </div>
        </div>
      </section>

      <NotificationSettingsSection
        preferences={normalizeNotificationPreferences(settings.notificationPreferences)}
        browserPermission={browserPermission}
        onEnableBrowserNotifications={enableBrowserNotifications}
        onChange={updateNotificationPreferences}
      />

      <SectionHeader
        title="Akun"
        description="Login, logout, status cloud, dan sinkronisasi akun."
      />

      <AccountPanel />

      <SectionHeader
        title="Data"
        description="Backup, restore, CSV import, dan halaman pendukung."
      />

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">
          Backup & Restore
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Data saat ini tersimpan di browser perangkat ini. Export backup secara
          berkala agar data tidak hilang.
        </p>
        <div className="mt-4 rounded-lg bg-stone-100 p-4">
          <h3 className="text-sm font-semibold text-stone-950">
            File backup lokal
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Backup mencakup portofolio, watchlist, pengaturan, dan hasil
            analisis tersimpan jika tersedia.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportBackup}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              Export Data
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50">
              Import Backup
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={importBackup}
              />
            </label>
          </div>
          {backupStatus ? (
            <p
              className={`mt-3 text-sm font-medium ${
                backupStatus.tone === "success"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {backupStatus.message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Data tools</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SettingsLink href="/portfolio" title="CSV import" />
          <SettingsLink href="/market-prices" title="Harga pasar" />
          <SettingsLink href="/integrations" title="Integrasi" />
          <SettingsLink href="/onboarding" title="Onboarding" />
          <SettingsLink href="/changelog" title="Changelog" />
          <SettingsLink href="/feedback" title="Feedback beta" />
          <SettingsLink href="/notifications" title="Notifikasi" />
          <SettingsLink href="/watchlist" title="Pantauan" />
        </div>
      </section>

      <SectionHeader
        title="Danger Zone"
        description="Reset lokal dan tindakan yang tidak mudah dibatalkan."
      />

      <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-rose-800">
          Clear local data
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Menghapus data ArahDana di browser ini saja.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
        >
          Clear All Local Data
        </button>
        {clearStatus ? (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {clearStatus}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-1 pt-2">
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}

function NotificationSettingsSection({
  preferences,
  browserPermission,
  onEnableBrowserNotifications,
  onChange,
}: {
  preferences: NotificationPreferences;
  browserPermission: string;
  onEnableBrowserNotifications: () => Promise<void>;
  onChange: (next: Partial<NotificationPreferences>) => void;
}) {
  const notificationTypes = Object.keys(notificationTypeLabels) as NotificationType[];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Notifikasi</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Pengingat tenang untuk DCA, tujuan, risiko, dan review portofolio. Tidak ada alert spekulatif.
          </p>
        </div>
        <button
          type="button"
          onClick={onEnableBrowserNotifications}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          Enable Notifications
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        Browser: {browserPermission === "granted" ? "diizinkan" : browserPermission === "denied" ? "ditolak" : browserPermission === "unsupported" ? "tidak didukung" : "belum diminta"}
      </p>

      <div className="mt-5 grid gap-4">
        <label className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-4 text-sm font-semibold text-stone-700">
          Aktifkan notifikasi in-app
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-4 text-sm font-semibold text-stone-700">
          Browser notifications
          <input
            type="checkbox"
            checked={preferences.browserEnabled}
            onChange={(event) => onChange({ browserEnabled: event.target.checked })}
          />
        </label>
        <Field label="Frekuensi reminder DCA">
          <select
            className="input"
            value={preferences.reminderFrequency}
            onChange={(event) =>
              onChange({
                reminderFrequency: event.target.value as NotificationPreferences["reminderFrequency"],
              })
            }
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-4 text-sm font-semibold text-stone-700">
            Quiet mode
            <input
              type="checkbox"
              checked={preferences.quietMode}
              onChange={(event) => onChange({ quietMode: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-4 text-sm font-semibold text-stone-700">
            Vibrasi mobile
            <input
              type="checkbox"
              checked={preferences.mobileVibration}
              onChange={(event) => onChange({ mobileVibration: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-stone-100 p-4 text-sm font-semibold text-stone-700 sm:col-span-2">
            Ringkasan market mingguan
            <input
              type="checkbox"
              checked={preferences.weeklySummary}
              onChange={(event) => onChange({ weeklySummary: event.target.checked })}
            />
          </label>
        </div>
        <div className="rounded-[1.1rem] bg-stone-100 p-4">
          <p className="text-sm font-semibold text-stone-950">Jenis notifikasi</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {notificationTypes.map((type) => (
              <label
                key={type}
                className="flex items-center justify-between gap-3 rounded-[1rem] bg-white px-3 py-2 text-sm font-semibold text-stone-700"
              >
                {notificationTypeLabels[type]}
                <input
                  type="checkbox"
                  checked={preferences.enabledTypes.includes(type)}
                  onChange={(event) => {
                    const enabledTypes = event.target.checked
                      ? [...preferences.enabledTypes, type]
                      : preferences.enabledTypes.filter((item) => item !== type);
                    onChange({ enabledTypes });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-between rounded-[1.2rem] bg-stone-100 px-4 text-sm font-semibold text-stone-950"
    >
      {title}
      <span className="text-emerald-700" aria-hidden="true">
        &gt;
      </span>
    </Link>
  );
}

function readBrowserPermission() {
  if (!browserNotificationsAvailable()) return "unsupported";
  return Notification.permission;
}

function readStoredSettings() {
  const saved = localArahDanaStorage.readSettings();
  if (!saved) {
    return defaults;
  }

  const preferredInstruments = Array.isArray(saved.preferredInstruments)
    ? saved.preferredInstruments.filter(isInvestmentType)
    : [];

  return {
    ...defaults,
    ...saved,
    capital: nonNegativeNumber(saved.capital ?? defaults.capital),
    riskTolerance: clampNumber(
      saved.riskTolerance ?? defaults.riskTolerance,
      5,
      30,
    ),
    timeHorizon: isTimeHorizon(saved.timeHorizon)
      ? saved.timeHorizon
      : defaults.timeHorizon,
    aprMoneyMarketFund:
      typeof saved.aprMoneyMarketFund === "number" &&
      Number.isFinite(saved.aprMoneyMarketFund)
        ? nonNegativeNumber(saved.aprMoneyMarketFund)
        : defaults.aprMoneyMarketFund,
    preferredInstruments: Array.isArray(saved.preferredInstruments)
      ? preferredInstruments
      : defaults.preferredInstruments,
    notificationPreferences: normalizeNotificationPreferences(saved.notificationPreferences),
  };
}

function isTimeHorizon(value: unknown): value is TimeHorizon {
  return value === "short" || value === "medium" || value === "long";
}

function isInvestmentType(value: unknown): value is InvestmentType {
  return (
    value === "stock" ||
    value === "cash_savings" ||
    value === "money_market_fund" ||
    value === "bond_fund" ||
    value === "equity_fund" ||
    value === "mixed_fund" ||
    value === "bond"
  );
}

