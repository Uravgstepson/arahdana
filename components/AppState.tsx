import Link from "next/link";
import type { ReactNode } from "react";

export function LoadingState({ title = "Memuat data", message = "Sebentar, ArahDana sedang menyiapkan tampilan." }) {
  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-28 animate-pulse rounded-full bg-stone-200" />
      <div className="mt-5 h-8 w-64 max-w-full animate-pulse rounded-full bg-stone-200" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-[1.2rem] bg-stone-100" />
        <div className="h-20 animate-pulse rounded-[1.2rem] bg-stone-100" />
        <div className="h-20 animate-pulse rounded-[1.2rem] bg-stone-100" />
      </div>
      <p className="sr-only">
        {title}. {message}
      </p>
    </section>
  );
}

export function EmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-[1.6rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">{message}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-rose-100 bg-rose-50 p-6 text-rose-950 shadow-sm" role="alert">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
