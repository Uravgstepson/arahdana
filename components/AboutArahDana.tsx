"use client";

import Link from "next/link";
import { useState } from "react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import {
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_VERSION_LABEL,
} from "@/lib/appMeta";
import { cn } from "@/lib/utils/format";

export function AboutArahDana({ compact = false }: { compact?: boolean }) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <section
      className={cn(
        compact
          ? "rounded-[1.1rem] bg-white/8 p-4 text-stone-100 ring-1 ring-white/10"
          : "rounded-lg border border-stone-200 bg-white p-5 shadow-sm",
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.14em]",
          compact ? "text-emerald-300" : "text-emerald-700",
        )}
      >
        Tentang
      </p>
      <h2
        className={cn(
          "mt-2 font-semibold tracking-tight",
          compact ? "text-lg text-white" : "text-lg text-stone-950",
        )}
      >
        {APP_NAME}
      </h2>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          compact ? "text-stone-300" : "text-stone-500",
        )}
      >
        {APP_VERSION_LABEL}
      </p>
      <p
        className={cn(
          "mt-3 text-sm leading-6",
          compact ? "text-stone-300" : "text-stone-600",
        )}
      >
        {APP_SHORT_DESCRIPTION}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <TrustLink compact={compact} href="/disclaimer" label="Disclaimer" />
        <TrustLink compact={compact} href="/privacy" label="Privasi" />
        <TrustLink compact={compact} href="/terms" label="Ketentuan" />
      </div>
      <button
        type="button"
        onClick={() => setIsFeedbackOpen(true)}
        className={cn(
          "mt-4 min-h-11 rounded-lg px-4 text-sm font-semibold",
          compact
            ? "bg-emerald-400 text-stone-950"
            : "bg-emerald-700 text-white hover:bg-emerald-800",
        )}
      >
        Kirim masukan
      </button>
      <FeedbackDialog
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </section>
  );
}

function TrustLink({
  compact,
  href,
  label,
}: {
  compact: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        compact
          ? "bg-white/8 text-stone-200 ring-1 ring-white/10"
          : "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
      )}
    >
      {label}
    </Link>
  );
}
