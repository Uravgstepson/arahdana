"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { isConfigured, isLoading, profile, user } = useAuth();
  const displayName = getDisplayName(profile?.display_name, user?.email);
  const email = profile?.email || user?.email || "Belum login";
  const initials = getInitials(displayName);
  const avatarUrl = getAvatarUrl(user?.user_metadata);

  return (
    <div className="grid max-w-3xl gap-5">
      <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-50 text-2xl font-bold text-emerald-800 ring-1 ring-emerald-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight text-stone-950">
              {displayName}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-stone-500">
              {email}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Foto profil</h2>
        <div className="mt-4 rounded-[1.2rem] bg-stone-100 p-4">
          <p className="text-sm font-medium text-stone-600">
            Upload foto profil belum aktif di beta ini.
          </p>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Data akun</h2>
        <p className="mt-2 text-sm font-medium text-stone-600">
          {isLoading
            ? "Memeriksa sesi..."
            : !isConfigured
              ? "Supabase belum dikonfigurasi."
              : user
                ? "Data aman untuk akun ini."
                : "Data aman di perangkat ini. Login agar lebih mudah dipakai di perangkat lain."}
        </p>
        <Link
          href={user ? "/settings" : "/login"}
          className="mt-4 inline-flex min-h-11 items-center rounded-[1rem] bg-stone-950 px-4 text-sm font-semibold text-white"
        >
          {user ? "Kelola settings" : "Login"}
        </Link>
      </section>
    </div>
  );
}

function getDisplayName(displayName?: string | null, email?: string | null) {
  const profileName = displayName?.trim();
  if (profileName) return profileName;

  const emailName = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (emailName) return titleCase(emailName);

  return "Investor";
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "I";
}

function getAvatarUrl(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const record = metadata as Record<string, unknown>;
  if (typeof record.avatar_url === "string") return record.avatar_url;
  if (typeof record.picture === "string") return record.picture;
  return "";
}
