"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  AuthDivider,
  AuthField,
  AuthNotice,
  AuthScreen,
  AuthStatus,
  GoogleButton,
} from "@/components/AuthScreen";
import {
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
} from "@/lib/supabase/auth";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured, isLoading, user, refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) setNextPath(next);

      if (params.get("error")) {
        setStatus({
          tone: "error",
          message: "Login dibatalkan atau belum berhasil. Silakan coba lagi.",
        });
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isLoading && user) router.replace(nextPath);
  }, [isLoading, nextPath, router, user]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setStatus({
        tone: "error",
        message: "Email wajib diisi dan password minimal 6 karakter.",
      });
      return;
    }

    await runTask(async () => {
      await signInWithPassword(email.trim(), password);
      await refreshAuth();
      router.replace(nextPath);
    });
  }

  async function handleGoogleLogin() {
    await runTask(async () => {
      await signInWithGoogle();
    });
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setStatus({
        tone: "info",
        message: "Isi email dulu, lalu kami kirim tautan reset password.",
      });
      return;
    }

    await runTask(async () => {
      await sendPasswordReset(email.trim());
      setStatus({
        tone: "success",
        message: "Tautan reset password sudah dikirim ke email kamu.",
      });
    });
  }

  async function runTask(task: () => Promise<void>) {
    setIsBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Login belum berhasil diproses.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Login"
      title="Masuk ke ArahDana"
      description="Jaga portfolio, goals, analisis pasar, dan laporan tetap berada di akun yang sama."
      illustration="login"
      footer={
        <>
          Belum punya akun?{" "}
          <Link className="font-semibold text-emerald-700" href="/register">
            Daftar
          </Link>
        </>
      }
    >
      {!isConfigured ? (
        <AuthNotice>
          Login online belum aktif. Isi environment Supabase untuk memakai akun.
        </AuthNotice>
      ) : isLoading || user ? (
        <AuthNotice>Memeriksa sesi akun...</AuthNotice>
      ) : (
        <>
          <GoogleButton disabled={isBusy} onClick={handleGoogleLogin} />
          <AuthDivider>atau masuk dengan email</AuthDivider>

          <form onSubmit={handleEmailLogin} className="grid gap-4">
            <AuthField label="Email">
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@contoh.com"
              />
            </AuthField>
            <AuthField label="Password">
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </AuthField>
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
              <label className="inline-flex min-h-8 items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600 accent-emerald-500"
                />
                Ingat sesi
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isBusy}
                className="font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Lupa password?
              </button>
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </>
      )}

      {status ? <AuthStatus tone={status.tone}>{status.message}</AuthStatus> : null}
    </AuthScreen>
  );
}
