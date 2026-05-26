import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppPath } from "@/lib/routes";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeAppPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await upsertServerProfile(supabase, user).catch(() => undefined);
      }
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth_callback");
  return NextResponse.redirect(loginUrl);
}

async function upsertServerProfile(
  supabase: SupabaseClient,
  user: User,
) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    readStringValue(metadata.full_name) ||
    readStringValue(metadata.name) ||
    readStringValue(metadata.display_name) ||
    nameFromEmail(user.email);
  const avatarUrl =
    readStringValue(metadata.avatar_url) ||
    readStringValue(metadata.picture) ||
    null;
  const provider =
    (typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : "") ||
    user.identities?.[0]?.provider ||
    "email";

  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    display_name: fullName || null,
    full_name: fullName || null,
    avatar_url: avatarUrl,
    provider,
    updated_at: new Date().toISOString(),
  });
}

function readStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function nameFromEmail(email?: string) {
  const name = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
