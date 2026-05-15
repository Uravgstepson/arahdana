import type { InvestmentType } from "@/lib/types/investment";

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function investmentTypeLabel(type: InvestmentType) {
  const labels: Record<InvestmentType, string> = {
    cash_savings: "Tabungan / Kas",
    stock: "Saham IDX",
    money_market_fund: "Reksadana Pasar Uang",
    bond_fund: "Reksadana Pendapatan Tetap",
    equity_fund: "Reksadana Saham",
    mixed_fund: "Reksadana Campuran",
    bond: "Obligasi",
  };

  return labels[type];
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function nonNegativeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}
