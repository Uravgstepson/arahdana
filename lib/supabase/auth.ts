"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { clearArahDanaRuntimeState } from "@/lib/storage/localStorage";

export type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
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

export async function sendMagicLink(email: string) {
  const supabase = requireSupabase();
  const redirectTo = getAuthCallbackUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName = "",
) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName.trim() || undefined,
        full_name: displayName.trim() || undefined,
      },
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignupConfirmation(email: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getAuthCallbackUrl(),
    },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthCallbackUrl(),
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = requireSupabase();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } finally {
    clearArahDanaRuntimeState();
  }
}

function getAuthCallbackUrl() {
  if (typeof window === "undefined") return "/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

export async function getUserProfile(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,full_name,avatar_url,provider,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserProfile;

  return upsertUserProfile(user);
}

export async function upsertUserProfile(user: User, displayName = "") {
  const supabase = requireSupabase();
  const metadata = getUserMetadata(user);
  const fullName =
    displayName.trim() ||
    metadata.fullName ||
    metadata.displayName ||
    getNameFromEmail(user.email);
  const avatarUrl = metadata.avatarUrl || null;
  const provider = getUserProvider(user);
  const email = user.email ?? "";
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email,
      display_name: fullName || null,
      full_name: fullName || null,
      avatar_url: avatarUrl,
      provider,
      updated_at: new Date().toISOString(),
    })
    .select("id,email,display_name,full_name,avatar_url,provider,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

function getUserMetadata(user: User) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    readStringValue(metadata.full_name) ||
    readStringValue(metadata.name) ||
    readStringValue(metadata.fullName);
  const displayName =
    readStringValue(metadata.display_name) ||
    readStringValue(metadata.displayName) ||
    fullName;
  const avatarUrl =
    readStringValue(metadata.avatar_url) ||
    readStringValue(metadata.picture) ||
    readStringValue(metadata.avatarUrl);
  return { fullName, displayName, avatarUrl };
}

function getUserProvider(user: User) {
  const appMetadata = user.app_metadata ?? {};
  const provider = readStringValue(appMetadata.provider);
  if (provider) return provider;
  return user.identities?.[0]?.provider ?? "email";
}

function readStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNameFromEmail(email?: string) {
  const name = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
