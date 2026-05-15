import type { User } from "@supabase/supabase-js";
import type { ArahDanaBackupData } from "@/lib/utils/backup";
import type { PortfolioItem, UserSettings, WatchlistItem } from "@/lib/types/investment";
import { getSupabaseClient } from "@/lib/supabase/client";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  updated_at: string | null;
};

export type CloudData = {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  settings: UserSettings;
  updated_at: string | null;
};

export async function sendLoginLink(email: string) {
  const supabase = requireSupabase();
  const redirectTo = `${window.location.origin}/profile`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = requireSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("arahdana_profiles")
    .select("id,email,display_name,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as UserProfile;

  return upsertUserProfile(user, "");
}

export async function upsertUserProfile(user: User, displayName: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("arahdana_profiles")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayName.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select("id,email,display_name,updated_at")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function saveBackupOnline(user: User, backup: ArahDanaBackupData) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("arahdana_user_data")
    .upsert({
      user_id: user.id,
      portfolio: toJson(backup.portfolio),
      watchlist: toJson(backup.watchlist),
      settings: toJson(backup.settings),
      updated_at: new Date().toISOString(),
    })
    .select("updated_at")
    .single();

  if (error) throw error;
  return data as { updated_at: string | null };
}

export async function loadBackupOnline(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("arahdana_user_data")
    .select("portfolio,watchlist,settings,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
    watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
    settings: isRecord(data.settings) ? data.settings : {},
    updated_at: typeof data.updated_at === "string" ? data.updated_at : null,
  } as CloudData;
}

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase belum dikonfigurasi.");
  }
  return supabase;
}

function toJson<T>(value: T): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
