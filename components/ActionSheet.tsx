"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/format";

export function ActionSheet({
  children,
  className,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-stone-950/42 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup"
        onClick={onClose}
      />
      <div
        className={cn(
          "motion-drawer relative w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white/94 p-4 text-stone-950 shadow-[0_24px_90px_rgba(15,23,42,0.28)] backdrop-blur-3xl",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
