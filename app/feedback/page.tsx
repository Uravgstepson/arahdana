"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { requireSupabase } from "@/lib/supabase/auth";

const LOCAL_FEEDBACK_KEY = "arahdana.feedback.local";

type FeedbackRecord = {
  id: string;
  message: string;
  email: string | null;
  appVersion: string;
  createdAt: string;
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyableText = useMemo(
    () =>
      [
        `ArahDana feedback (${APP_VERSION_LABEL})`,
        user?.email ? `User: ${user.email}` : "User: local mode",
        "",
        message.trim() || "(tulis feedback di sini)",
      ].join("\n"),
    [message, user?.email],
  );

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    setStatus(null);

    if (trimmed.length < 10) {
      setStatus({ tone: "error", message: "Feedback terlalu pendek. Tulis minimal 10 karakter." });
      return;
    }

    if (trimmed.length > 4000) {
      setStatus({ tone: "error", message: "Feedback terlalu panjang. Batas beta saat ini 4000 karakter." });
      return;
    }

    setIsSubmitting(true);
    try {
      if (user) {
        const supabase = requireSupabase();
        const { error } = await supabase.from("feedback").insert({
          user_id: user.id,
          email: user.email ?? null,
          message: trimmed,
          app_version: APP_VERSION_LABEL,
          page_url: window.location.href,
        });
        if (error) throw error;
        setStatus({ tone: "success", message: "Feedback tersimpan ke Supabase. Terima kasih." });
      } else {
        saveLocalFeedback({
          id: crypto.randomUUID(),
          message: trimmed,
          email: null,
          appVersion: APP_VERSION_LABEL,
          createdAt: new Date().toISOString(),
        });
        setStatus({
          tone: "info",
          message: "Kamu belum login, jadi feedback disimpan lokal di browser ini. Teks di bawah juga bisa disalin.",
        });
      }
      setMessage("");
    } catch (error) {
      saveLocalFeedback({
        id: crypto.randomUUID(),
        message: trimmed,
        email: user?.email ?? null,
        appVersion: APP_VERSION_LABEL,
        createdAt: new Date().toISOString(),
      });
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? `Supabase gagal menyimpan feedback, jadi salinan lokal dibuat. ${error.message}`
            : "Supabase gagal menyimpan feedback, jadi salinan lokal dibuat.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyFeedback() {
    try {
      await navigator.clipboard.writeText(copyableText);
      setStatus({ tone: "success", message: "Teks feedback disalin." });
    } catch {
      setStatus({ tone: "error", message: "Browser tidak mengizinkan salin otomatis. Pilih teks di bawah lalu salin manual." });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-6 text-white">
        <p className="text-sm font-medium text-white/62">Beta feedback</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Bantu rapikan ArahDana</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          Kirim bug, bagian yang membingungkan, fitur yang hilang, atau hasil analisis yang terasa tidak masuk akal.
        </p>
      </section>

      <form onSubmit={submitFeedback} className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">Tulis feedback</h3>
            <p className="mt-1 text-sm text-stone-600">
              {user ? "Feedback akan disimpan ke Supabase." : "Mode lokal: feedback disimpan di browser dan bisa disalin."}
            </p>
          </div>
          <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {APP_VERSION_LABEL}
          </span>
        </div>
        <textarea
          className="input mt-4 min-h-40"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Contoh: Saat impor CSV, baris dengan harga kosong sebaiknya diberi pesan lebih spesifik..."
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Kirim feedback"}
          </button>
          <button
            type="button"
            onClick={copyFeedback}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Salin teks
          </button>
        </div>
        {status ? (
          <p
            className={`mt-3 text-sm font-medium ${
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
      </form>

      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-950">Teks copyable</h3>
        <textarea className="input mt-3 min-h-36 font-mono text-xs" readOnly value={copyableText} />
      </section>
    </div>
  );
}

function saveLocalFeedback(record: FeedbackRecord) {
  const existing = readLocalFeedback();
  window.localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify([record, ...existing].slice(0, 20)));
}

function readLocalFeedback(): FeedbackRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_FEEDBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
