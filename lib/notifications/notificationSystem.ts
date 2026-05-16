import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/settings/defaults";
import type {
  AppNotification,
  FinancialGoal,
  GoalContribution,
  NotificationPreferences,
  NotificationType,
  PortfolioItem,
  UserSettings,
  WatchlistItem,
} from "@/lib/types/investment";
import { planFinancialGoal } from "@/lib/goals/goalPlanner";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";

export const notificationTypeLabels: Record<NotificationType, string> = {
  reminder: "Reminder",
  risk: "Risiko",
  watchlist: "Watchlist",
  goal: "Tujuan",
  portfolio: "Portofolio",
  market: "Market",
};

export function normalizeNotificationPreferences(
  preferences?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  const enabledTypes = Array.isArray(preferences?.enabledTypes)
    ? preferences.enabledTypes.filter(isNotificationType)
    : DEFAULT_NOTIFICATION_PREFERENCES.enabledTypes;

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...preferences,
    enabled: Boolean(preferences?.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled),
    browserEnabled: Boolean(
      preferences?.browserEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.browserEnabled,
    ),
    reminderFrequency: isReminderFrequency(preferences?.reminderFrequency)
      ? preferences.reminderFrequency
      : DEFAULT_NOTIFICATION_PREFERENCES.reminderFrequency,
    enabledTypes: enabledTypes.length > 0 ? enabledTypes : DEFAULT_NOTIFICATION_PREFERENCES.enabledTypes,
    quietMode: Boolean(preferences?.quietMode ?? DEFAULT_NOTIFICATION_PREFERENCES.quietMode),
    mobileVibration: Boolean(
      preferences?.mobileVibration ?? DEFAULT_NOTIFICATION_PREFERENCES.mobileVibration,
    ),
    weeklySummary: Boolean(preferences?.weeklySummary ?? DEFAULT_NOTIFICATION_PREFERENCES.weeklySummary),
    lastGeneratedAt: preferences?.lastGeneratedAt ?? {},
  };
}

export function generateCalmNotifications(params: {
  settings: UserSettings;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  goals: FinancialGoal[];
  goalContributions: GoalContribution[];
  existing: AppNotification[];
  today?: Date;
}) {
  const today = params.today ?? new Date();
  const preferences = normalizeNotificationPreferences(params.settings.notificationPreferences);
  if (!preferences.enabled || preferences.quietMode) return [];

  const notifications: AppNotification[] = [];
  const existingIds = new Set(params.existing.map((item) => item.id));

  function push(item: Omit<AppNotification, "createdAt"> & { createdAt?: string }) {
    if (!preferences.enabledTypes.includes(item.type)) return;
    if (existingIds.has(item.id)) return;
    notifications.push({
      ...item,
      createdAt: item.createdAt ?? today.toISOString(),
    });
  }

  if (shouldGenerate("reminder", preferences, today)) {
    push({
      id: notificationId("reminder", "dca", today),
      type: "reminder",
      title: reminderTitle(preferences.reminderFrequency),
      message:
        preferences.reminderFrequency === "monthly"
          ? "Saatnya evaluasi investasi bulanan kamu dengan tenang. Cek kontribusi, alokasi, dan target tanpa perlu terburu-buru."
          : "Luangkan waktu sebentar untuk menjaga disiplin DCA dan memastikan rencana masih sesuai profil risiko.",
    });
  }

  params.goals.forEach((goal) => {
    const plan = planFinancialGoal({
      goal,
      portfolio: params.portfolio,
      contributions: params.goalContributions,
      aprMoneyMarketFund: params.settings.aprMoneyMarketFund,
      today,
    });
    const currentMonth = today.toISOString().slice(0, 7);
    const hasContributionThisMonth = params.goalContributions.some(
      (item) => item.goalId === goal.id && item.contributionMonth === currentMonth,
    );

    if (plan.progressPercent >= 25 && shouldGenerate("goal", preferences, today, goal.id)) {
      push({
        id: notificationId("goal", `${goal.id}-${Math.floor(plan.progressPercent / 25) * 25}`, today),
        type: "goal",
        sourceId: goal.id,
        title: `Progress tujuan ${goal.name} ${plan.progressPercent}%`,
        message: `Progress tujuan ${goal.name} sudah mencapai ${plan.progressPercent}%. Pertahankan ritme kontribusi tanpa mengejar return berlebihan.`,
      });
    }

    if (!hasContributionThisMonth && shouldGenerate("reminder", preferences, today, goal.id)) {
      push({
        id: notificationId("reminder", `goal-${goal.id}`, today),
        type: "reminder",
        sourceId: goal.id,
        title: `Kontribusi ${goal.name} belum tercatat`,
        message: `Kontribusi bulan ini untuk tujuan ${goal.name} belum dilakukan. Jika belum waktunya, abaikan dengan tenang.`,
      });
    }
  });

  const exposure = calculatePortfolioExposure(params.portfolio, params.settings.aprMoneyMarketFund);
  if (exposure.total > 0 && shouldGenerate("risk", preferences, today)) {
    if (exposure.stockPercent > riskStockThreshold(params.settings.riskTolerance)) {
      push({
        id: notificationId("risk", "stock-exposure", today),
        type: "risk",
        title: "Eksposur saham cukup tinggi",
        message: "Eksposur saham saat ini cukup tinggi dibanding profil risiko kamu. Pertimbangkan evaluasi alokasi, bukan reaksi impulsif.",
      });
    }

    if (exposure.worstPerformer && exposure.worstPerformer.profitPercent < -8) {
      push({
        id: notificationId("portfolio", `worst-${exposure.worstPerformer.id}`, today),
        type: "portfolio",
        sourceId: exposure.worstPerformer.id,
        title: `${exposure.worstPerformer.name} sedang melemah`,
        message: `${exposure.worstPerformer.name} turun sekitar ${Math.round(Math.abs(exposure.worstPerformer.profitPercent))}%. Evaluasi tesis dan risiko sebelum mengambil keputusan.`,
      });
    }
  }

  params.watchlist.forEach((item) => {
    if (!shouldGenerate("watchlist", preferences, today, item.id)) return;
    if (item.status === "waiting") {
      push({
        id: notificationId("watchlist", `${item.id}-wait`, today),
        type: "watchlist",
        sourceId: item.id,
        title: `${item.name} masih di zona wait`,
        message: `${item.name} masih berada di zona wait. Tetap gunakan rencana, bukan dorongan sesaat.`,
      });
    }
    if (item.status === "watching") {
      push({
        id: notificationId("watchlist", `${item.id}-watching`, today),
        type: "watchlist",
        sourceId: item.id,
        title: `${item.name} tetap dipantau`,
        message: `${item.name} mendekati area yang kamu pantau: ${item.targetBuyZone}. Verifikasi ulang sebelum membeli.`,
      });
    }
  });

  if (preferences.weeklySummary && shouldGenerate("weekly_summary", preferences, today)) {
    push({
      id: notificationId("market", "weekly-summary", today),
      type: "market",
      title: "Ringkasan mingguan siap ditinjau",
      message: buildWeeklySummaryMessage(exposure),
    });
  }

  return notifications.slice(0, 10);
}

export function browserNotificationsAvailable() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestBrowserNotificationPermission() {
  if (!browserNotificationsAvailable()) return "unsupported" as const;
  const permission = await Notification.requestPermission();
  return permission;
}

export function showBrowserNotification(notification: AppNotification, preferences: NotificationPreferences) {
  if (!browserNotificationsAvailable()) return;
  if (!preferences.enabled || !preferences.browserEnabled || preferences.quietMode) return;
  if (Notification.permission !== "granted") return;

  const browserNotification = new Notification(notification.title, {
    body: notification.message,
    tag: notification.id,
    silent: !preferences.mobileVibration,
  });
  if (preferences.mobileVibration && "vibrate" in navigator) {
    navigator.vibrate?.(80);
  }
  window.setTimeout(() => browserNotification.close(), 7000);
}

function shouldGenerate(
  key: NotificationType | "weekly_summary",
  preferences: NotificationPreferences,
  today: Date,
  sourceId = "global",
) {
  const lastGenerated = preferences.lastGeneratedAt?.[key];
  if (!lastGenerated) return true;
  const last = new Date(lastGenerated);
  if (Number.isNaN(last.getTime())) return true;

  const days = Math.floor((startOfDay(today).getTime() - startOfDay(last).getTime()) / 86_400_000);
  if (key === "weekly_summary") return days >= 7;
  if (sourceId !== "global" && days < 1) return false;
  if (preferences.reminderFrequency === "daily") return days >= 1;
  if (preferences.reminderFrequency === "weekly") return days >= 7;
  return days >= 28;
}

function notificationId(type: NotificationType, key: string, date: Date) {
  return `${type}:${key}:${date.toISOString().slice(0, 10)}`;
}

function reminderTitle(frequency: NotificationPreferences["reminderFrequency"]) {
  if (frequency === "daily") return "Pengingat investasi harian";
  if (frequency === "weekly") return "Pengingat evaluasi mingguan";
  return "Pengingat evaluasi bulanan";
}

function calculatePortfolioExposure(items: PortfolioItem[], aprMoneyMarketFund = 0.05) {
  const performers = items.map((item) => {
    const invested = item.buyPrice * item.quantity;
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
    const current = currentPriceUsed * item.quantity;
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      current,
      profitPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    };
  });
  const total = performers.reduce((sum, item) => sum + item.current, 0);
  const stockValue = performers
    .filter((item) => item.type === "stock" || item.type === "equity_fund")
    .reduce((sum, item) => sum + item.current, 0);
  return {
    total,
    stockPercent: total > 0 ? (stockValue / total) * 100 : 0,
    bestPerformer: performers.length
      ? performers.reduce((best, item) => (item.profitPercent > best.profitPercent ? item : best))
      : null,
    worstPerformer: performers.length
      ? performers.reduce((worst, item) => (item.profitPercent < worst.profitPercent ? item : worst))
      : null,
  };
}

function riskStockThreshold(riskTolerance: number) {
  if (riskTolerance <= 10) return 25;
  if (riskTolerance <= 20) return 45;
  return 65;
}

function buildWeeklySummaryMessage(exposure: ReturnType<typeof calculatePortfolioExposure>) {
  if (exposure.total <= 0) {
    return "Belum ada portofolio untuk diringkas. Tambahkan holding jika ingin melihat evaluasi mingguan.";
  }
  const best = exposure.bestPerformer?.name ?? "-";
  const worst = exposure.worstPerformer?.name ?? "-";
  return `Best performer: ${best}. Worst performer: ${worst}. Gunakan ringkasan ini untuk evaluasi, bukan dorongan trading cepat.`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isNotificationType(value: unknown): value is NotificationType {
  return (
    value === "reminder" ||
    value === "risk" ||
    value === "watchlist" ||
    value === "goal" ||
    value === "portfolio" ||
    value === "market"
  );
}

function isReminderFrequency(value: unknown): value is NotificationPreferences["reminderFrequency"] {
  return value === "daily" || value === "weekly" || value === "monthly";
}
