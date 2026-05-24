import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const publicPaths = new Set([
  "/",
  "/login",
  "/register",
  "/auth/confirm",
  "/auth/callback",
  "/beta",
]);

const authPaths = new Set(["/login", "/register"]);

const protectedPrefixes = [
  "/home",
  "/dashboard",
  "/portfolio",
  "/porto",
  "/analysis",
  "/analyzer",
  "/market",
  "/market-insight",
  "/market-prices",
  "/goals",
  "/settings",
  "/alerts",
  "/reports",
  "/notifications",
  "/pantau",
  "/watchlist",
  "/profile",
  "/journal",
  "/review",
  "/integrations",
  "/onboarding",
  "/feedback",
  "/beta-test",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, user } = await updateSupabaseSession(request);
  const isPublic = publicPaths.has(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  if (authPaths.has(pathname) && user) {
    return redirectWithCookies(new URL("/dashboard", request.url), response);
  }

  const isListedProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isProtected = isListedProtected || (!isPublic && !isApiRoute);

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(loginUrl, response);
  }

  if (!isPublic && !isProtected) {
    return response;
  }

  return response;
}

function redirectWithCookies(url: URL, sourceResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline.html|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
