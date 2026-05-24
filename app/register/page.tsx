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
  signInWithGoogle,
  signUpWithPassword,
} from "@/lib/supabase/auth";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { isConfigured, isLoading, user, refreshAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, router, user]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      setStatus({
        tone: "error",
        message: "Email wajib diisi dan password minimal 6 karakter.",
      });
      return;
    }

    await runTask(async () => {
      const trimmedEmail = email.trim();
      const data = await signUpWithPassword(trimmedEmail, password, name);
      if (data.session) {
        await refreshAuth();
        router.replace("/dashboard");
        return;
      }

      router.replace(`/auth/confirm?email=${encodeURIComponent(trimmedEmail)}`);
    });
  }

  async function handleGoogleLogin() {
    await runTask(async () => {
      await signInWithGoogle();
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
            : "Pendaftaran belum berhasil diproses.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Register"
      title="Buat akun baru"
      description="Mulai dengan akun pribadi agar semua data investasi tersimpan rapi dan terpisah."
      illustration="growth"
      footer={
        <>
          Sudah punya akun?{" "}
          <Link className="font-semibold text-emerald-700" href="/login">
            Masuk
          </Link>
        </>
      }
    >
      {!isConfigured ? (
        <AuthNotice>
          Pendaftaran online belum aktif. Isi environment Supabase untuk memakai akun.
        </AuthNotice>
      ) : isLoading || user ? (
        <AuthNotice>Memeriksa sesi akun...</AuthNotice>
      ) : (
        <>
          <GoogleButton disabled={isBusy} onClick={handleGoogleLogin} />
          <AuthDivider>atau daftar dengan email</AuthDivider>

          <form onSubmit={handleRegister} className="grid gap-4">
            <AuthField label="Nama">
              <input
                className="input"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama kamu"
              />
            </AuthField>
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </AuthField>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Memproses..." : "Daftar"}
            </button>
          </form>
        </>
      )}

      {status ? <AuthStatus tone={status.tone}>{status.message}</AuthStatus> : null}
    </AuthScreen>
  );
}
