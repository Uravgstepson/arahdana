"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PortfolioHealthBreakdown } from "@/components/PortfolioHealthBreakdown";
import { PrivateValue } from "@/components/PrivateValue";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { loadCloudPortfolio, loadCloudReports } from "@/lib/supabase/sync";
import type {
  PortfolioItem,
  PortfolioReviewReport,
  UserSettings,
} from "@/lib/types/investment";
import { formatPercent, formatRupiah, nonNegativeNumber } from "@/lib/utils/format";

type JournalEntry = {
  id: string;
  note: string;
  createdAt: string;
};

type ReviewData = {
  portfolio: PortfolioItem[];
  reports: PortfolioReviewReport[];
  journal: JournalEntry[];
  settings: Partial<UserSettings>;
};

const JOURNAL_STORAGE_KEY = "arahdana.journal";

export default function ReviewPage() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [data, setData] = useState<ReviewData>(() => emptyReviewData());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const localData = readReviewData(!isConfigured);
        try {
          const accountData = user
            ? {
                ...localData,
                portfolio: await loadCloudPortfolio(user),
                reports: sortReports(await loadCloudReports(user)),
              }
            : localData;
          if (!isMounted) return;
          setData(accountData);
        } catch {
          if (!isMounted) return;
          setData({ ...localData, portfolio: [], reports: [] });
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isAuthLoading, isConfigured, user]);

  const latestReport = data.reports[0] ?? null;
  const latestJournal = data.journal[0] ?? null;
  const settings = normalizeReviewSettings(data.settings);

  return (
    <div className="space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.6rem] p-5 text-white shadow-[0_22px_54px_rgba(6,78,59,0.18)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/78">
              Review
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Jurnal, laporan, dan health score
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Satu tempat untuk membaca kondisi portofolio, mencatat keputusan,
              dan melihat snapshot laporan berkala.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[21rem]">
            <HeroMetric label="Holding" value={String(data.portfolio.length)} />
            <HeroMetric label="Journal" value={String(data.journal.length)} />
            <HeroMetric label="Reports" value={String(data.reports.length)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ReviewShortcut
          title="Journal"
          helper={latestJournal ? latestJournal.note : "Catat alasan keputusan investasi."}
          href="/journal"
          meta={latestJournal ? formatDate(latestJournal.createdAt) : "Belum ada catatan"}
        />
        <ReviewShortcut
          title="Reports"
          helper={latestReport ? latestReport.summary : "Buat laporan portfolio review berkala."}
          href="/reports"
          meta={latestReport ? `${latestReport.healthScore}/100 health` : "Belum ada laporan"}
        />
        <ReviewShortcut
          title="Portfolio"
          helper="Kelola holding dan alokasi dari halaman Porto."
          href="/portfolio"
          meta={`${formatRiskTolerance(settings.riskTolerance)} risk tolerance`}
        />
      </section>

      {isHydrated && data.portfolio.length > 0 ? (
        <PortfolioHealthBreakdown
          portfolio={data.portfolio}
          riskTolerance={settings.riskTolerance}
          aprMoneyMarketFund={settings.aprMoneyMarketFund}
        />
      ) : (
        <section className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Health Score belum tersedia
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Tambahkan holding di Porto agar Review bisa menampilkan health score
            dan breakdown portofolio.
          </p>
          <Link
            href="/portfolio"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[1rem] bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm"
          >
            Buka Porto
          </Link>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Laporan terbaru" actionHref="/reports" />
          {latestReport ? (
            <div className="mt-4 rounded-[1.15rem] bg-stone-50/80 p-4 ring-1 ring-stone-200/80">
              <p className="text-sm font-semibold text-stone-950">
                {latestReport.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {latestReport.summary}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniMetric label="Value" value={<PrivateValue>{formatRupiah(latestReport.portfolioValue)}</PrivateValue>} />
                <MiniMetric label="P/L" value={formatPercent(latestReport.gainLossPercent)} />
                <MiniMetric label="Health" value={`${latestReport.healthScore}/100`} />
              </div>
            </div>
          ) : (
            <EmptyPanel text="Belum ada laporan tersimpan." />
          )}
        </section>

        <section className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
          <SectionTitle title="Catatan terbaru" actionHref="/journal" />
          {latestJournal ? (
            <article className="mt-4 rounded-[1.15rem] bg-stone-50/80 p-4 ring-1 ring-stone-200/80">
              <time className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {formatDate(latestJournal.createdAt)}
              </time>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                {latestJournal.note}
              </p>
            </article>
          ) : (
            <EmptyPanel text="Belum ada catatan jurnal." />
          )}
        </section>
      </section>
    </div>
  );
}

function ReviewShortcut({
  title,
  helper,
  href,
  meta,
}: {
  title: string;
  helper: string;
  href: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:bg-stone-50"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
        {meta}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
        {helper}
      </p>
    </Link>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-white/8 p-3 text-center ring-1 ring-white/10">
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/48">
        {label}
      </p>
    </div>
  );
}

function SectionTitle({ title, actionHref }: { title: string; actionHref: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <Link href={actionHref} className="text-sm font-semibold text-emerald-700">
        Buka
      </Link>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[0.95rem] bg-white p-3 ring-1 ring-stone-200/80">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stone-950">
        {value}
      </p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-[1.15rem] border border-dashed border-stone-300 p-6 text-center text-sm font-medium text-stone-500">
      {text}
    </div>
  );
}

function emptyReviewData(): ReviewData {
  return {
    portfolio: [],
    reports: [],
    journal: [],
    settings: {},
  };
}

function readReviewData(includeLocalPortfolio: boolean): ReviewData {
  return {
    portfolio: includeLocalPortfolio ? localArahDanaStorage.readPortfolio() ?? [] : [],
    reports: includeLocalPortfolio ? sortReports(localArahDanaStorage.readReports() ?? []) : [],
    journal: readJournalEntries(),
    settings: localArahDanaStorage.readSettings() ?? {},
  };
}

function readJournalEntries() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(JOURNAL_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJournalEntry).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.note === "string" &&
    typeof record.createdAt === "string"
  );
}

function sortReports(items: PortfolioReviewReport[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

function normalizeReviewSettings(settings: Partial<UserSettings>) {
  return {
    riskTolerance: nonNegativeNumber(
      settings.riskTolerance ?? DEFAULT_USER_SETTINGS.riskTolerance,
    ),
    aprMoneyMarketFund: nonNegativeNumber(
      settings.aprMoneyMarketFund ??
        DEFAULT_USER_SETTINGS.aprMoneyMarketFund ??
        0.05,
    ),
  };
}

function formatRiskTolerance(value: number) {
  return `${value}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
