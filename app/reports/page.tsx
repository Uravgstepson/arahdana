"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingState } from "@/components/AppState";
import { useAuth } from "@/components/AuthProvider";
import { dispatchToast } from "@/components/ToastViewport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  loadCloudReports,
  saveCloudReports,
} from "@/lib/supabase/sync";
import {
  generatePortfolioReviewReport,
  reportTypeLabels,
} from "@/lib/reports/generateReport";
import type {
  AlertRule,
  AppNotification,
  FinancialGoal,
  GoalContribution,
  PortfolioItem,
  PortfolioReviewReport,
  ReportScoreSet,
  ReportType,
  SavedAnalysisResult,
  UserSettings,
} from "@/lib/types/investment";
import {
  formatPercent,
  formatRupiah,
} from "@/lib/utils/format";
import { DEFAULT_USER_SETTINGS } from "@/lib/settings/defaults";

type ReportData = {
  portfolio: PortfolioItem[];
  analysisResults: SavedAnalysisResult[];
  goals: FinancialGoal[];
  goalContributions: GoalContribution[];
  alertRules: AlertRule[];
  notifications: AppNotification[];
  settings: Partial<UserSettings>;
};

const reportTypes: ReportType[] = ["weekly", "monthly", "quarterly"];

export default function ReportsPage() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [reports, setReports] = useState<PortfolioReviewReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [data, setData] = useState<ReportData>(() => readLocalReportData());
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Memuat laporan...");
  const [exportMessage, setExportMessage] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    window.setTimeout(() => {
      void (async () => {
        const localData = readLocalReportData();
        const localReports = localArahDanaStorage.readReports() ?? [];

        if (!user) {
          if (!isMounted) return;
          setData(localData);
          setReports(sortReports(localReports));
          setSelectedReportId(localReports[0]?.id ?? null);
          setSyncMessage("Local mode. Login untuk sync laporan antar perangkat.");
          setIsHydrated(true);
          return;
        }

        try {
          const cloudReports = await loadCloudReports(user);
          if (!isMounted) return;
          const nextReports = cloudReports.length > 0 ? cloudReports : localReports;
          setData(localData);
          setReports(sortReports(nextReports));
          setSelectedReportId(nextReports[0]?.id ?? null);
          localArahDanaStorage.writeReports(nextReports);
          setSyncMessage(
            cloudReports.length > 0
              ? "Cloud sync enabled. Laporan dimuat dari Supabase dan dicadangkan lokal."
              : "Cloud sync enabled. Belum ada laporan cloud; laporan baru akan dicadangkan.",
          );
        } catch (error) {
          if (!isMounted) return;
          setData(localData);
          setReports(sortReports(localReports));
          setSelectedReportId(localReports[0]?.id ?? null);
          setSyncMessage(
            error instanceof Error
              ? `Cloud sync gagal, memakai localStorage. ${error.message}`
              : "Cloud sync gagal, memakai localStorage.",
          );
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeReports(reports);
    if (!user) return;
    void saveCloudReports(user, reports).catch((error) => {
      setSyncMessage(
        error instanceof Error
          ? `Local backup tersimpan, cloud sync laporan gagal. ${error.message}`
          : "Local backup tersimpan, cloud sync laporan gagal.",
      );
    });
  }, [isHydrated, reports, user]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0],
    [reports, selectedReportId],
  );

  function refreshSourceData() {
    const nextData = readLocalReportData();
    setData(nextData);
    dispatchToast({
      tone: "info",
      title: "Data laporan diperbarui",
      message: "Laporan berikutnya akan memakai data lokal terbaru.",
    });
  }

  function generateReport() {
    const latestData = readLocalReportData();
    const report = generatePortfolioReviewReport({
      type: reportType,
      portfolio: latestData.portfolio,
      analysisResults: latestData.analysisResults,
      goals: latestData.goals,
      goalContributions: latestData.goalContributions,
      alertRules: latestData.alertRules,
      notifications: latestData.notifications,
      previousReports: reports,
      settings: latestData.settings,
    });
    const nextReports = sortReports([report, ...reports]).slice(0, 36);
    setData(latestData);
    setReports(nextReports);
    setSelectedReportId(report.id);
    maybeCreateReminder(report);
    dispatchToast({
      tone: "success",
      title: "Laporan dibuat",
      message: "Review tersimpan sebagai snapshot untuk perbandingan berikutnya.",
    });
  }

  function deleteReport(id: string) {
    const nextReports = reports.filter((report) => report.id !== id);
    setReports(nextReports);
    setSelectedReportId(nextReports[0]?.id ?? null);
  }

  function exportPdf() {
    window.print();
  }

  function exportImageSnapshot() {
    if (!selectedReport) return;
    downloadSvg(
      reportToSvg(selectedReport, "snapshot"),
      `${safeFileName(selectedReport.title)}-snapshot.svg`,
    );
    setExportMessage("Image snapshot diekspor sebagai SVG.");
  }

  async function exportSummaryCard() {
    if (!selectedReport) return;
    downloadSvg(
      reportToSvg(selectedReport, "card"),
      `${safeFileName(selectedReport.title)}-card.svg`,
    );
    const summary = buildShareText(selectedReport);
    try {
      await navigator.clipboard?.writeText(summary);
      setExportMessage("Summary card diekspor dan teks ringkas disalin.");
    } catch {
      setExportMessage("Summary card diekspor. Clipboard tidak tersedia di browser ini.");
    }
  }

  function createManualReminder() {
    const notifications = localArahDanaStorage.readNotifications() ?? [];
    const notification: AppNotification = {
      id: `report-reminder:${reportType}:${new Date().toISOString()}`,
      type: "portfolio",
      title: `${reportTypeLabels[reportType]} siap ditinjau`,
      message:
        "Luangkan waktu sebentar untuk membaca laporan sebagai bahan evaluasi, bukan dorongan transaksi cepat.",
      createdAt: new Date().toISOString(),
    };
    localArahDanaStorage.writeNotifications([notification, ...notifications].slice(0, 80));
    window.dispatchEvent(new Event("arahdana:notifications-updated"));
    dispatchToast({ tone: "success", title: "Reminder dibuat", message: notification.title });
  }

  function maybeCreateReminder(report: PortfolioReviewReport) {
    if (report.type !== "monthly") return;
    const notifications = localArahDanaStorage.readNotifications() ?? [];
    const monthKey = report.generatedAt.slice(0, 7);
    const id = `portfolio-report:${monthKey}`;
    if (notifications.some((item) => item.id === id)) return;
    const notification: AppNotification = {
      id,
      type: "portfolio",
      title: "Laporan bulanan siap ditinjau",
      message:
        "Review bulanan sudah dibuat. Gunakan sebagai bahan refleksi dan pengaturan risiko.",
      createdAt: report.generatedAt,
      sourceId: report.id,
    };
    localArahDanaStorage.writeNotifications([notification, ...notifications].slice(0, 80));
    window.dispatchEvent(new Event("arahdana:notifications-updated"));
  }

  if (!isHydrated) {
    return <LoadingState title="Memuat laporan" message="Mengambil snapshot laporan lokal dan cloud." />;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.8rem] bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-white/60">Portfolio Review Reports</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Review berkala yang tenang
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
          Laporan ini memakai aturan deterministik dari data tersimpan. Tidak ada janji profit, hanya sinyal pendukung keputusan.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <HeroMetric label="Reports" value={String(reports.length)} />
          <HeroMetric label="Holdings" value={String(data.portfolio.length)} />
          <HeroMetric label="Goals" value={String(data.goals.length)} />
          <HeroMetric label="Mode" value={user ? "Cloud" : "Local"} />
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 rounded-[1rem] bg-white/8 p-1 ring-1 ring-white/10">
            {reportTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setReportType(type)}
                className={`rounded-[0.8rem] px-3 py-2 text-xs font-semibold ${
                  reportType === type
                    ? "bg-white text-stone-950"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                {typeLabel(type)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generateReport}
            className="min-h-11 rounded-[1rem] bg-emerald-400 px-5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-emerald-300"
          >
            Generate Report
          </button>
          <button
            type="button"
            onClick={refreshSourceData}
            className="min-h-11 rounded-[1rem] bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/12 hover:bg-white/15"
          >
            Refresh Data
          </button>
        </div>
        <p className="mt-4 text-xs font-medium text-white/48">{syncMessage}</p>
      </section>

      {selectedReport ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main ref={printRef} className="space-y-5 print-area">
            <ReportView report={selectedReport} />
          </main>

          <aside className="space-y-4">
            <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-stone-950">Export</h3>
              <div className="mt-3 grid gap-2">
                <button className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800" type="button" onClick={exportPdf}>
                  Export PDF
                </button>
                <button className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100" type="button" onClick={exportImageSnapshot}>
                  Image Snapshot
                </button>
                <button className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100" type="button" onClick={exportSummaryCard}>
                  Shareable Card
                </button>
                <button className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" type="button" onClick={createManualReminder}>
                  Create Reminder
                </button>
              </div>
              {exportMessage ? (
                <p className="mt-3 text-xs leading-5 text-stone-500">{exportMessage}</p>
              ) : null}
            </section>

            <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-stone-950">Saved Reports</h3>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                  {reports.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportId(report.id)}
                    className={`rounded-[1rem] border p-3 text-left ${
                      report.id === selectedReport.id
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-stone-200 bg-white hover:bg-stone-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-950">{report.title}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatDate(report.generatedAt)} | Score {report.healthScore}/100
                    </p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => deleteReport(selectedReport.id)}
                className="mt-3 w-full rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Delete Selected
              </button>
            </section>
          </aside>
        </div>
      ) : (
        <section className="rounded-[1.6rem] border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm">
          <h3 className="font-semibold text-stone-950">Belum ada laporan</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
            Generate laporan pertama untuk membuat snapshot portofolio. Snapshot berikutnya akan memberi tren yang lebih kaya.
          </p>
          <button
            type="button"
            onClick={generateReport}
            className="mt-4 rounded-[1rem] bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Generate First Report
          </button>
        </section>
      )}
    </div>
  );
}

function ReportView({ report }: { report: PortfolioReviewReport }) {
  return (
    <article className="space-y-5">
      <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              {reportTypeLabels[report.type]}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">{report.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{report.summary}</p>
          </div>
          <TrendPill current={report.healthScore} previous={report.previousHealthScore} suffix="/100" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Portfolio" value={formatRupiah(report.portfolioValue)} helper={deltaCurrency(report.portfolioValue, report.previousPortfolioValue)} />
          <Metric label="Gain/Loss" value={formatRupiah(report.gainLoss)} helper={formatPercent(report.gainLossPercent)} tone={report.gainLoss >= 0 ? "good" : "bad"} />
          <Metric label="Health" value={`${report.healthScore}/100`} helper={scoreDelta(report.healthScore, report.previousHealthScore)} />
          <Metric label="Alerts" value={String(report.majorAlerts.length)} helper="Major signals" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Performance">
          <div className="grid gap-3 sm:grid-cols-2">
            <Performer title="Best performer" item={report.bestPerformer} tone="good" />
            <Performer title="Worst performer" item={report.worstPerformer} tone="bad" />
          </div>
          <MiniTrend report={report} />
        </Panel>

        <Panel title="Report Scores">
          <ScoreBars scores={report.scores} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Panel title="Allocation Comparison">
          <div className="grid gap-3">
            {report.allocation.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada alokasi untuk diringkas.</p>
            ) : (
              report.allocation.map((slice) => (
                <AllocationRow key={slice.type} slice={slice} />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Risk Exposure">
          <div className="grid gap-3">
            <Progress label="Stable assets" value={report.riskExposure.stablePercent} />
            <Progress label="Bond exposure" value={report.riskExposure.bondPercent} />
            <Progress label="Equity exposure" value={report.riskExposure.equityPercent} />
            <Progress label="High risk" value={report.riskExposure.highRiskPercent} tone="warning" />
            <Progress label="Largest position" value={report.riskExposure.concentrationPercent} tone="warning" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="DCA Summary">
          <Metric label="Contributions" value={String(report.dcaSummary.contributionCount)} helper={formatRupiah(report.dcaSummary.totalContribution)} />
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Average contribution: {formatRupiah(report.dcaSummary.averageContribution)}.
          </p>
        </Panel>
        <Panel title="Goal Progress">
          <Metric label="Active goals" value={String(report.goalSummary.activeGoals)} helper={`${report.goalSummary.goalsOnTrack} broadly on track`} />
          <Progress label="Average progress" value={report.goalSummary.averageProgressPercent} />
        </Panel>
        <Panel title="Journal Insights">
          <InsightList items={report.journalInsights} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="AI-Style Explanation">
          <InsightGroup title="Improved" items={report.analysis.improved} tone="good" />
          <InsightGroup title="Worsened" items={report.analysis.worsened} tone="bad" />
          <InsightGroup title="Watch" items={report.analysis.watch} tone="neutral" />
        </Panel>
        <Panel title="Consistency and Risk">
          <InsightGroup title="Consistent" items={report.analysis.consistent} tone="good" />
          <InsightGroup title="Too Risky" items={report.analysis.tooRisky} tone="bad" />
          <InsightGroup title="Major Alerts" items={report.majorAlerts.length ? report.majorAlerts : ["Tidak ada major alert pada periode ini."]} tone="neutral" />
        </Panel>
      </section>
    </article>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-rose-700"
        : "text-stone-950";
  return (
    <div className="rounded-[1.1rem] bg-stone-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-medium text-stone-500">{helper}</p> : null}
    </div>
  );
}

function TrendPill({ current, previous, suffix = "" }: { current: number; previous?: number; suffix?: string }) {
  const delta = previous === undefined ? 0 : current - previous;
  const tone =
    previous === undefined
      ? "bg-stone-100 text-stone-700"
      : delta >= 0
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-rose-50 text-rose-700 ring-rose-100";
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {previous === undefined ? "First snapshot" : `${delta >= 0 ? "+" : ""}${delta}${suffix}`}
    </span>
  );
}

function Performer({
  title,
  item,
  tone,
}: {
  title: string;
  item?: PortfolioReviewReport["bestPerformer"];
  tone: "good" | "bad";
}) {
  return (
    <div className="rounded-[1.1rem] bg-stone-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p>
      {item ? (
        <>
          <p className="mt-2 font-semibold text-stone-950">{item.name}</p>
          <p className={`mt-1 text-sm font-semibold ${tone === "good" ? "text-emerald-700" : "text-rose-700"}`}>
            {formatRupiah(item.gainLoss)} ({formatPercent(item.gainLossPercent)})
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Belum ada holding.</p>
      )}
    </div>
  );
}

function MiniTrend({ report }: { report: PortfolioReviewReport }) {
  const current = report.portfolioValue;
  const previous = report.previousPortfolioValue ?? current;
  const max = Math.max(current, previous, 1);
  const p1 = 100 - (previous / max) * 80;
  const p2 = 100 - (current / max) * 80;
  return (
    <div className="mt-4 rounded-[1.1rem] bg-stone-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Value trend</p>
      <svg className="mt-3 h-20 w-full" viewBox="0 0 240 90" role="img" aria-label="Portfolio trend">
        <path d="M15 75H225" stroke="#d6d3d1" strokeWidth="2" />
        <path d={`M25 ${p1} C85 ${p1}, 155 ${p2}, 215 ${p2}`} fill="none" stroke="#047857" strokeWidth="5" strokeLinecap="round" />
        <circle cx="25" cy={p1} r="5" fill="#064e3b" />
        <circle cx="215" cy={p2} r="5" fill="#10b981" />
      </svg>
    </div>
  );
}

function ScoreBars({ scores }: { scores: ReportScoreSet }) {
  return (
    <div className="grid gap-3">
      <Progress label="Discipline" value={scores.discipline} />
      <Progress label="Diversification" value={scores.diversification} />
      <Progress label="Risk management" value={scores.riskManagement} />
      <Progress label="Consistency" value={scores.consistency} />
    </div>
  );
}

function Progress({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "warning";
}) {
  const width = Math.max(0, Math.min(100, value));
  const barClass = tone === "warning" && value > 45 ? "bg-amber-500" : "bg-emerald-600";
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-600">{label}</p>
        <p className="text-xs font-semibold text-stone-950">{value.toFixed(1)}%</p>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AllocationRow({ slice }: { slice: PortfolioReviewReport["allocation"][number] }) {
  const delta = slice.previousPercent === undefined ? 0 : slice.percent - slice.previousPercent;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-950">{slice.label}</p>
          <p className="text-xs text-stone-500">{formatRupiah(slice.value)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-stone-950">{slice.percent.toFixed(1)}%</p>
          <p className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {slice.previousPercent === undefined ? "new" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pt`}
          </p>
        </div>
      </div>
      <div className="mt-2 grid gap-1">
        {slice.previousPercent !== undefined ? (
          <div className="h-1.5 rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-stone-400" style={{ width: `${Math.min(100, slice.previousPercent)}%` }} />
          </div>
        ) : null}
        <div className="h-2 rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, slice.percent)}%` }} />
        </div>
      </div>
    </div>
  );
}

function InsightGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-rose-700"
        : "text-stone-700";
  return (
    <div className="mb-4 last:mb-0">
      <p className={`text-sm font-semibold ${color}`}>{title}</p>
      <InsightList items={items} />
    </div>
  );
}

function InsightList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 grid gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-lg bg-stone-100 p-3 text-sm leading-6 text-stone-600">
          {item}
        </li>
      ))}
    </ul>
  );
}

function readLocalReportData(): ReportData {
  if (typeof window === "undefined") {
    return {
      portfolio: [],
      analysisResults: [],
      goals: [],
      goalContributions: [],
      alertRules: [],
      notifications: [],
      settings: DEFAULT_USER_SETTINGS,
    };
  }
  return {
    portfolio: localArahDanaStorage.readPortfolio() ?? [],
    analysisResults: localArahDanaStorage.readAnalysisResults() ?? [],
    goals: localArahDanaStorage.readGoals() ?? [],
    goalContributions: localArahDanaStorage.readGoalContributions() ?? [],
    alertRules: localArahDanaStorage.readAlertRules() ?? [],
    notifications: localArahDanaStorage.readNotifications() ?? [],
    settings: localArahDanaStorage.readSettings() ?? DEFAULT_USER_SETTINGS,
  };
}

function sortReports(items: PortfolioReviewReport[]) {
  return [...items].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

function typeLabel(type: ReportType) {
  if (type === "weekly") return "Weekly";
  if (type === "quarterly") return "Quarterly";
  return "Monthly";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}

function deltaCurrency(current: number, previous?: number) {
  if (previous === undefined) return "First snapshot";
  const delta = current - previous;
  return `${delta >= 0 ? "+" : "-"}${formatRupiah(Math.abs(delta))}`;
}

function scoreDelta(current: number, previous?: number) {
  if (previous === undefined) return "First snapshot";
  const delta = current - previous;
  return `${delta >= 0 ? "+" : ""}${delta} pt`;
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "arahdana-report";
}

function buildShareText(report: PortfolioReviewReport) {
  return `${report.title}\nPortfolio: ${formatRupiah(report.portfolioValue)}\nGain/Loss: ${formatPercent(report.gainLossPercent)}\nHealth: ${report.healthScore}/100\nNote: Decision-support summary only, not a profit promise.`;
}

function reportToSvg(report: PortfolioReviewReport, mode: "snapshot" | "card") {
  const width = mode === "card" ? 900 : 1100;
  const height = mode === "card" ? 560 : 820;
  const rows = [
    `Portfolio ${formatRupiah(report.portfolioValue)}`,
    `Gain/Loss ${formatPercent(report.gainLossPercent)}`,
    `Health ${report.healthScore}/100`,
    `Discipline ${report.scores.discipline}/100`,
  ];
  const allocationText = report.allocation.slice(0, 4).map((item) => `${item.label}: ${item.percent.toFixed(1)}%`);
  const insights = [...report.analysis.improved, ...report.analysis.watch].slice(0, mode === "card" ? 3 : 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="36" fill="#0c0a09"/>
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="28" fill="#ffffff"/>
  <text x="72" y="92" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#047857">ArahDana Review</text>
  <text x="72" y="142" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0c0a09">${escapeSvg(report.title)}</text>
  <text x="72" y="182" font-family="Arial, sans-serif" font-size="20" fill="#78716c">${escapeSvg(formatDate(report.generatedAt))}</text>
  ${rows.map((row, index) => `<text x="72" y="${250 + index * 46}" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#1c1917">${escapeSvg(row)}</text>`).join("")}
  <text x="72" y="470" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0c0a09">Allocation</text>
  ${allocationText.map((row, index) => `<text x="72" y="${510 + index * 34}" font-family="Arial, sans-serif" font-size="20" fill="#57534e">${escapeSvg(row)}</text>`).join("")}
  <text x="${mode === "card" ? 500 : 560}" y="${mode === "card" ? 250 : 210}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#0c0a09">Signals</text>
  ${insights.map((row, index) => `<text x="${mode === "card" ? 500 : 560}" y="${mode === "card" ? 295 + index * 42 : 250 + index * 42}" font-family="Arial, sans-serif" font-size="19" fill="#44403c">${escapeSvg(row.slice(0, 78))}</text>`).join("")}
  <text x="72" y="${height - 70}" font-family="Arial, sans-serif" font-size="18" fill="#78716c">Decision-support only. No profit guarantee.</text>
</svg>`;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadSvg(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
