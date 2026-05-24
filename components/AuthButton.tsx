"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { UserMenu } from "@/components/UserMenu";

export function AuthButton() {
  const { isConfigured, isLoading, user } = useAuth();

  if (!isConfigured) {
    return (
      <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
        Aman
      </span>
    );
  }

  if (isLoading) {
    return (
      <span className="w-fit rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-500 ring-1 ring-white/70">
        Memeriksa akun...
      </span>
    );
  }

  if (user) return <UserMenu />;

  return (
    <Link
      href="/login"
      className="w-fit rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800"
    >
      Masuk
    </Link>
  );
}
