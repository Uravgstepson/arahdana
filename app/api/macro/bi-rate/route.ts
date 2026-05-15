import { NextResponse } from "next/server";
import { BankIndonesiaError, fetchBankIndonesiaRates } from "@/lib/providers/bankIndonesia";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency") || "USD";
  const endDate = searchParams.get("endDate") || todayJakarta();
  const startDate = searchParams.get("startDate") || daysBefore(endDate, 7);

  try {
    const rates = await fetchBankIndonesiaRates(currency, startDate, endDate);
    return NextResponse.json({
      source: "Bank Indonesia kurs webservice",
      currency: currency.trim().toUpperCase(),
      startDate,
      endDate,
      rates,
    });
  } catch (error) {
    const status = error instanceof BankIndonesiaError ? error.status : 502;
    return NextResponse.json(
      {
        source: "Bank Indonesia kurs webservice",
        currency: currency.trim().toUpperCase(),
        startDate,
        endDate,
        error: error instanceof Error ? error.message : "Gagal mengambil kurs Bank Indonesia",
        message:
          status === 400
            ? "Parameter kurs tidak valid. Periksa kode mata uang dan format tanggal YYYY-MM-DD."
            : "Data kurs Bank Indonesia sedang tidak tersedia. Tidak ada data palsu yang digunakan.",
      },
      { status },
    );
  }
}

function todayJakarta() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

function daysBefore(date: string, days: number) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().slice(0, 10);
}
