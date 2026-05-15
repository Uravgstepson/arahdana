import type { InvestmentType } from "@/lib/types/investment";
import { cn, investmentTypeLabel } from "@/lib/utils/format";

const badgeStyles: Record<InvestmentType, string> = {
  stock: "bg-slate-100 text-slate-700 ring-slate-200",
  money_market_fund: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  equity_fund: "bg-violet-100 text-violet-700 ring-violet-200",
  bond_fund: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  mixed_fund: "bg-orange-100 text-orange-700 ring-orange-200",
  bond: "bg-amber-100 text-amber-700 ring-amber-200",
  cash_savings: "bg-stone-100 text-stone-700 ring-stone-200",
};

const badgeIcons: Record<InvestmentType, string> = {
  stock: "📈",
  money_market_fund: "💵",
  equity_fund: "📊",
  bond_fund: "📜",
  mixed_fund: "🧩",
  bond: "💰",
  cash_savings: "🏦",
};

export function InstrumentBadge({
  type,
  className,
}: {
  type: InvestmentType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        badgeStyles[type],
        className,
      )}
    >
      <span className="mr-1.5 text-[10px]">{badgeIcons[type]}</span>
      {investmentTypeLabel(type)}
    </span>
  );
}
