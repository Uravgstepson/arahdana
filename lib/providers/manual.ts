import type { PricePoint } from "@/lib/types/investment";

export function parseManualPrices(input: string): PricePoint[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [datePart, closePart] = line.split(/[,\s]+/);
      const close = Number(closePart ?? datePart);
      return {
        date: closePart ? datePart : `manual-${index + 1}`,
        close,
      };
    })
    .filter((point) => Number.isFinite(point.close) && point.close > 0);
}
