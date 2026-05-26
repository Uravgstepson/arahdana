"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";
import { FlowPanel, FocusedFlowShell } from "@/components/FocusedFlow";
import { ButtonLink } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import type { PortfolioItem } from "@/lib/types/investment";
import { loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";

export default function PortoImportPage() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;
    let isMounted = true;

    void (async () => {
      try {
        const nextItems = user
          ? await loadCloudPortfolio(user)
          : !isConfigured
            ? (localArahDanaStorage.readPortfolio() ?? [])
            : [];
        if (!isMounted) return;
        setItems(nextItems);
        setHasStoredPortfolio(nextItems.length > 0);
        if (user) localArahDanaStorage.writePortfolio(nextItems);
      } catch {
        if (!isMounted) return;
        setItems([]);
        setHasStoredPortfolio(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user]);

  function saveImport(nextItems: PortfolioItem[]) {
    void (async () => {
      if (!user && isConfigured) {
        setMessage("Login dulu untuk menyimpan import ke akun.");
        return;
      }

      const savedItems = user
        ? await saveAndReloadCloudPortfolio(user, nextItems)
        : nextItems;
      localArahDanaStorage.writePortfolio(savedItems);
      setItems(savedItems);
      setHasStoredPortfolio(savedItems.length > 0);
      setIsImported(true);
    })().catch((error) => {
      setMessage(
        error instanceof Error
          ? `Import belum tersimpan. ${error.message}`
          : "Import belum tersimpan.",
      );
    });
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
      {message ? (
        <FlowPanel>
          <p className="text-sm font-semibold leading-6 text-amber-800">
            {message}
          </p>
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

async function saveAndReloadCloudPortfolio(
  user: User,
  nextItems: PortfolioItem[],
) {
  await saveCloudPortfolio(user, nextItems);
  return loadCloudPortfolio(user);
}
