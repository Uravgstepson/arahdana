export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

const appRoutePaths = new Set([
  "/",
  "/about",
  "/alerts",
  "/analysis/new",
  "/analysis/result",
  "/analyzer",
  "/auth/confirm",
  "/auth/callback",
  "/beta",
  "/beta-test",
  "/changelog",
  "/dashboard",
  "/disclaimer",
  "/feedback",
  "/goals",
  "/goals/edit",
  "/goals/new",
  "/home",
  "/integrations",
  "/journal",
  "/login",
  "/market",
  "/market-insight",
  "/market-prices",
  "/market/compare",
  "/market/search",
  "/market/watchlist/add",
  "/notifications",
  "/onboarding",
  "/pantau",
  "/portfolio",
  "/porto/add",
  "/porto/edit",
  "/porto/import",
  "/porto/manage",
  "/profile",
  "/privacy",
  "/register",
  "/reports",
  "/review",
  "/settings",
  "/terms",
  "/watchlist",
]);

export function normalizeAppPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  const path = parseLocalPath(value);
  if (!path) return fallback;

  const [pathname = "", search = ""] = path.split("?");
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;

  if (!appRoutePaths.has(normalizedPathname)) return fallback;
  return search ? `${normalizedPathname}?${search}` : normalizedPathname;
}

export function isAppPath(value: string | null | undefined) {
  return normalizeAppPath(value, "") !== "";
}

function parseLocalPath(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("//")) return "";

  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}
