"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  DataSource,
  InvestmentType,
  PortfolioItem,
  RiskCategory,
} from "@/lib/types/investment";
import { parsePortfolioImport } from "@/lib/import/portfolioImport";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import {
  dataSourceLabel,
  fetchPublicMarketData,
  getLatestClose,
} from "@/lib/providers/marketClient";
import {
  formatPercent,
  formatRupiah,
  investmentTypeLabel,
  nonNegativeNumber,
} from "@/lib/utils/format";
import type { CellValue } from "read-excel-file/browser";
import { AllocationChart } from "@/components/AllocationChart";
import { useAuth } from "@/components/AuthProvider";
import { RiskBadge } from "@/components/RiskBadge";
import { InstrumentBadge } from "@/components/InstrumentBadge";
import { normalizeMarketTicker } from "@/lib/market/tickerUniverse";
import { computePortfolioCurrentPrice } from "@/lib/portfolio/valuation";
import { loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";

type PortfolioForm = Omit<PortfolioItem, "id">;

const portfolioImportExample = `sumber,nama,jenis,kode,harga beli,unit,nav,tanggal,catatan
Market,BBCA,saham,BBCA,9800,100,9700,2026-05-01,Bank Central Asia Tbk. [Google Finance: ✓ Aktif]
Market,BBRI,saham,BBRI,5200,300,5050,2026-05-01,Bank Rakyat Indonesia Tbk. [Coba BBRI:IDX]
Market,TLKM,saham,TLKM,3200,200,3150,2026-05-01,Telkom Indonesia Tbk. [Coba TLKM:IDX]
Market,ASII,saham,ASII,6500,150,6400,2026-05-01,Astra International Tbk. [Coba ASII:IDX]
Market,GOTO,saham,GOTO,250,10000,245,2026-05-01,GoTo Gojek Tokopedia Tbk. [Coba GOTO:IDX]
Market,UNVR,saham,UNVR,7850,60,7780,2026-05-01,Unilever Indonesia Tbk. [Coba UNVR:IDX]
Market,ADRO,saham,ADRO,2000,400,1980,2026-05-01,Adaro Energy Indonesia Tbk. [Coba ADRO:IDX]
Mutual,Sucorinvest Money Market Fund,pasar uang,,1000,5000,1015,2026-05-01,Reksa Dana Pasar Uang populer
Mutual,Batavia Dana Kas Maxima,pasar uang,,1000,4800,1014,2026-05-01,Reksa Dana Pasar Uang populer
Mutual,Mandiri Investa Pasar Uang,pasar uang,,1000,4700,1013,2026-05-01,Reksa Dana Pasar Uang populer
Mutual,Bahana Dana Likuid,pasar uang,,1000,4500,1012,2026-05-01,Reksa Dana Pasar Uang populer
Mutual,Danareksa Seruni Pasar Uang,pasar uang,,1000,5200,1016,2026-05-01,Reksa Dana Pasar Uang populer
Mutual,Schroder Dana Prestasi Plus,reksadana saham,,2800,900,2925,2026-05-01,Reksa Dana Saham populer
Mutual,BNP Paribas Pesona,reksadana saham,,2400,850,2520,2026-05-01,Reksa Dana Saham populer
Mutual,Manulife Saham Andalan,reksadana saham,,2100,1100,2250,2026-05-01,Reksa Dana Saham populer
Mutual,Ashmore Dana Ekuitas Nusantara,reksadana saham,,1800,1400,1920,2026-05-01,Reksa Dana Saham populer`;

export function PortfolioTable() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [aprMoneyMarketFund, setAprMoneyMarketFund] = useState(0.05);
  const [form, setForm] = useState<PortfolioForm>(() =>
    createEmptyPortfolioForm(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [formSubmitError, setFormSubmitError] = useState("");
  const [isLookingUpFormPrice, setIsLookingUpFormPrice] = useState(false);
  const [formLookupMessage, setFormLookupMessage] = useState("");
  const [formLookupError, setFormLookupError] = useState("");
  const [importText, setImportText] = useState("");
  const [replaceMatchingImports, setReplaceMatchingImports] = useState(true);
  const [importMessage, setImportMessage] = useState("");
  const [importFileMessage, setImportFileMessage] = useState("");
  const [importFileError, setImportFileError] = useState("");
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Memuat mode penyimpanan...");

  const importPreview = useMemo(
    () => parsePortfolioImport(importText),
    [importText],
  );

  useEffect(() => {
    if (isAuthLoading) return;

    let isMounted = true;
    window.setTimeout(() => {
      void (async () => {
        const saved = localArahDanaStorage.readPortfolio();
        const storedItems = Array.isArray(saved)
          ? normalizePortfolioItems(saved)
          : null;

        const settings = localArahDanaStorage.readSettings();
        if (settings && typeof settings.aprMoneyMarketFund === "number" && Number.isFinite(settings.aprMoneyMarketFund)) {
          if (isMounted) setAprMoneyMarketFund(nonNegativeNumber(settings.aprMoneyMarketFund));
        }

        if (!user) {
          if (!isMounted) return;
          setItems(storedItems ?? []);
          setHasStoredPortfolio(storedItems !== null);
          setSyncMessage("Login untuk sinkronisasi antar perangkat.");
          setIsHydrated(true);
          return;
        }

        try {
          const cloudItems = await loadCloudPortfolio(user);
          if (!isMounted) return;
          const nextItems = cloudItems.length > 0 ? cloudItems : storedItems ?? [];
          setItems(nextItems);
          setHasStoredPortfolio(true);
          localArahDanaStorage.writePortfolio(nextItems);
          setSyncMessage(
            cloudItems.length > 0
              ? "Cloud sync enabled. Holding dimuat dari Supabase dan dicadangkan lokal."
              : "Cloud sync enabled. Belum ada holding cloud; data lokal akan dicadangkan saat berubah.",
          );
        } catch (error) {
          if (!isMounted) return;
          setItems(storedItems ?? []);
          setHasStoredPortfolio(storedItems !== null);
          setSyncMessage(
            error instanceof Error
              ? `Cloud sync gagal, memakai localStorage. ${error.message}`
              : "Cloud sync gagal, memakai localStorage.",
          );
        } finally {
          if (isMounted) setIsHydrated(true);
        }
      })();
    }, 0);
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writePortfolio(items);
    if (!user) return;

    void saveCloudPortfolio(user, items)
      .then(() => {
        setSyncMessage("Cloud sync enabled. Portofolio tersimpan di Supabase dan localStorage.");
      })
      .catch((error) => {
        setSyncMessage(
          error instanceof Error
            ? `Local backup tersimpan, cloud sync gagal. ${error.message}`
            : "Local backup tersimpan, cloud sync gagal.",
        );
      });
  }, [isHydrated, items, user]);

  const totals = useMemo(() => {
    const summary = items.reduce(
      (acc, item) => {
        const invested = item.buyPrice * item.quantity;
        const { currentPriceUsed } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
        const current = currentPriceUsed * item.quantity;
        const profit = current - invested;

        acc.invested += invested;
        acc.current += current;
        acc.allocationMap[item.type] = (acc.allocationMap[item.type] ?? 0) + current;
        acc.performers.push({
          item,
          profit,
          profitPercent: invested > 0 ? (profit / invested) * 100 : 0,
        });
        return acc;
      },
      {
        invested: 0,
        current: 0,
        allocationMap: {} as Partial<Record<InvestmentType, number>>,
        performers: [] as Array<{ item: PortfolioItem; profit: number; profitPercent: number }>,
      },
    );

    const profit = summary.current - summary.invested;
    const profitPercent = summary.invested > 0 ? (profit / summary.invested) * 100 : 0;
    const allocation = Object.entries(summary.allocationMap).map(([type, value]) => ({
      key: type,
      label: investmentTypeLabel(type as InvestmentType),
      value,
      percent: summary.current > 0 ? Math.round((value / summary.current) * 100) : 0,
    }));

    return {
      invested: summary.invested,
      current: summary.current,
      profit,
      profitPercent,
      allocation,
      topGainer: summary.performers.length
        ? summary.performers.reduce((best, item) => (item.profitPercent > best.profitPercent ? item : best))
        : null,
      worstPerformer: summary.performers.length
        ? summary.performers.reduce((worst, item) => (item.profitPercent < worst.profitPercent ? item : worst))
        : null,
    };
  }, [aprMoneyMarketFund, items]);

  function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormSubmitError("");

    const currentPrice =
      form.currentPrice > 0 ? form.currentPrice : form.buyPrice;

    if (
      !form.name ||
      form.buyPrice <= 0 ||
      form.quantity <= 0 ||
      currentPrice <= 0
    ) {
      setFormSubmitError(
        "Nama, harga beli, jumlah/unit, dan harga kini harus valid. Jika harga kini kosong, isi harga beli dulu agar bisa dipakai sebagai harga kini.",
      );
      return;
    }

    const normalized = normalizePortfolioItem({
      ...form,
      currentPrice,
      dataSource: form.dataSource ?? "manual_input",
      lastPriceUpdatedAt: form.lastPriceUpdatedAt,
      id: editingId ?? crypto.randomUUID(),
    });

    setHasStoredPortfolio(true);
    setItems((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? normalized : item))
        : [normalized, ...getWritablePortfolioBase(current, hasStoredPortfolio)],
    );
    setEditingId(null);
    setForm(createEmptyPortfolioForm());
  }

  function startEditing(item: PortfolioItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      type: item.type,
      ticker: item.ticker ?? "",
      buyPrice: item.buyPrice,
      quantity: item.quantity,
      currentPrice: item.currentPrice,
      buyDate: item.buyDate,
      notes: item.notes ?? "",
      riskCategory: item.riskCategory,
      dataSource: item.dataSource,
      lastPriceUpdatedAt: item.lastPriceUpdatedAt,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(createEmptyPortfolioForm());
  }

  function deleteItem(id: string) {
    setHasStoredPortfolio(true);
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      cancelEditing();
    }
  }

  async function refreshPrices() {
    const refreshableItems = items.filter((item) => item.ticker?.trim());

    setRefreshMessage("");
    setRefreshError("");

    if (refreshableItems.length === 0) {
      setRefreshError(
        "Tidak ada ticker. Tambahkan ticker seperti BBCA.JK, BBRI.JK, TLKM.JK, atau ASII.JK dulu.",
      );
      return;
    }

    setIsRefreshing(true);

    try {
      const results = await Promise.allSettled(
        refreshableItems.map(async (item) => {
          const ticker = normalizeLookupTicker(item.ticker ?? "");
          const marketData = await fetchPublicMarketData({
            ticker,
            range: "1mo",
            interval: "1d",
          });
          const latestClose = getLatestClose(marketData.prices);
          if (!latestClose) {
            throw new Error("Harga penutupan terbaru tidak tersedia.");
          }

          return {
            id: item.id,
            ticker: ticker || item.name,
            latestClose,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      const updates = new Map<
        string,
        { latestClose: number; updatedAt: string }
      >();
      const failures: string[] = [];

      results.forEach((result, index) => {
        const item = refreshableItems[index];
        if (result.status === "fulfilled") {
          updates.set(result.value.id, {
            latestClose: result.value.latestClose,
            updatedAt: result.value.updatedAt,
          });
        } else {
          failures.push(
            `${item.ticker ?? item.name}: ${result.reason instanceof Error ? result.reason.message : "gagal diperbarui"}`,
          );
        }
      });

      if (updates.size > 0) {
        setHasStoredPortfolio(true);
        setItems((current) =>
          current.map((item) => {
            const update = updates.get(item.id);
            if (!update) return item;
            return {
              ...item,
              currentPrice: update.latestClose,
              dataSource: "live_public_market_data",
              lastPriceUpdatedAt: update.updatedAt,
            };
          }),
        );
      }

      setRefreshMessage(
        updates.size > 0
          ? `${updates.size} harga diperbarui dari data pasar publik langsung.`
          : "",
      );
      setRefreshError(
        failures.length > 0
          ? `${failures.length} ticker gagal diperbarui. Harga manual sebelumnya tetap dipakai. ${failures.join(" ")}`
          : "",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function lookupFormLatestPrice() {
    const ticker = form.ticker?.trim();
    setFormLookupMessage("");
    setFormLookupError("");

    if (!ticker) {
      setFormLookupError(
        "Tambahkan ticker dulu, misalnya BBCA.JK atau BBRI.JK.",
      );
      return;
    }

    setIsLookingUpFormPrice(true);

    try {
      const normalizedTicker = normalizeLookupTicker(ticker);
      const marketData = await fetchPublicMarketData({
        ticker: normalizedTicker,
        range: "1mo",
        interval: "1d",
      });
      const latestClose = getLatestClose(marketData.prices);
      if (!latestClose) {
        throw new Error("Harga penutupan terbaru tidak tersedia.");
      }

      setForm((current) => ({
        ...current,
        name: current.name || marketData.ticker,
        ticker: marketData.ticker,
        currentPrice: latestClose,
        dataSource: "live_public_market_data",
        lastPriceUpdatedAt: new Date().toISOString(),
      }));
      setFormLookupMessage(
        `Harga publik terbaru untuk ${marketData.ticker} berhasil dimuat.`,
      );
    } catch (error) {
      setFormLookupError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil harga publik terbaru.",
      );
    } finally {
      setIsLookingUpFormPrice(false);
    }
  }

  function importParsedRows() {
    setImportMessage("");

    if (importPreview.items.length === 0) {
      setImportMessage(
        "Belum ada baris valid untuk diimpor. Tempel baris dengan minimal nama, harga atau saldo, dan unit.",
      );
      return;
    }

    setHasStoredPortfolio(true);
    setItems((current) => {
      const next = [...getWritablePortfolioBase(current, hasStoredPortfolio)];
      const additions: PortfolioItem[] = [];

      importPreview.items.forEach((importedItem) => {
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
    });

    setImportMessage(
      `${importPreview.items.length} baris berhasil diimpor dengan total modal ${formatRupiah(
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
  }

  async function handleImportFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setImportFileMessage("");
    setImportFileError("");
    setImportMessage("");

    if (!file) return;

    setIsReadingImportFile(true);

    try {
      const extractedText = await readPortfolioImportFile(file);
      if (!extractedText.trim()) {
        throw new Error("File tidak berisi baris yang bisa dibaca.");
      }

      setImportText(extractedText);
      setImportFileMessage(
        `${file.name} berhasil dibaca. Periksa pratinjau sebelum mengimpor.`,
      );
    } catch (error) {
      setImportFileError(
        error instanceof Error
          ? error.message
          : "File gagal dibaca. Coba simpan sebagai .xlsx atau .csv.",
      );
    } finally {
      setIsReadingImportFile(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-950">Mode penyimpanan</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Mode lokal menyimpan data hanya di browser ini. Cloud sync menyimpan data ke akun Supabase agar bisa dipakai di perangkat lain.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              user
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-amber-50 text-amber-800 ring-amber-100"
            }`}
          >
            {user ? "Cloud sync enabled" : isConfigured ? "Local mode" : "Local mode"}
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-stone-600">{syncMessage}</p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-950">
              Impor semi-otomatis
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Tempel CSV atau baris tabel dari Bibit, spreadsheet, atau catatan
              tabungan. Header seperti nama, jenis, ticker, harga beli, unit,
              NAV, saldo, sumber, dan catatan akan dideteksi otomatis.
            </p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Siap untuk Bibit/tabungan
          </span>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <div className="grid gap-3">
            <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    Upload file Excel
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Mendukung .xlsx, .csv, .tsv, dan .txt dari sheet pertama.
                  </p>
                </div>
                <label className="w-fit cursor-pointer rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800">
                  {isReadingImportFile ? "Membaca..." : "Pilih file"}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values,text/plain"
                    onChange={handleImportFileChange}
                    disabled={isReadingImportFile}
                  />
                </label>
              </div>
              {importFileMessage ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">
                  {importFileMessage}
                </p>
              ) : null}
              {importFileError ? (
                <p className="mt-3 text-sm font-medium text-rose-700">
                  {importFileError}
                </p>
              ) : null}
            </div>
            <textarea
              className="input min-h-44 font-mono text-sm"
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportMessage("");
              }}
              placeholder={portfolioImportExample}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={replaceMatchingImports}
                  onChange={(event) =>
                    setReplaceMatchingImports(event.target.checked)
                  }
                />
                Perbarui kepemilikan yang cocok berdasarkan ticker atau nama
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={importParsedRows}
                  disabled={importPreview.items.length === 0}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Impor baris pratinjau
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportText("");
                    setImportMessage("");
                  }}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Bersihkan
                </button>
              </div>
            </div>
            {importMessage ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
                {importMessage}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg bg-stone-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-stone-950">Pratinjau</h3>
              <span className="text-xs font-semibold text-stone-500">
                {importPreview.items.length} valid / {importPreview.rowCount}{" "}
                baris
              </span>
            </div>
            {importPreview.items.length > 0 ? (
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-stone-50 uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Jenis</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Harga/unit</th>
                      <th className="px-3 py-2">Modal</th>
                      <th className="px-3 py-2">Sumber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {importPreview.items.slice(0, 8).map((item, index) => (
                      <tr key={`${item.name}-${index}`}>
                        <td className="px-3 py-2 font-medium text-stone-950">
                          {item.name}
                        </td>
                        <td className="px-3 py-2">
                          <InstrumentBadge
                            type={item.type}
                            className="text-[10px]"
                          />
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
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Tempel baris untuk melihat data yang akan disimpan. Untuk
                tabungan, kolom saldo akan menjadi satu kepemilikan kas.
              </p>
            )}
            {importPreview.errors.length > 0 ? (
              <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-800 ring-1 ring-rose-100">
                {importPreview.errors.slice(0, 4).map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
            {importPreview.warnings.length > 0 ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-800 ring-1 ring-amber-100">
                {importPreview.warnings.slice(0, 3).map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <form
        onSubmit={submitItem}
        className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-stone-950">
            {editingId ? "Edit kepemilikan" : "Input manual cadangan"}
          </h2>
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            Data contoh diberi label jelas
          </span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Nama instrumen">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Jenis">
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as InvestmentType })
              }
            >
              <InstrumentOptions />
            </select>
          </Field>
          <Field label="Ticker / simbol">
            <input
              className="input"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              placeholder="BBCA.JK"
            />
          </Field>
          <Field label="Harga beli">
            <input
              className="input"
              type="number"
              min="0"
              value={form.buyPrice || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  buyPrice: nonNegativeNumber(Number(e.target.value)),
                })
              }
            />
          </Field>
          <Field label="Jumlah / unit">
            <input
              className="input"
              type="number"
              min="0"
              value={form.quantity || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: nonNegativeNumber(Number(e.target.value)),
                })
              }
            />
          </Field>
          <Field label="Harga kini">
            <input
              className="input"
              type="number"
              min="0"
              value={form.currentPrice || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentPrice: nonNegativeNumber(Number(e.target.value)),
                })
              }
            />
          </Field>
          <Field label="Tanggal beli">
            <input
              className="input"
              type="date"
              value={form.buyDate}
              onChange={(e) => setForm({ ...form, buyDate: e.target.value })}
            />
          </Field>
          <Field label="Kategori risiko">
            <select
              className="input"
              value={form.riskCategory}
              onChange={(e) =>
                setForm({
                  ...form,
                  riskCategory: e.target.value as RiskCategory,
                })
              }
            >
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </select>
          </Field>
          <Field label="Catatan">
            <input
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">
            {editingId ? "Simpan perubahan" : "Tambah instrumen"}
          </button>
          <button
            type="button"
            onClick={lookupFormLatestPrice}
            disabled={isLookingUpFormPrice || !form.ticker?.trim()}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLookingUpFormPrice ? "Mencari..." : "Isi harga terbaru otomatis"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Batal edit
            </button>
          ) : null}
        </div>
        {formLookupMessage ? (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {formLookupMessage}
          </p>
        ) : null}
        {formLookupError ? (
          <p className="mt-3 text-sm font-medium text-rose-700">
            {formLookupError}
          </p>
        ) : null}
        {formSubmitError ? (
          <p className="mt-3 text-sm font-medium text-rose-700">
            {formSubmitError}
          </p>
        ) : null}
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary label="Modal tertanam" value={formatRupiah(totals.invested)} />
        <Summary label="Nilai kini" value={formatRupiah(totals.current)} />
        <Summary
          label="Total untung/rugi"
          value={formatRupiah(totals.profit)}
          tone={totals.profit >= 0 ? "good" : "bad"}
          helper={formatPercent(totals.profitPercent)}
        />
        <Summary label="Jumlah kepemilikan" value={`${items.length}`} helper="Instrumen tersimpan" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <AllocationChart
          title="Alokasi portofolio"
          description="Berdasarkan nilai kini tiap jenis instrumen."
          data={totals.allocation}
          emptyMessage="Tambahkan kepemilikan untuk melihat alokasi."
        />
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Pemenang dan pemberat</h2>
          <div className="mt-4 grid gap-3">
            <PerformerSummary title="Top gainer" performer={totals.topGainer} tone="good" />
            <PerformerSummary title="Worst performer" performer={totals.worstPerformer} tone="bad" />
          </div>
        </section>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-stone-950">Kepemilikan</h2>
            <p className="mt-1 text-sm text-stone-500">
              Pembaruan memakai /api/market (source=auto) dan tetap menyimpan
              harga sebelumnya saat ticker gagal.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshPrices}
            disabled={isRefreshing || items.length === 0}
            className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Memperbarui..." : "Perbarui harga"}
          </button>
        </div>
        {refreshMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {refreshMessage}
          </div>
        ) : null}
        {refreshError ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {refreshError}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Harga beli</th>
                <th className="px-4 py-3">Harga terbaru</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Modal</th>
                <th className="px-4 py-3">Nilai kini</th>
                <th className="px-4 py-3">P/L</th>
                <th className="px-4 py-3">P/L %</th>
                <th className="px-4 py-3">Risiko</th>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-8 text-center text-sm text-stone-500"
                  >
                    Belum ada kepemilikan tersimpan. Tambahkan instrumen manual
                    untuk mulai.
                  </td>
                </tr>
              ) : null}
              {items.map((item) => {
                const invested = item.buyPrice * item.quantity;
                const { currentPriceUsed, isEstimated } = computePortfolioCurrentPrice(item, { aprMoneyMarketFund });
                const current = currentPriceUsed * item.quantity;
                const profit = current - invested;
                const profitPercent =
                  invested > 0 ? (profit / invested) * 100 : 0;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-stone-950">
                      {item.name}
                      <span className="block text-xs font-normal text-stone-500">
                        {item.buyDate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <InstrumentBadge type={item.type} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">
                      {item.ticker || "-"}
                    </td>
                    <td className="px-4 py-3">{formatRupiah(item.buyPrice)}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-stone-950">
                        {formatRupiah(currentPriceUsed)}
                      </span>
                      {isEstimated ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                          Estimasi
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {item.quantity.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">{formatRupiah(invested)}</td>
                    <td className="px-4 py-3">{formatRupiah(current)}</td>
                    <td
                      className={
                        profit >= 0
                          ? "px-4 py-3 text-emerald-700"
                          : "px-4 py-3 text-rose-700"
                      }
                    >
                      {formatRupiah(profit)}
                    </td>
                    <td
                      className={
                        profitPercent >= 0
                          ? "px-4 py-3 text-emerald-700"
                          : "px-4 py-3 text-rose-700"
                      }
                    >
                      {formatPercent(profitPercent)}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={item.riskCategory} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-semibold text-stone-700">
                        {dataSourceLabel(item.dataSource)}
                      </span>
                      {item.lastPriceUpdatedAt ? (
                        <span className="block text-xs text-stone-500">
                          {formatDateTime(item.lastPriceUpdatedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InstrumentOptions() {
  return (
    <>
      <option value="stock">Saham IDX</option>
      <option value="cash_savings">Tabungan / Kas</option>
      <option value="money_market_fund">Reksadana Pasar Uang</option>
      <option value="bond_fund">Reksadana Pendapatan Tetap</option>
      <option value="equity_fund">Reksadana Saham</option>
      <option value="mixed_fund">Reksadana Campuran</option>
      <option value="bond">Obligasi</option>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-stone-700">
      {label}
      {children}
    </label>
  );
}

function Summary({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-stone-950";

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
      {helper ? <p className="mt-1 text-sm text-stone-500">{helper}</p> : null}
    </div>
  );
}

function PerformerSummary({
  title,
  performer,
  tone,
}: {
  title: string;
  performer: { item: PortfolioItem; profit: number; profitPercent: number } | null;
  tone: "good" | "bad";
}) {
  const toneClass = tone === "good" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="rounded-lg bg-stone-100 p-4">
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      {performer ? (
        <>
          <p className="mt-2 font-semibold text-stone-950">{performer.item.name}</p>
          <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
            {formatRupiah(performer.profit)} ({formatPercent(performer.profitPercent)})
          </p>
          <p className="mt-1 text-xs text-stone-500">{dataSourceLabel(performer.item.dataSource)}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-stone-500">Belum ada kepemilikan.</p>
      )}
    </div>
  );
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

  throw new Error("Format file belum didukung. Gunakan .xlsx atau .csv.");
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

function getWritablePortfolioBase(
  current: PortfolioItem[],
  hasStoredPortfolio: boolean,
) {
  return hasStoredPortfolio ? current : [];
}

function normalizeLookupTicker(value: string) {
  return normalizeMarketTicker(value);
}

function createEmptyPortfolioForm(): PortfolioForm {
  return {
    name: "",
    type: "stock",
    ticker: "",
    buyPrice: 0,
    quantity: 0,
    currentPrice: 0,
    buyDate: new Date().toISOString().slice(0, 10),
    notes: "",
    riskCategory: "medium",
    dataSource: "manual_input",
  };
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

function normalizePortfolioItems(items: PortfolioItem[]) {
  const seenIds = new Set<string>();

  return items.map((item) => {
    const normalized = normalizePortfolioItem(item);
    if (!seenIds.has(normalized.id)) {
      seenIds.add(normalized.id);
      return normalized;
    }

    const id = crypto.randomUUID();
    seenIds.add(id);
    return { ...normalized, id };
  });
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
