"use client";

import * as Sentry from "@sentry/nextjs";
import { track } from "@vercel/analytics";

export type AppEventName =
  | "login_success"
  | "portfolio_added"
  | "portfolio_deleted"
  | "csv_import_used"
  | "market_search_used"
  | "privacy_mode_enabled"
  | "app_lock_enabled"
  | "feedback_sent";

type SafeEventProperties = Record<string, string | number | boolean | null>;

const allowedPropertyKeys = new Set([
  "page",
  "route",
  "source",
  "status",
  "mode",
  "count",
]);

export function trackAppEvent(
  name: AppEventName,
  properties: SafeEventProperties = {},
) {
  if (typeof window === "undefined") return;
  const safeProperties = sanitizeProperties(properties);

  try {
    track(name, safeProperties);
  } catch {
    // Analytics must never interrupt the app flow.
  }

  Sentry.addBreadcrumb({
    category: "app.event",
    level: "info",
    message: name,
    data: safeProperties,
  });
}

function sanitizeProperties(properties: SafeEventProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        allowedPropertyKeys.has(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null),
    ),
  );
}
