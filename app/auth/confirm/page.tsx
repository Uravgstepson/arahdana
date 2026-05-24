"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  AuthNotice,
  AuthScreen,
  AuthStatus,
} from "@/components/AuthScreen";
import { resendSignupConfirmation } from "@/lib/supabase/auth";

type Status = {
  tone: "success" | "error" | "info";
  message: string;
};

export default function ConfirmEmailPage() {
  const router = useRouter();
  const { isConfigured, isLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setEmail(params.get("email") ?? "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, router, user]);

  async function handleResendEmail() {
    if (!email.trim()) {
      setStatus({
        tone: "info",
        message: "Masukkan ulang dari halaman daftar agar email tujuan terbaca.",
      });
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await resendSignupConfirmation(email.trim());
      setStatus({
        tone: "success",
        message: "Email konfirmasi sudah dikirim ulang.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Email konfirmasi belum bisa dikirim ulang.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Konfirmasi"
      title="Cek email kamu"
      description="Kami sudah mengirim tautan konfirmasi. Buka email untuk mengaktifkan akun."
      illustration="confirm"
      footer={
        <>
          Sudah aktif?{" "}
          <Link className="font-semibold text-emerald-700" href="/login">
            Kembali ke login
          </Link>
        </>
      }
    >
      {!isConfigured ? (
        <AuthNotice>
          Konfirmasi online belum aktif. Isi environment Supabase untuk memakai akun.
        </AuthNotice>
      ) : isLoading || user ? (
        <AuthNotice>Memeriksa sesi akun...</AuthNotice>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-[1.4rem] bg-emerald-500 p-5 text-center text-white shadow-[0_18px_42px_rgba(16,185,129,0.24)]">
            <p className="text-sm font-semibold">
              {email ? `Kami mengirim ke ${email}` : "Email konfirmasi sudah siap dikirim ulang."}
            </p>
            <p className="mt-2 text-xs leading-5 text-emerald-50">
              Buka tautan dari email yang sama agar akun langsung tersambung.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isBusy}
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-stone-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Mengirim..." : "Kirim ulang email"}
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-[1rem] bg-stone-100 px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-200"
          >
            Kembali ke login
          </Link>
        </div>
      )}

      {status ? <AuthStatus tone={status.tone}>{status.message}</AuthStatus> : null}
    </AuthScreen>
  );
}
