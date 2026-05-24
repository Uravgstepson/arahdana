"use client";

import {
  type ChangeEvent,
  useMemo,
  useState,
} from "react";
import type { CellValue } from "read-excel-file/browser";
import type {
  DataSource,
  PortfolioItem,
  RiskCategory,
} from "@/lib/types/investment";
import {
  parsePortfolioImport,
  type ImportedPortfolioItem,
} from "@/lib/import/portfolioImport";
import { dataSourceLabel } from "@/lib/providers/marketClient";
import { formatRupiah, nonNegativeNumber } from "@/lib/utils/format";
import { InstrumentBadge } from "@/components/InstrumentBadge";

export const portfolioImportExample = `name,type,ticker,buy_price,quantity,current_price,buy_date,notes
Sucorinvest Money Market Fund,money_market_fund,,1000,5000,1015,2026-05-01,Reksadana pasar uang dari Bibit
Schroder Dana Prestasi Plus,equity_fund,,2800,900,2925,2026-05-01,Reksadana saham dari Bibit
BBCA,stock,BBCA,9800,100,9700,2026-05-01,Saham IDX manual
Tabungan BCA,cash_savings,,1,2500000,1,2026-05-01,Dana kas darurat`;

type CsvPortfolioImportSectionProps = {
  existingItems: PortfolioItem[];
  hasStoredPortfolio: boolean;
  onImport(nextItems: PortfolioItem[]): Promise<void> | void;
  storageLabel: string;
  title?: string;
  description?: string;
};

export function CsvPortfolioImportSection({
  existingItems,
  hasStoredPortfolio,
  onImport,
  storageLabel,
  title = "CSV Import",
  description = "Upload CSV lokal atau tempel data Bibit/reksadana. File dibaca di browser saja, dipratinjau, lalu baru disimpan setelah dikonfirmasi.",
}: CsvPortfolioImportSectionProps) {
  const [importText, setImportText] = useState("");
  const [replaceMatchingImports, setReplaceMatchingImports] = useState(true);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [importFileMessage, setImportFileMessage] = useState("");
  const [importFileError, setImportFileError] = useState("");
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);

  const importPreview = useMemo(
    () => parsePortfolioImport(importText),
    [importText],
  );
  const canImport =
    importPreview.items.length > 0 &&
    importPreview.errors.length === 0 &&
    !isSavingImport;

  async function importParsedRows() {
    setImportMessage("");
    setImportError("");

    if (importPreview.items.length === 0) {
      setImportError(
        "Belum ada baris valid untuk diimpor. Pastikan kolom nama, jenis, harga beli, unit, dan tanggal sudah terisi.",
      );
      return;
    }

    if (importPreview.errors.length > 0) {
      setImportError(
        "Perbaiki error CSV di pratinjau dulu sebelum menyimpan impor.",
      );
      return;
    }

    const nextItems = mergeImportedPortfolioItems({
      currentItems: existingItems,
      hasStoredPortfolio,
      importedItems: importPreview.items,
      replaceMatchingImports,
    });

    setIsSavingImport(true);
    try {
      await onImport(nextItems);
      setImportMessage(
        `${importPreview.items.length} baris disimpan ke ${storageLabel} dengan total modal ${formatRupiah(
          importPreview.items.reduce(
            (sum, item) => sum + item.buyPrice * item.quantity,
            0,
          ),
        )}. ${
          replaceMatchingImports
            ? "Kepemilikan yang cocok sudah diperbarui."
            : "Baris ditambahkan sebagai kepemilikan baru."
        }`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan hasil impor.",
      );
    } finally {
      setIsSavingImport(false);
    }
  }

  async function handleImportFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setImportFileMessage("");
    setImportFileError("");
    setImportMessage("");
    setImportError("");

    if (!file) return;

    setIsReadingImportFile(true);

    try {
      const extractedText = await readPortfolioImportFile(file);
      if (!extractedText.trim()) {
        throw new Error("File tidak berisi baris yang bisa dibaca.");
      }

      setImportText(extractedText);
      setImportFileMessage(
        `${file.name} berhasil dibaca secara lokal. Periksa pratinjau sebelum menyimpan.`,
      );
    } catch (error) {
      setImportFileError(
        error instanceof Error
          ? error.message
          : "File gagal dibaca. Coba simpan sebagai .csv.",
      );
    } finally {
      setIsReadingImportFile(false);
    }
  }

  return (
    <section className="w-full max-w-full min-w-0 overflow-x-hidden rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex w-full max-w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
          <p className="mt-1 max-w-full break-words text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Aman lokal
        </span>
      </div>

      <div className="mt-4 grid w-full max-w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
        <div className="grid w-full max-w-full min-w-0 gap-3">
          <div className="w-full max-w-full min-w-0 rounded-lg border border-dashed border-stone-300 bg-white/60 p-4">
            <div className="flex w-full max-w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 max-w-full">
                <p className="text-sm font-semibold text-stone-950">
                  Upload CSV lokal
                </p>
                <p className="mt-1 max-w-full break-words text-xs leading-5 text-stone-500">
                  Mendukung .csv, .tsv, .txt, dan .xlsx. File tidak diunggah.
                </p>
              </div>
              <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 sm:w-auto"
                >
                  Unduh contoh
                </button>
                <label className="flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 sm:w-auto">
                  {isReadingImportFile ? "Membaca..." : "Pilih file"}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleImportFileChange}
                    disabled={isReadingImportFile}
                  />
                </label>
              </div>
            </div>
            {importFileMessage ? (
              <p className="mt-3 max-w-full break-words text-sm font-medium text-emerald-700">
                {importFileMessage}
              </p>
            ) : null}
            {importFileError ? (
              <p className="mt-3 max-w-full break-words text-sm font-medium text-rose-700">
                {importFileError}
              </p>
            ) : null}
          </div>

          <textarea
            className="input min-h-44 w-full max-w-full min-w-0 overflow-auto break-all font-mono text-sm"
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value);
              setImportMessage("");
              setImportError("");
            }}
            placeholder={portfolioImportExample}
          />

          <div className="flex w-full max-w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-w-0 items-start gap-2 text-sm font-medium text-stone-700 sm:items-center">
              <input
                type="checkbox"
                className="mt-1 shrink-0 sm:mt-0"
                checked={replaceMatchingImports}
                onChange={(event) =>
                  setReplaceMatchingImports(event.target.checked)
                }
              />
              <span className="min-w-0 break-words">
                Perbarui kepemilikan yang cocok berdasarkan ticker atau nama
              </span>
            </label>
            <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button
                type="button"
                onClick={importParsedRows}
                disabled={!canImport}
                className="min-h-11 w-full min-w-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSavingImport ? "Menyimpan..." : "Konfirmasi dan simpan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportText("");
                  setImportMessage("");
                  setImportError("");
                  setImportFileMessage("");
                  setImportFileError("");
                }}
                className="min-h-11 w-full min-w-0 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 sm:w-auto"
              >
                Bersihkan
              </button>
            </div>
          </div>

          {importMessage ? (
            <div className="w-full max-w-full min-w-0 break-words rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
              {importMessage}
            </div>
          ) : null}
          {importError ? (
            <div className="w-full max-w-full min-w-0 break-words rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800 ring-1 ring-rose-100">
              {importError}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-full min-w-0 rounded-lg bg-stone-100 p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h3 className="font-semibold text-stone-950">Pratinjau</h3>
            <span className="shrink-0 text-xs font-semibold text-stone-500">
              {importPreview.items.length} valid / {importPreview.rowCount}{" "}
              baris
            </span>
          </div>
          {importPreview.items.length > 0 ? (
            <div className="mt-3 max-h-[70vh] w-full max-w-full min-w-0 overflow-auto rounded-lg border border-stone-200 bg-white">
              <table className="min-w-[760px] text-left text-xs">
                <thead className="bg-stone-50 uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="sticky left-0 z-10 min-w-40 bg-stone-50 px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Harga kini</th>
                    <th className="px-3 py-2">Modal</th>
                    <th className="px-3 py-2">Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {importPreview.items.slice(0, 8).map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td className="sticky left-0 z-10 max-w-48 bg-white px-3 py-2 font-medium text-stone-950">
                        <span className="block truncate">{item.name}</span>
                        <span className="block text-[11px] font-normal text-stone-500">
                          {item.buyDate}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <InstrumentBadge
                          type={item.type}
                          className="text-[10px]"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-stone-600">
                        {item.ticker || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {item.quantity.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2">
                        {formatRupiah(item.currentPrice)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-stone-950">
                        {formatRupiah(item.buyPrice * item.quantity)}
                      </td>
                      <td className="px-3 py-2">
                        {dataSourceLabel(item.dataSource)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 max-w-full break-words text-sm leading-6 text-stone-600">
              Pilih file atau tempel CSV untuk melihat data yang akan disimpan.
              Pratinjau akan muncul di sini sebelum kamu menyimpan.
            </p>
          )}
          {importPreview.items.length > 8 ? (
            <p className="mt-2 max-w-full break-words text-xs font-medium text-stone-500">
              Menampilkan 8 baris pertama dari {importPreview.items.length}{" "}
              baris valid.
            </p>
          ) : null}
          {importPreview.errors.length > 0 ? (
            <div className="mt-3 w-full max-w-full min-w-0 rounded-lg bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-800 ring-1 ring-rose-100">
              {importPreview.errors.slice(0, 5).map((error) => (
                <p className="break-words" key={error}>{error}</p>
              ))}
            </div>
          ) : null}
          {importPreview.warnings.length > 0 ? (
            <div className="mt-3 w-full max-w-full min-w-0 rounded-lg bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-800 ring-1 ring-amber-100">
              {importPreview.warnings.slice(0, 3).map((warning) => (
                <p className="break-words" key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function mergeImportedPortfolioItems({
  currentItems,
  hasStoredPortfolio,
  importedItems,
  replaceMatchingImports,
}: {
  currentItems: PortfolioItem[];
  hasStoredPortfolio: boolean;
  importedItems: ImportedPortfolioItem[];
  replaceMatchingImports: boolean;
}) {
  const next = [...getWritablePortfolioBase(currentItems, hasStoredPortfolio)];
  const additions: PortfolioItem[] = [];

  importedItems.forEach((importedItem) => {
    const matchIndex = replaceMatchingImports
      ? next.findIndex((item) => isSameHolding(item, importedItem))
      : -1;
    const normalized = normalizePortfolioItem({
      ...importedItem,
      id: matchIndex >= 0 ? next[matchIndex].id : crypto.randomUUID(),
    });

    if (matchIndex >= 0) {
      next[matchIndex] = normalized;
    } else {
      additions.push(normalized);
    }
  });

  return [...additions, ...next];
}

async function readPortfolioImportFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv" || extension === "tsv" || extension === "txt") {
    return file.text();
  }

  if (extension === "xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = await readSheet(file);
    return rows
      .map((row) => row.map(formatImportCell).join(","))
      .filter((line) => line.trim())
      .join("\n");
  }

  throw new Error("Format file belum didukung. Gunakan .csv, .tsv, .txt, atau .xlsx.");
}

function formatImportCell(value: CellValue | null) {
  if (value === null) return "";

  const text =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : typeof value === "boolean"
        ? value ? "true" : "false"
        : String(value);

  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadSampleCsv() {
  const blob = new Blob([portfolioImportExample], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "arahdana-portfolio-sample.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getWritablePortfolioBase(
  current: PortfolioItem[],
  hasStoredPortfolio: boolean,
) {
  return hasStoredPortfolio ? current : [];
}

function normalizePortfolioItem(item: PortfolioItem): PortfolioItem {
  return {
    ...item,
    id: item.id || crypto.randomUUID(),
    ticker: item.ticker ?? "",
    notes: item.notes ?? "",
    buyPrice: nonNegativeNumber(item.buyPrice),
    quantity: nonNegativeNumber(item.quantity),
    currentPrice: nonNegativeNumber(item.currentPrice),
    riskCategory: isRiskCategory(item.riskCategory)
      ? item.riskCategory
      : "medium",
    dataSource: isDataSource(item.dataSource)
      ? item.dataSource
      : "manual_input",
    lastPriceUpdatedAt: item.lastPriceUpdatedAt,
  };
}

function isSameHolding(a: PortfolioItem, b: Omit<PortfolioItem, "id">) {
  const tickerA = a.ticker?.trim().toUpperCase();
  const tickerB = b.ticker?.trim().toUpperCase();

  if (tickerA && tickerB) {
    return tickerA === tickerB;
  }

  return (
    normalizeMatchText(a.name) === normalizeMatchText(b.name) &&
    a.type === b.type
  );
}

function normalizeMatchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRiskCategory(value: string): value is RiskCategory {
  return ["low", "medium", "high"].includes(value);
}

function isDataSource(value: unknown): value is DataSource {
  return (
    value === "live_public_market_data" ||
    value === "manual_input" ||
    value === "semi_auto_import" ||
    value === "bibit_import" ||
    value === "savings_import" ||
    value === "mock_data"
  );
}
