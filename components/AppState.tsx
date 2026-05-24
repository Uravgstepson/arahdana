import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ButtonLink, Card, SkeletonBlock } from "@/components/ui";

export function LoadingState({
  title = "Memuat data",
  message = "Sebentar, ArahDana sedang menyiapkan tampilan.",
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <BrandMark
          variant="icon"
          tone="light"
          className="motion-safe:animate-pulse"
        />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <SkeletonBlock className="mt-5 h-8 w-64 max-w-full" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SkeletonBlock className="h-20 rounded-[1.2rem]" />
        <SkeletonBlock className="h-20 rounded-[1.2rem]" />
        <SkeletonBlock className="h-20 rounded-[1.2rem]" />
      </div>
      <p className="sr-only">
        {title}. {message}
      </p>
    </Card>
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
    <Card className="border-dashed p-6 text-center">
      <BrandMark variant="full" className="mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
        {message}
      </p>
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref} variant="primary" className="mt-4">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </Card>
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
    <section
      className="rounded-[1.45rem] border border-rose-100 bg-rose-50 p-6 text-rose-950 shadow-sm"
      role="alert"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
