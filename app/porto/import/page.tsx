"use client";

import { useState } from "react";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { ButtonLink } from "@/components/ui";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { PortfolioItem } from "@/lib/types/investment";

export default function PortoImportPage() {
  const [items, setItems] = useState<PortfolioItem[]>(
    () => localArahDanaStorage.readPortfolio() ?? [],
  );
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(
    () => localArahDanaStorage.readPortfolio() !== null,
  );
  const [isImported, setIsImported] = useState(false);

  function saveImport(nextItems: PortfolioItem[]) {
    localArahDanaStorage.writePortfolio(nextItems);
    setItems(nextItems);
    setHasStoredPortfolio(true);
    setIsImported(true);
  }

  return (
    <FocusedFlowShell
      eyebrow="Import Porto"
      title="Import CSV di ruang khusus"
      description="Import dan pratinjau data dipindahkan keluar dari dashboard supaya Porto tetap fokus sebagai ringkasan kepemilikan."
      backHref="/portfolio"
    >
      {isImported ? (
        <FlowPanel className="grid gap-3">
          <p className="rounded-[1rem] bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 ring-1 ring-emerald-100">
            Import selesai. Data baru sudah tersimpan di perangkat ini.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink href="/portfolio" variant="primary">
              Lihat Porto
            </ButtonLink>
            <ButtonLink href="/review" variant="secondary">
              Buka Review
            </ButtonLink>
          </div>
        </FlowPanel>
      ) : null}

      <CsvPortfolioImportSection
        existingItems={items}
        hasStoredPortfolio={hasStoredPortfolio}
        onImport={saveImport}
        storageLabel="Porto"
        title="Upload atau tempel CSV"
        description="Pilih file CSV, cek pratinjau, lalu simpan. Proses ini tetap lokal di browser."
      />
    </FocusedFlowShell>
  );
}
