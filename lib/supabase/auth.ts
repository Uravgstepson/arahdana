"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  email: string;
  display_name: string | null;
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
  const redirectTo = `${window.location.origin}/dashboard`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
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

export async function signOut() {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserProfile(user: User) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
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
    .from("profiles")
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
