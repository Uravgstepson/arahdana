import type { NotificationPreferences, UserSettings } from "@/lib/types/investment";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  browserEnabled: false,
  reminderFrequency: "monthly",
  enabledTypes: ["reminder", "risk", "watchlist", "goal", "portfolio", "market"],
  quietMode: false,
  mobileVibration: false,
  weeklySummary: true,
  lastGeneratedAt: {},
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  capital: 10_000_000,
  riskTolerance: 15,
  timeHorizon: "medium",
  preferredInstruments: ["money_market_fund", "bond_fund", "stock"],
  aprMoneyMarketFund: 0.05,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
};
