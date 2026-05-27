const versions = [
  {
    version: "v1.0.0 RC",
    items: [
      "Google login, secure user-owned Supabase data, and legal/trust pages",
      "Portfolio tracking, CSV import, Market, Goals, Analysis, privacy mode, and app lock",
      "Feedback, production monitoring, PWA readiness, and release-candidate documentation",
    ],
  },
  {
    version: "v1.0 Beta",
    items: ["Global error, loading, empty, and API failure states", "Input and CSV validation hardening", "Onboarding, changelog, feedback, and beta disclaimer"],
  },
  {
    version: "v0.6 AI-style explanation",
    items: ["Plain-language explanation for analysis results", "Clearer BUY, WAIT, and AVOID rationale"],
  },
  {
    version: "v0.5 CSV import",
    items: ["Browser-only CSV and XLSX portfolio import", "Preview and row-level import validation"],
  },
  {
    version: "v0.4 Supabase cloud sync",
    items: ["Auth-backed portfolio, watchlist, settings, and analysis sync", "Local fallback when cloud is unavailable"],
  },
  {
    version: "v0.3 Charts",
    items: ["Allocation and performance charts", "Price visualization for analyzer and market pages"],
  },
  {
    version: "v0.2 Backup/export/import",
    items: ["Local backup export and import", "Data cleanup controls"],
  },
  {
    version: "v0.1 MVP",
    items: ["Portfolio tracking", "Analyzer rules engine", "Watchlist basics"],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-6 text-white">
        <p className="text-sm font-medium text-white/62">Release history</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Changelog</h2>
      </section>
      <div className="space-y-4">
        {versions.map((release) => (
          <article key={release.version} className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-950">{release.version}</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-600">
              {release.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
