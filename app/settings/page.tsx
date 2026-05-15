"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { InvestmentType, TimeHorizon, UserSettings } from "@/lib/types/investment";
import { InstrumentOptions } from "@/components/PortfolioTable";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { clampNumber, formatRupiah, investmentTypeLabel, nonNegativeNumber } from "@/lib/utils/format";

const defaults: UserSettings = {
  capital: 10_000_000,
  riskTolerance: 15,
  timeHorizon: "medium",
  preferredInstruments: ["money_market_fund", "bond_fund", "stock"],
  aprMoneyMarketFund: 0.05,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [preferred, setPreferred] = useState<InvestmentType>("stock");
  const [clearStatus, setClearStatus] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      setSettings(readStoredSettings());
      setIsHydrated(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localArahDanaStorage.writeSettings(settings);
  }, [isHydrated, settings]);

  function addPreferred() {
    setSettings((current) =>
      current.preferredInstruments.includes(preferred)
        ? current
        : { ...current, preferredInstruments: [...current.preferredInstruments, preferred] },
    );
    setClearStatus("");
  }

  function removePreferred(type: InvestmentType) {
    setSettings((current) => ({
      ...current,
      preferredInstruments: current.preferredInstruments.filter((item) => item !== type),
    }));
    setClearStatus("");
  }

  function clearAllData() {
    const confirmed = window.confirm(
      "Hapus semua data lokal ArahDana dari browser ini? Ini akan menghapus kepemilikan portofolio, item pantauan, dan mengatur ulang pengaturan.",
    );
    if (!confirmed) return;

    localArahDanaStorage.clearAll(defaults);
    setSettings(defaults);
    setPreferred("stock");
    setClearStatus("Data portofolio, pantauan, dan pengaturan lokal sudah dihapus.");
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Asumsi bawaan</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Disimpan lokal di browser ini untuk V1 melalui adapter penyimpanan yang bisa diganti ke Supabase nanti.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label={`Modal bawaan: ${formatRupiah(settings.capital)}`}>
            <input className="input" type="number" min="0" value={settings.capital} onChange={(e) => setSettings({ ...settings, capital: nonNegativeNumber(Number(e.target.value)) })} />
          </Field>
          <Field label={`Toleransi risiko: ${settings.riskTolerance}%`}>
            <input type="range" min="5" max="30" value={settings.riskTolerance} onChange={(e) => setSettings({ ...settings, riskTolerance: clampNumber(Number(e.target.value), 5, 30) })} />
          </Field>
          <Field label="Jangka waktu">
            <select className="input" value={settings.timeHorizon} onChange={(e) => setSettings({ ...settings, timeHorizon: e.target.value as TimeHorizon })}>
              <option value="short">Jangka pendek</option>
              <option value="medium">Jangka menengah</option>
              <option value="long">Jangka panjang</option>
            </select>
          </Field>
          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-semibold">Instrumen pilihan</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <select className="input" value={preferred} onChange={(e) => setPreferred(e.target.value as InvestmentType)}>
                <InstrumentOptions />
              </select>
              <button type="button" onClick={addPreferred} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                Tambah
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.preferredInstruments.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => removePreferred(item)}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
                >
                  {investmentTypeLabel(item)} x
                </button>
              ))}
              {settings.preferredInstruments.length === 0 ? (
                <span className="text-sm text-stone-500">Belum ada instrumen pilihan.</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-sm font-semibold">Estimasi imbal hasil RDPU</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Dipakai hanya untuk reksadana pasar uang jika NAV resmi belum terhubung, supaya “bunga” di portofolio bisa naik secara masuk akal.
            </p>
            <Field
              label={`APR RDPU (per tahun): ${Math.round((settings.aprMoneyMarketFund ?? defaults.aprMoneyMarketFund ?? 0) * 10000) / 100}%`}
            >
              <input
                className="input"
                type="number"
                min="0"
                max="0.5"
                step="0.001"
                value={settings.aprMoneyMarketFund ?? defaults.aprMoneyMarketFund ?? 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aprMoneyMarketFund: nonNegativeNumber(Number(e.target.value)),
                  })
                }
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Kontrol data lokal</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          ArahDana V1 hanya menyimpan data portofolio, pantauan, dan pengaturan di browser ini. Kredensial bank, e-wallet, atau Bibit tidak disimpan.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
        >
          Hapus semua data lokal
        </button>
        {clearStatus ? <p className="mt-3 text-sm font-medium text-emerald-700">{clearStatus}</p> : null}
      </section>
    </div>
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

function readStoredSettings() {
  const saved = localArahDanaStorage.readSettings();
  if (!saved) {
    return defaults;
  }

  const preferredInstruments = Array.isArray(saved.preferredInstruments)
    ? saved.preferredInstruments.filter(isInvestmentType)
    : [];

  return {
    ...defaults,
    ...saved,
    capital: nonNegativeNumber(saved.capital ?? defaults.capital),
    riskTolerance: clampNumber(saved.riskTolerance ?? defaults.riskTolerance, 5, 30),
    timeHorizon: isTimeHorizon(saved.timeHorizon) ? saved.timeHorizon : defaults.timeHorizon,
    aprMoneyMarketFund:
      typeof saved.aprMoneyMarketFund === "number" && Number.isFinite(saved.aprMoneyMarketFund)
        ? nonNegativeNumber(saved.aprMoneyMarketFund)
        : defaults.aprMoneyMarketFund,
    preferredInstruments: Array.isArray(saved.preferredInstruments)
      ? preferredInstruments
      : defaults.preferredInstruments,
  };
}

function isTimeHorizon(value: unknown): value is TimeHorizon {
  return value === "short" || value === "medium" || value === "long";
}

function isInvestmentType(value: unknown): value is InvestmentType {
  return (
    value === "stock" ||
    value === "cash_savings" ||
    value === "money_market_fund" ||
    value === "bond_fund" ||
    value === "equity_fund" ||
    value === "mixed_fund" ||
    value === "bond"
  );
}
