export function StatCard({
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
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-stone-950";

  return (
    <section className="rounded-[1.8rem] border border-white/60 bg-white/72 p-5 shadow-sm backdrop-blur-2xl">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {helper ? <p className="mt-2 text-sm text-stone-500">{helper}</p> : null}
    </section>
  );
}
