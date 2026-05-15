export type ExchangeRatePoint = {
  date: string;
  currency: string;
  buy: number;
  sell: number;
  middle: number;
};

export class BankIndonesiaError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "BankIndonesiaError";
    this.status = status;
  }
}

export async function fetchBankIndonesiaRates(
  currency: string,
  startDate: string,
  endDate: string,
) {
  const safeCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(safeCurrency)) {
    throw new BankIndonesiaError("Kode mata uang tidak valid. Gunakan format seperti USD, SGD, atau EUR.", 400);
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new BankIndonesiaError("Tanggal harus memakai format YYYY-MM-DD.", 400);
  }

  const url = `https://www.bi.go.id/biwebservice/wskursbi.asmx/getSubKursLokal3?mts=${encodeURIComponent(
    safeCurrency,
  )}&startdate=${encodeURIComponent(startDate)}&enddate=${encodeURIComponent(endDate)}`;

  const responseText = await fetchWithRetry(url);
  return parseBankIndonesiaXml(responseText, safeCurrency);
}

export function parseBankIndonesiaXml(xml: string, fallbackCurrency: string): ExchangeRatePoint[] {
  const rows = xml.match(/<Table\b[\s\S]*?<\/Table>/gi) ?? [];

  return rows
    .map((row) => {
      const buy = parseXmlNumber(readTag(row, "beli_subkurslokal") || readTag(row, "beli_subkurs"));
      const sell = parseXmlNumber(readTag(row, "jual_subkurslokal") || readTag(row, "jual_subkurs"));
      const date = normalizeBiDate(
        readTag(row, "tgl_subkurslokal") || readTag(row, "tgl_subkurs") || readTag(row, "Date"),
      );
      const currency =
        (readTag(row, "mts_subkurslokal") || readTag(row, "mts_subkurs") || readTag(row, "mts") || fallbackCurrency)
          .trim()
          .toUpperCase();

      return {
        date,
        currency,
        buy,
        sell,
        middle: buy && sell ? round((buy + sell) / 2, 2) : 0,
      };
    })
    .filter((row) => row.date && row.currency && row.buy > 0 && row.sell > 0);
}

async function fetchWithRetry(url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "ArahDana/1.0" },
      });

      if (!response.ok) {
        throw new BankIndonesiaError(`Layanan Bank Indonesia mengembalikan HTTP ${response.status}.`, 502);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof BankIndonesiaError) throw lastError;
  throw new BankIndonesiaError(
    lastError instanceof Error
      ? lastError.message
      : "Bank Indonesia service tidak dapat dihubungi saat ini.",
    502,
  );
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1]?.trim() ?? "");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

function parseXmlNumber(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBiDate(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function round(value: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
