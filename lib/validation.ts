import type { PricePoint } from "@/lib/types/investment";

const safeTickerPattern = /^[A-Z0-9.^:_=\-]{1,40}$/i;

export function validateCapital(value: number) {
  if (!Number.isFinite(value)) return "Modal harus berupa angka valid.";
  if (value < 0) return "Modal tidak boleh negatif.";
  return "";
}

export function validateRiskTolerance(value: number) {
  if (!Number.isFinite(value)) return "Toleransi risiko harus berupa angka valid.";
  if (value < 5 || value > 30) return "Toleransi risiko harus berada di antara 5% dan 30%.";
  return "";
}

export function validateTicker(value: string, options?: { optional?: boolean }) {
  const ticker = value.trim();
  if (!ticker) return options?.optional ? "" : "Ticker wajib diisi.";
  if (!safeTickerPattern.test(ticker)) {
    return "Ticker hanya boleh memakai huruf, angka, titik, titik dua, tanda minus, garis bawah, tanda sama dengan, dan ^.";
  }
  return "";
}

export function normalizeSafeTicker(value: string) {
  return value.trim().toUpperCase();
}

export function validatePositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value)) return `${label} harus berupa angka valid.`;
  if (value <= 0) return `${label} harus lebih dari 0.`;
  return "";
}

export function validateNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value)) return `${label} harus berupa angka valid.`;
  if (value < 0) return `${label} tidak boleh negatif.`;
  return "";
}

export function validatePrices(prices: PricePoint[]) {
  if (prices.length === 0) return "Data harga masih kosong.";
  const invalidIndex = prices.findIndex(
    (price) => !Number.isFinite(price.close) || price.close <= 0,
  );
  if (invalidIndex >= 0) {
    return `Harga baris ${invalidIndex + 1} harus berupa angka valid lebih dari 0.`;
  }
  return "";
}
