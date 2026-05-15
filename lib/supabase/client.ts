import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;
let hasLoggedEnvStatus = false;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = url?.trim() ?? "";
  const supabaseAnonKey = anonKey?.trim() ?? "";

  logSupabaseEnvStatus(supabaseUrl, supabaseAnonKey);

  if (client) return client;

  if (!supabaseUrl || !supabaseAnonKey) {
    client = null;
    return client;
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = url?.trim() ?? "";
  const supabaseAnonKey = anonKey?.trim() ?? "";

  logSupabaseEnvStatus(supabaseUrl, supabaseAnonKey);

  return Boolean(supabaseUrl && supabaseAnonKey);
}

function hasEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function logSupabaseEnvStatus(url: string | undefined, anonKey: string | undefined) {
  if (process.env.NODE_ENV !== "development" || hasLoggedEnvStatus) return;
  hasLoggedEnvStatus = true;

  console.info("[ArahDana Supabase env]", {
    hasNextPublicSupabaseUrl: hasEnvValue(url),
    hasNextPublicSupabaseAnonKey: hasEnvValue(anonKey),
  });
}
