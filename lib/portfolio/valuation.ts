import type { PortfolioItem } from "@/lib/types/investment";

export type PortfolioValuationSettings = {
  aprMoneyMarketFund?: number;
  now?: Date;
};

export function computePortfolioCurrentPrice(
  item: PortfolioItem,
  settings: PortfolioValuationSettings = {},
) {
  const now = settings.now ?? new Date();

  // Only estimate for RDPU / reksadana pasar uang when no live market price source is attached.
  if (item.type !== "money_market_fund") {
    return { currentPriceUsed: item.currentPrice, isEstimated: false };
  }

  if (item.dataSource === "live_public_market_data") {
    return { currentPriceUsed: item.currentPrice, isEstimated: false };
  }

  const buyDate = new Date(item.buyDate);
  const buyTime = Number.isNaN(buyDate.getTime()) ? now.getTime() : buyDate.getTime();
  const days = Math.max(0, (now.getTime() - buyTime) / (1000 * 60 * 60 * 24));
  const base = item.buyPrice > 0 ? item.buyPrice : item.currentPrice;
  const apr = Math.max(0, settings.aprMoneyMarketFund ?? 0.05);
  const estimated = base * (1 + (apr * days) / 365);

  // Only lift, never reduce the user's last known NAV.
  const currentPriceUsed = Math.max(item.currentPrice, estimated);
  const isEstimated =
    currentPriceUsed > item.currentPrice + Math.max(0.0001, item.currentPrice * 0.0001);

  return { currentPriceUsed, isEstimated };
}

export function computePortfolioMetrics(
  items: PortfolioItem[],
  settings: PortfolioValuationSettings = {},
) {
  const invested = items.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const current = items.reduce((sum, item) => {
    const { currentPriceUsed } = computePortfolioCurrentPrice(item, settings);
    return sum + currentPriceUsed * item.quantity;
  }, 0);
  const profit = current - invested;
  const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;

  return { invested, current, profit, profitPercent };
}

