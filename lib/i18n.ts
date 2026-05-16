import type { LanguagePreference } from "@/lib/types/investment";

export type TranslationKey =
  | "alerts"
  | "analysis"
  | "backup"
  | "healthScore"
  | "home"
  | "journal"
  | "login"
  | "logout"
  | "notifications"
  | "portfolio"
  | "profile"
  | "reports"
  | "restore"
  | "settings"
  | "watch";

export const translations: Record<
  LanguagePreference,
  Record<TranslationKey, string>
> = {
  id: {
    alerts: "Alerts",
    analysis: "Analisis",
    backup: "Backup",
    healthScore: "Health Score",
    home: "Home",
    journal: "Jurnal",
    login: "Login",
    logout: "Logout",
    notifications: "Notifikasi",
    portfolio: "Porto",
    profile: "Saya",
    reports: "Laporan",
    restore: "Restore",
    settings: "Settings",
    watch: "Pantau",
  },
  en: {
    alerts: "Alerts",
    analysis: "Analysis",
    backup: "Backup",
    healthScore: "Health Score",
    home: "Home",
    journal: "Journal",
    login: "Login",
    logout: "Logout",
    notifications: "Notifications",
    portfolio: "Portfolio",
    profile: "Profile",
    reports: "Reports",
    restore: "Restore",
    settings: "Settings",
    watch: "Watch",
  },
};

export function normalizeLanguage(value: unknown): LanguagePreference {
  return value === "en" ? "en" : "id";
}

export function translate(
  language: LanguagePreference,
  key: TranslationKey,
) {
  return translations[language]?.[key] ?? translations.id[key];
}
