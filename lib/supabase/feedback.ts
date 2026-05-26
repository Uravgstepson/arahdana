"use client";

import type { User } from "@supabase/supabase-js";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { requireSupabase } from "@/lib/supabase/auth";

export async function submitBetaFeedback({
  message,
  page,
  user,
}: {
  message: string;
  page: string;
  user: User;
}) {
  const cleanMessage = message.trim();
  if (cleanMessage.length < 3) {
    throw new Error("Masukan terlalu pendek.");
  }

  const supabase = requireSupabase();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    message: cleanMessage.slice(0, 2000),
    page: page.slice(0, 240),
    page_url: page.slice(0, 240),
    app_version: APP_VERSION_LABEL,
  });

  if (error) throw error;
}
