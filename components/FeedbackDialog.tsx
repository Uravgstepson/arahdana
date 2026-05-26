"use client";

import { type FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { ActionSheet } from "@/components/ActionSheet";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import { trackAppEvent } from "@/lib/monitoring/events";
import { submitBetaFeedback } from "@/lib/supabase/feedback";

export function FeedbackDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Login dulu agar masukan bisa dikirim.");
      return;
    }

    setIsSending(true);
    try {
      await submitBetaFeedback({
        message,
        page: pathname,
        user,
      });
      trackAppEvent("feedback_sent", { page: pathname });
      setMessage("");
      onClose();
      dispatchToast({
        tone: "success",
        title: "Masukan terkirim",
        message: "Terima kasih. Ini membantu ArahDana makin enak dipakai.",
      });
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Masukan belum bisa dikirim.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ActionSheet labelledBy="feedback-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <p
            id="feedback-title"
            className="text-lg font-semibold text-stone-950"
          >
            Kirim masukan
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Ceritakan yang membingungkan, rusak, atau terasa kurang pas.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Masukan
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Tulis masukan beta di sini..."
            className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium leading-6 text-stone-950 outline-none transition focus:border-emerald-300 focus:bg-white"
          />
        </label>
        <p className="text-xs leading-5 text-stone-500">
          Jangan tulis nominal, password, atau data sensitif.
        </p>
        {error ? (
          <p className="rounded-[1rem] bg-rose-50 p-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-100">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[1rem] bg-stone-100 px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-200"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSending || message.trim().length < 3}
            className="min-h-11 rounded-[1rem] bg-emerald-600 px-4 text-sm font-semibold text-white ring-1 ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Mengirim..." : "Kirim"}
          </button>
        </div>
      </form>
    </ActionSheet>
  );
}
