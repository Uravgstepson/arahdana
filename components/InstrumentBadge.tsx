import type { InvestmentType } from "@/lib/types/investment";
import { Badge } from "@/components/ui";
import { cn, investmentTypeLabel } from "@/lib/utils/format";

const badgeStyles: Record<InvestmentType, string> = {
  stock: "bg-slate-100 text-slate-700 ring-slate-200",
  money_market_fund: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  equity_fund: "bg-violet-50 text-violet-800 ring-violet-200",
  bond_fund: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  mixed_fund: "bg-orange-50 text-orange-800 ring-orange-200",
  bond: "bg-amber-50 text-amber-900 ring-amber-200",
  cash_savings: "bg-stone-100 text-stone-700 ring-stone-200",
};

const badgeCodes: Record<InvestmentType, string> = {
  stock: "SHM",
  money_market_fund: "PU",
  equity_fund: "RS",
  bond_fund: "RD",
  mixed_fund: "CM",
  bond: "OBL",
  cash_savings: "KAS",
};

export function InstrumentBadge({
  type,
  className,
  compact = false,
}: {
  type: InvestmentType;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Badge
      className={cn(
        "gap-1.5 uppercase tracking-[0.06em]",
        badgeStyles[type],
        className,
      )}
    >
      <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[0.58rem] leading-none">
        {badgeCodes[type]}
      </span>
      {compact ? null : investmentTypeLabel(type)}
    </Badge>
  );
}
