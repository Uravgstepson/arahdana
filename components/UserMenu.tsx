"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/lib/supabase/auth";

export function UserMenu() {
  const { user, profile, refreshAuth } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    setIsBusy(true);
    try {
      await signOut();
      await refreshAuth();
      setIsOpen(false);
      router.replace("/login");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="relative z-[100]">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
      >
        Data aman
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-[1000] mt-2 w-64 rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-stone-950">{profile?.display_name || user.email}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{user.email}</p>
          <p className="mt-3 text-xs leading-5 text-stone-600">
            Data aplikasi dijaga agar tetap rapi di akun ini.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isBusy}
            className="mt-4 w-full rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Logout..." : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
