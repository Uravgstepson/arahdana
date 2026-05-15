"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase/auth";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured, isLoading, user, refreshAuth } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  async function runTask(task: () => Promise<void>) {
    setIsBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Login gagal diproses.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handlePassword(mode);
  }

  async function handlePassword(mode: "sign-in" | "sign-up") {
    if (!email.trim() || password.length < 6) {
      setStatus({ tone: "error", message: "Email wajib diisi dan password minimal 6 karakter." });
      return;
    }

    await runTask(async () => {
      if (mode === "sign-up") {
        const data = await signUpWithPassword(email.trim(), password);
        if (data.session) {
          await refreshAuth();
          router.push("/dashboard");
          return;
        }

        try {
          await signInWithPassword(email.trim(), password);
          await refreshAuth();
          router.push("/dashboard");
          return;
        } catch {
          // Supabase requires email confirmation when this sign-in fails after sign-up.
        }

        setStatus({
          tone: "info",
          message:
            "Akun dibuat, tetapi Supabase project ini masih mewajibkan verifikasi email. Untuk development tanpa inbox, matikan Auth > Providers > Email > Confirm email di Supabase, lalu coba daftar lagi.",
        });
        setMode("sign-in");
        return;
      }

      await signInWithPassword(email.trim(), password);
      await refreshAuth();
      router.push("/dashboard");
    });
  }

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">ArahDana account</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-950">
              {mode === "sign-up" ? "Buat akun ArahDana" : "Masuk ke ArahDana"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {mode === "sign-up"
                ? "Daftar dengan email dan password. Setelah itu data bisa disinkronkan ke cloud."
                : "Gunakan email dan password untuk mengaktifkan cloud sync antar perangkat."}
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Supabase free tier
          </span>
        </div>

        {!isConfigured ? (
          <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-100">
            Supabase belum dikonfigurasi. Tambahkan <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code>.
          </div>
        ) : isLoading ? (
          <p className="mt-5 text-sm text-stone-600">Memeriksa sesi login...</p>
        ) : user ? (
          <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 ring-1 ring-emerald-100">
            Sudah login sebagai <strong>{user.email}</strong>. Cloud sync aktif.
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Email
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@contoh.com"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Password
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password minimal 6 karakter"
                />
            </label>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Memproses..." : mode === "sign-up" ? "Buat akun" : "Masuk"}
            </button>
            <div className="rounded-lg bg-stone-100 p-4 text-center text-sm text-stone-600">
              {mode === "sign-up" ? "Sudah punya akun?" : "Belum punya akun?"}
              <button
                type="button"
                onClick={() => {
                  setStatus(null);
                  setMode((current) => (current === "sign-up" ? "sign-in" : "sign-up"));
                }}
                disabled={isBusy}
                className="ml-2 rounded-full bg-white px-3 py-1 font-semibold text-emerald-700 ring-1 ring-stone-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mode === "sign-up" ? "Masuk" : "Buat akun baru"}
              </button>
            </div>
          </form>
        )}

        {status ? (
          <p
            className={`mt-4 text-sm font-medium ${
              status.tone === "success"
                ? "text-emerald-700"
                : status.tone === "error"
                  ? "text-rose-700"
                  : "text-stone-600"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-sm">
        ArahDana tidak menghubungkan rekening bank, e-wallet, atau Bibit asli dan tidak meminta password akun finansial.
      </section>
    </div>
  );
}
