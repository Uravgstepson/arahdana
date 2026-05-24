import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

type AuthStatusTone = "success" | "error" | "info";

export function AuthScreen({
  eyebrow,
  title,
  description,
  footer,
  backHref = "/",
  illustration = "growth",
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  backHref?: string;
  illustration?: "growth" | "login" | "confirm";
  children: ReactNode;
}) {
  return (
    <main className="auth-shell relative isolate mx-auto grid min-h-svh w-full max-w-6xl items-center gap-6 overflow-hidden px-4 py-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,27rem)]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#f7fbf8,#eef7f2)]" />

      <section className="hidden min-w-0 lg:block">
        <div className="max-w-xl">
          <BrandMark variant="full" className="h-14 w-44 rounded-none p-0" />
          <p className="mt-8 w-fit rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-100">
            Private finance workspace
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-stone-950">
            Satu ruang tenang untuk arah dana kamu.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-stone-600">
            Login menjaga portofolio, DCA planner, analisis pasar, dan laporan
            review tetap berada di akun yang sama.
          </p>
          <div className="mt-8 grid max-w-md gap-3">
            <AuthPromise title="Data terpisah per akun" />
            <AuthPromise title="Sinkron antar perangkat" />
            <AuthPromise title="Tetap decision-support, bukan spekulasi" />
          </div>
        </div>
      </section>

      <section className="auth-card auth-card-enter mx-auto w-full max-w-[26rem] overflow-hidden rounded-[2rem] bg-white shadow-[0_26px_80px_rgba(15,23,42,0.18)] ring-1 ring-stone-200/80">
        <div className="relative min-h-52 overflow-hidden rounded-b-[2rem] bg-[#10b981] p-5 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,45,32,0.08),rgba(6,45,32,0.28))]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-48 bg-[url('/icons/Background%20For%20Mobile.png')] bg-cover bg-right opacity-26" />
          <Link
            href={backHref}
            aria-label="Kembali"
            className="relative z-10 inline-grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl leading-none text-white ring-1 ring-white/12 transition-transform active:scale-95"
          >
            {"<"}
          </Link>
          <div className="relative z-10 mt-7 flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {title}
              </h2>
            </div>
            <BrandMark
              variant="icon"
              tone="light"
              className="h-16 w-16 rounded-[1.4rem] p-3"
            />
          </div>
          <AuthIllustration variant={illustration} />
        </div>

        <div className="auth-panel -mt-5 rounded-t-[2rem] bg-white p-5 pt-7 sm:p-6 sm:pt-8">
          <p className="text-center text-sm leading-6 text-stone-500">
            {description}
          </p>
          <div className="mt-6 grid gap-4">{children}</div>
          <div className="auth-footer mt-5 rounded-[1rem] bg-stone-50 p-4 text-center text-sm text-stone-600 ring-1 ring-stone-200/80">
            {footer}
          </div>
        </div>
      </section>
    </main>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-emerald-700">
      {label}
      {children}
    </label>
  );
}

export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1rem] bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-100">
      {children}
    </div>
  );
}

export function AuthStatus({
  tone,
  children,
}: {
  tone: AuthStatusTone;
  children: ReactNode;
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : tone === "error"
        ? "bg-rose-50 text-rose-800 ring-rose-100"
        : "bg-stone-50 text-stone-700 ring-stone-200";

  return (
    <p className={`rounded-[1rem] p-3 text-sm font-medium ring-1 ${className}`}>
      {children}
    </p>
  );
}

export function GoogleButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="auth-google inline-flex min-h-12 items-center justify-center gap-3 rounded-[1rem] bg-white px-4 text-sm font-semibold text-stone-950 ring-1 ring-stone-200 transition-transform hover:bg-stone-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-stone-50 text-sm font-bold text-emerald-700 ring-1 ring-stone-200">
        G
      </span>
      Lanjut dengan Google
    </button>
  );
}

export function AuthDivider({ children = "atau masuk dengan email" }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-400">
      <span className="h-px flex-1 bg-stone-200" />
      <span className="text-center">{children}</span>
      <span className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

function AuthIllustration({ variant }: { variant: "growth" | "login" | "confirm" }) {
  const icon = variant === "confirm" ? "mail" : variant === "login" ? "lock" : "chart";

  return (
    <div className="pointer-events-none absolute bottom-4 right-5 z-10 grid h-24 w-24 place-items-center rounded-[1.6rem] bg-white/16 ring-1 ring-white/18">
      {icon === "mail" ? (
        <svg className="h-14 w-14 text-white" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="10" y="16" width="44" height="32" rx="7" fill="currentColor" opacity="0.96" />
          <path d="M14 21l18 14 18-14" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M41 18l5 5 9-11" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : icon === "lock" ? (
        <svg className="h-14 w-14 text-white" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="14" y="27" width="36" height="25" rx="8" fill="currentColor" opacity="0.96" />
          <path d="M23 27v-7a9 9 0 0118 0v7" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <circle cx="32" cy="39" r="4" fill="#10b981" />
        </svg>
      ) : (
        <svg className="h-14 w-14 text-white" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="12" y="12" width="40" height="40" rx="10" fill="currentColor" opacity="0.96" />
          <path d="M22 39l7-8 6 5 9-13" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 45h24" stroke="#064e3b" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        </svg>
      )}
    </div>
  );
}

function AuthPromise({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.15rem] bg-white/80 p-3 shadow-sm ring-1 ring-stone-200">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
        OK
      </span>
      <p className="text-sm font-semibold text-stone-700">{title}</p>
    </div>
  );
}
