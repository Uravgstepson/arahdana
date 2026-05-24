import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-stone-100/80 text-stone-700 ring-stone-200/80",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-900 ring-amber-200/80",
  danger: "bg-rose-50 text-rose-800 ring-rose-200/80",
  info: "bg-cyan-50 text-cyan-800 ring-cyan-200/80",
};

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cn(
        "ui-card w-full max-w-full min-w-0 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Button({
  className,
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
}) {
  return (
    <button
      {...props}
      className={cn(buttonClass(variant), className)}
    />
  );
}

export function ButtonLink({
  className,
  href,
  variant = "secondary",
  children,
}: {
  className?: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonClass(variant), className)}>
      {children}
    </Link>
  );
}

export function Chip({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none ring-1",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full items-center rounded-full px-2.5 py-1 text-[0.7rem] font-semibold leading-none ring-1",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-stone-950">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-block rounded-[1rem]", className)} />;
}

function buttonClass(variant: "primary" | "secondary" | "ghost" | "danger" | "icon") {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-4 text-sm font-semibold leading-none ring-1 transition-all disabled:cursor-not-allowed disabled:opacity-55";

  if (variant === "primary") {
    return `${base} bg-emerald-500 text-white ring-emerald-500/40 shadow-[0_10px_24px_rgba(16,185,129,0.18)] hover:bg-emerald-600 active:bg-emerald-700`;
  }

  if (variant === "danger") {
    return `${base} bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 active:bg-rose-100`;
  }

  if (variant === "ghost") {
    return `${base} bg-transparent text-stone-700 ring-transparent hover:bg-stone-50 active:bg-stone-100`;
  }

  if (variant === "icon") {
    return "inline-grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-white text-stone-950 shadow-sm ring-1 ring-stone-200 transition-all hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-55";
  }

  return `${base} bg-stone-950/5 text-stone-700 ring-stone-200/90 hover:bg-stone-950/10 active:bg-stone-950/10`;
}
