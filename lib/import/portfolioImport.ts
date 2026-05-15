import type { InvestmentType, PortfolioItem, RiskCategory } from "@/lib/types/investment";
import { nonNegativeNumber } from "@/lib/utils/format";

export type ImportedPortfolioItem = Omit<PortfolioItem, "id">;

export type PortfolioImportResult = {
  items: ImportedPortfolioItem[];
  errors: string[];
  warnings: string[];
  rowCount: number;
};

const defaultColumns = [
  "name",
  "type",
  "ticker",
  "buyPrice",
  "quantity",
  "currentPrice",
  "buyDate",
  "notes",
] as const;

const headerAliases: Record<string, keyof ImportedPortfolioItem | "source" | "currentValue" | "buyValue"> = {
  amount: "currentValue",
  "asset name": "name",
  "avg nav": "buyPrice",
  "avg price": "buyPrice",
  balance: "currentValue",
  "buy date": "buyDate",
  buy_date: "buyDate",
  "buy price": "buyPrice",
  buy_price: "buyPrice",
  "buy value": "buyValue",
  buy_value: "buyValue",
  category: "type",
  date: "buyDate",
  "harga beli": "buyPrice",
  "harga sekarang": "currentPrice",
  "harga kini": "currentPrice",
  "harga pembelian": "buyPrice",
  "invoice number": "notes",
  instrument: "name",
  "investment type": "type",
  jenis: "type",
  kode: "ticker",
  modal: "buyValue",
  name: "name",
  nama: "name",
  "nama produk": "name",
  nav: "currentPrice",
  nilai: "currentValue",
  "nilai investasi": "currentValue",
  "jumlah investasi": "buyValue",
  notes: "notes",
  catatan: "notes",
  platform: "source",
  price: "currentPrice",
  produk: "name",
  quantity: "quantity",
  qty: "quantity",
  risk: "riskCategory",
  "risk category": "riskCategory",
  risk_category: "riskCategory",
  "risk profil": "riskCategory",
  saldo: "currentValue",
  source: "source",
  sumber: "source",
  symbol: "ticker",
  tabungan: "currentValue",
  tanggal: "buyDate",
  "tanggal transaksi": "buyDate",
  ticker: "ticker",
  "tipe produk": "type",
  type: "type",
  transaksi: "notes",
  unit: "quantity",
  units: "quantity",
  "current price": "currentPrice",
  current_price: "currentPrice",
  "current value": "currentValue",
  current_value: "currentValue",
};

export function parsePortfolioImport(input: string): PortfolioImportResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { items: [], errors: [], warnings: [], rowCount: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitDelimitedLine(line, delimiter));
  const firstRowKeys = rows[0].map((cell) => normalizeKey(cell));
  const hasHeader = firstRowKeys.some((key) => key in headerAliases);
  const headers = hasHeader ? firstRowKeys.map(mapHeader) : [...defaultColumns];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const items: ImportedPortfolioItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (hasHeader) {
    const missingColumns = getMissingRequiredColumns(headers);
    if (missingColumns.length > 0) {
      errors.push(
        `Format CSV belum sesuai. Kolom wajib: name, buy_price, quantity, current_price. Kolom yang belum ada: ${missingColumns.join(", ")}.`,
      );
    }
  } else if (rows[0].length < 6 || looksLikeUnsupportedHeader(rows[0])) {
    errors.push(
      "Format CSV belum sesuai. Gunakan header: name,type,ticker,buy_price,quantity,current_price,buy_date,notes.",
    );
  }

  dataRows.forEach((row, index) => {
    const rowNumber = hasHeader ? index + 2 : index + 1;
    const record: Partial<Record<string, string>> = {};

    headers.forEach((header, columnIndex) => {
      if (!header) return;
      const value = row[columnIndex]?.trim() ?? "";
      if (!value) return;
      record[header] = record[header] ? `${record[header]} | ${value}` : value;
    });

    const name = record.name?.trim();
    const source = record.source?.trim();
    const sourceText = `${source ?? ""} ${name ?? ""} ${record.type ?? ""}`.toLowerCase();
    const type = inferInvestmentType(record.type, name, record.ticker);
    const quantity = nonNegativeNumber(parseFlexibleNumber(record.quantity));
    const buyValue = nonNegativeNumber(parseFlexibleNumber(record.buyValue));
    const currentValue = nonNegativeNumber(parseFlexibleNumber(record.currentValue));
    let buyPrice = nonNegativeNumber(parseFlexibleNumber(record.buyPrice));
    let currentPrice = nonNegativeNumber(parseFlexibleNumber(record.currentPrice));
    const normalizedQuantity = quantity > 0 ? quantity : currentValue > 0 ? 1 : 0;

    if (buyValue > 0 && normalizedQuantity > 0) {
      buyPrice = buyValue / normalizedQuantity;
      if (currentValue === 0) {
        currentPrice = buyPrice;
      }
    }

    if (buyPrice === 0 && currentPrice > 0) {
      buyPrice = currentPrice;
    }

    if (currentPrice === 0 && currentValue > 0 && normalizedQuantity > 0) {
      currentPrice = currentValue / normalizedQuantity;
    }

    if (currentPrice === 0 && buyPrice > 0) {
      currentPrice = buyPrice;
    }

    if (!name) {
      errors.push(`Baris ${rowNumber}: nama instrumen belum ada.`);
      return;
    }

    if (buyPrice <= 0 || currentPrice <= 0 || normalizedQuantity <= 0) {
      errors.push(`Baris ${rowNumber}: butuh harga/saldo dan jumlah/unit yang valid.`);
      return;
    }

    if (!hasHeader && row.length < 5) {
      warnings.push(`Baris ${rowNumber}: diimpor dengan urutan kolom bawaan karena header tidak ditemukan.`);
    }

    const importedFrom = source
      ? `Diimpor dari ${source}`
      : sourceText.includes("bibit")
        ? "Diimpor dari Bibit"
        : type === "cash_savings"
          ? "Diimpor dari tabungan"
          : "Diimpor dengan parser semi-otomatis";

    items.push({
      name,
      type,
      ticker: normalizeTicker(record.ticker),
      buyPrice,
      quantity: normalizedQuantity,
      currentPrice,
      buyDate: normalizeDate(record.buyDate) ?? new Date().toISOString().slice(0, 10),
      notes: mergeNotes(record.notes, importedFrom),
      riskCategory: inferRiskCategory(type, record.riskCategory),
      dataSource: sourceText.includes("bibit")
        ? "bibit_import"
        : type === "cash_savings" || sourceText.includes("saving") || sourceText.includes("tabungan")
          ? "savings_import"
          : "semi_auto_import",
      lastPriceUpdatedAt: new Date().toISOString(),
    });
  });

  return {
    items,
    errors,
    warnings: Array.from(new Set(warnings)),
    rowCount: dataRows.length,
  };
}

function detectDelimiter(line: string) {
  const delimiters = ["\t", ";", ","];
  return delimiters.reduce((best, delimiter) => {
    const count = splitDelimitedLine(line, delimiter).length;
    const bestCount = splitDelimitedLine(line, best).length;
    return count > bestCount ? delimiter : best;
  }, ",");
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function mapHeader(key: string) {
  return headerAliases[key] ?? null;
}

function looksLikeUnsupportedHeader(row: string[]) {
  const hasHeaderText = row.some((cell) => /[a-z_ -]/i.test(cell));
  const hasExpectedNumericValues = row
    .slice(3, 6)
    .some((cell) => parseFlexibleNumber(cell) > 0);

  return hasHeaderText && !hasExpectedNumericValues;
}

function getMissingRequiredColumns(headers: Array<keyof ImportedPortfolioItem | "source" | "currentValue" | "buyValue" | null>) {
  const headerSet = new Set(headers.filter(Boolean));
  const missing: string[] = [];

  if (!headerSet.has("name")) missing.push("name");
  if (!headerSet.has("buyPrice") && !headerSet.has("buyValue")) missing.push("buy_price");
  if (!headerSet.has("quantity") && !headerSet.has("currentValue")) missing.push("quantity");
  if (!headerSet.has("currentPrice") && !headerSet.has("currentValue")) missing.push("current_price");

  return missing;
}

function parseFlexibleNumber(value?: string) {
  if (!value) return 0;

  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;

  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (commaCount > 1) {
    normalized = cleaned.replace(/,/g, "");
  } else if (dotCount > 1) {
    normalized = cleaned.replace(/\./g, "");
  } else if (commaCount === 1) {
    const decimalDigits = cleaned.length - lastComma - 1;
    normalized = decimalDigits <= 2 ? cleaned.replace(",", ".") : cleaned.replace(",", "");
  } else if (dotCount === 1) {
    const decimalDigits = cleaned.length - lastDot - 1;
    normalized = decimalDigits <= 2 ? cleaned : cleaned.replace(".", "");
  }

  return Number(normalized);
}

function inferInvestmentType(type?: string, name?: string, ticker?: string): InvestmentType {
  const value = `${type ?? ""} ${name ?? ""}`.toLowerCase();

  if (
    value.includes("tabungan") ||
    value.includes("saving") ||
    value.includes("cash") ||
    value.includes("deposito") ||
    value.includes("cash_savings")
  ) {
    return "cash_savings";
  }

  if (value.includes("equity_fund") || value.includes("reksadana saham") || value.includes("equity fund")) {
    return "equity_fund";
  }

  if (value.includes("bond_fund") || value.includes("pendapatan tetap") || value.includes("rdpt") || value.includes("bond fund")) {
    return "bond_fund";
  }

  if (value.includes("mixed_fund") || value.includes("campuran") || value.includes("mixed")) {
    return "mixed_fund";
  }

  if (
    value.includes("money_market_fund") ||
    value.includes("pasar uang") ||
    value.includes("rdpu") ||
    value.includes("money market") ||
    value.includes("kas")
  ) {
    return "money_market_fund";
  }

  if (value.includes("reksadana")) {
    return "money_market_fund";
  }

  if (value.includes("obligasi") || value.includes("bond") || value.includes("fr0")) {
    return "bond";
  }

  if (ticker?.trim()) {
    return "stock";
  }

  return "stock";
}

function inferRiskCategory(type: InvestmentType, risk?: string): RiskCategory {
  const value = risk?.toLowerCase().trim();
  if (value === "low" || value === "rendah") return "low";
  if (value === "medium" || value === "sedang") return "medium";
  if (value === "high" || value === "tinggi") return "high";

  if (type === "cash_savings" || type === "money_market_fund") return "low";
  if (type === "bond" || type === "bond_fund" || type === "mixed_fund") return "medium";
  return "high";
}

function normalizeTicker(value?: string) {
  const ticker = value?.trim().toUpperCase() ?? "";
  if (!ticker) return "";
  if (ticker.includes(".") || ticker.startsWith("^")) return ticker;
  return ticker.length <= 5 ? `${ticker}.JK` : ticker;
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(Date.UTC(year, month, day));

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function mergeNotes(notes?: string, importedFrom?: string) {
  const parts = [notes?.trim(), importedFrom].filter(Boolean);
  return parts.join(" | ");
}
