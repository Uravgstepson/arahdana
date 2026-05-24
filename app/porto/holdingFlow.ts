import type {
  InvestmentType,
  PortfolioItem,
  RiskCategory,
} from "@/lib/types/investment";
import { investmentTypeLabel, nonNegativeNumber } from "@/lib/utils/format";

export type HoldingDraft = {
  name: string;
  ticker: string;
  type: InvestmentType;
  buyPrice: string;
  quantity: string;
  currentPrice: string;
  buyDate: string;
  riskCategory: RiskCategory;
  notes: string;
};

export const productTypeChoices: Array<{
  type: InvestmentType;
  title: string;
  helper: string;
}> = [
  {
    type: "money_market_fund",
    title: "Pasar Uang",
    helper: "RDPU, tabungan, instrumen rendah volatilitas.",
  },
  {
    type: "stock",
    title: "Saham",
    helper: "Saham IDX atau saham populer yang ingin dipantau.",
  },
  {
    type: "bond",
    title: "Obligasi",
    helper: "FR, SBN, atau obligasi lain yang dimiliki.",
  },
  {
    type: "bond_fund",
    title: "Pendapatan Tetap",
    helper: "Reksadana obligasi dan produk sejenis.",
  },
  {
    type: "equity_fund",
    title: "Reksadana Saham",
    helper: "Produk reksadana dengan mayoritas saham.",
  },
  {
    type: "mixed_fund",
    title: "Campuran",
    helper: "Kombinasi saham, obligasi, dan pasar uang.",
  },
  {
    type: "cash_savings",
    title: "Cash",
    helper: "Saldo kas yang ikut dihitung sebagai alokasi.",
  },
];

export const riskChoices: Array<{
  value: RiskCategory;
  label: string;
  helper: string;
}> = [
  { value: "low", label: "Defensif", helper: "Stabil, volatilitas rendah." },
  { value: "medium", label: "Seimbang", helper: "Risiko moderat." },
  { value: "high", label: "Agresif", helper: "Fluktuasi lebih besar." },
];

export function createHoldingDraft(
  initial?: Partial<HoldingDraft>,
): HoldingDraft {
  return {
    name: "",
    ticker: "",
    type: "money_market_fund",
    buyPrice: "",
    quantity: "1",
    currentPrice: "",
    buyDate: new Date().toISOString().slice(0, 10),
    riskCategory: "medium",
    notes: "",
    ...initial,
  };
}

export function portfolioItemToDraft(item: PortfolioItem): HoldingDraft {
  return createHoldingDraft({
    name: item.name,
    ticker: item.ticker ?? "",
    type: item.type,
    buyPrice: String(nonNegativeNumber(item.buyPrice)),
    quantity: String(nonNegativeNumber(item.quantity)),
    currentPrice: String(nonNegativeNumber(item.currentPrice)),
    buyDate: item.buyDate || new Date().toISOString().slice(0, 10),
    riskCategory: item.riskCategory,
    notes: item.notes ?? "",
  });
}

export function validateHoldingDraft(draft: HoldingDraft) {
  if (!draft.name.trim()) return "Nama instrumen wajib diisi.";
  if (parseCurrencyInput(draft.buyPrice) <= 0) {
    return "Harga beli atau modal awal wajib lebih dari 0.";
  }
  if (parseCurrencyInput(draft.quantity) <= 0) {
    return "Jumlah unit wajib lebih dari 0.";
  }
  return "";
}

export function draftToPortfolioItem(
  draft: HoldingDraft,
  id: string,
): PortfolioItem {
  const buyPrice = parseCurrencyInput(draft.buyPrice);
  const currentPrice = parseCurrencyInput(draft.currentPrice) || buyPrice;

  return {
    id,
    name: draft.name.trim(),
    type: draft.type,
    ticker: draft.ticker.trim().toUpperCase() || undefined,
    buyPrice,
    quantity: parseCurrencyInput(draft.quantity),
    currentPrice,
    buyDate: draft.buyDate || new Date().toISOString().slice(0, 10),
    notes: draft.notes.trim(),
    riskCategory: draft.riskCategory,
    dataSource: "manual_input",
  };
}

export function productTypeLabel(type: InvestmentType) {
  const custom = productTypeChoices.find((choice) => choice.type === type);
  return custom?.title ?? investmentTypeLabel(type);
}

function parseCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? nonNegativeNumber(number) : 0;
}
