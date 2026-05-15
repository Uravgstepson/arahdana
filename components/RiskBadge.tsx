import type { RiskCategory } from "@/lib/types/investment";

export function RiskBadge({ risk }: { risk: RiskCategory }) {
  const styles = {
    low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    high: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  const labels: Record<RiskCategory, string> = {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles[risk]}`}>
      {labels[risk]}
    </span>
  );
}
