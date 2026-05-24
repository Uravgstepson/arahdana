import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/format";

export function FocusedFlowShell({
  eyebrow,
  title,
  description,
  backHref,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.6rem] p-5 text-white shadow-[0_22px_54px_rgba(6,78,59,0.18)] sm:p-6">
        <Link
          href={backHref}
          className="inline-flex min-h-9 items-center rounded-full bg-white/8 px-3 text-xs font-semibold text-white/70 ring-1 ring-white/10"
        >
          Back
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/78">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
          {description}
        </p>
      </section>
      {children}
    </div>
  );
}

export function FlowPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function FlowStep({
  number,
  title,
  active = false,
}: {
  number: number;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ring-1",
        active
          ? "bg-stone-950 text-white ring-stone-950"
          : "bg-stone-100 text-stone-600 ring-stone-200",
      )}
    >
      <span>{number}</span>
      <span>{title}</span>
    </div>
  );
}

export function StickyFlowActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-20 rounded-[1.25rem] border border-stone-200 bg-white/92 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl lg:bottom-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{children}</div>
    </div>
  );
}
