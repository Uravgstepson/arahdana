"use client";

import { requireSupabase, signOut } from "@/lib/supabase/auth";
import { clearArahDanaData } from "@/lib/utils/backup";

export async function deleteCurrentUserAccountAndData() {
  const supabase = requireSupabase();

  const { error } = await supabase.rpc("delete_current_user_account");
  if (error) throw error;

  clearArahDanaData();
  await signOut();
}
