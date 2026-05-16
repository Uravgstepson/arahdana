"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "warning" | "info" | "error";
type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

export function dispatchToast(toast: Omit<ToastItem, "id">) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("arahdana:toast", {
      detail: {
        ...toast,
        id: crypto.randomUUID(),
      },
    }),
  );
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastItem>).detail;
      if (!detail?.title) return;
      setToasts((current) => [detail, ...current].slice(0, 3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== detail.id));
      }, 4800);
    }

    window.addEventListener("arahdana:toast", handleToast);
    return () => window.removeEventListener("arahdana:toast", handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[80] grid gap-2 sm:left-auto sm:right-5 sm:w-96">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-[1.2rem] border bg-white/90 p-4 text-sm shadow-sm backdrop-blur-2xl ${toneClass(toast.tone)}`}
          role="status"
        >
          <p className="font-semibold text-stone-950">{toast.title}</p>
          {toast.message ? (
            <p className="mt-1 leading-6 text-stone-600">{toast.message}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function toneClass(tone: ToastTone) {
  if (tone === "success") return "border-emerald-100";
  if (tone === "warning") return "border-amber-100";
  if (tone === "error") return "border-rose-100";
  return "border-stone-200";
}
