"use client";

import { useEffect, useState } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";
import { useAuth } from "@/components/AuthProvider";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";

export function IntegrationsCsvImport() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan import...");

  useEffect(() => {
    if (isAuthLoading) return;

    let isMounted = true;
    void (async () => {
      const saved = localArahDanaStorage.readPortfolio();
      const localItems = Array.isArray(saved) ? saved : [];

      if (!user) {
        if (!isMounted) return;
        setItems(localItems);
        setHasStoredPortfolio(Array.isArray(saved));
        setStatusMessage("Data akan disimpan aman di perangkat ini.");
        return;
      }

      try {
        const cloudItems = await loadCloudPortfolio(user);
        if (!isMounted) return;
        const nextItems = cloudItems.length > 0 ? cloudItems : localItems;
        setItems(nextItems);
        setHasStoredPortfolio(true);
        localArahDanaStorage.writePortfolio(nextItems);
        setStatusMessage(
          cloudItems.length > 0
            ? "Data pembanding siap."
            : "Portofolio siap dibuat dari file pertamamu.",
        );
      } catch (error) {
        if (!isMounted) return;
        setItems(localItems);
        setHasStoredPortfolio(Array.isArray(saved));
        setStatusMessage(
          error instanceof Error
            ? `Data tetap aman di perangkat ini. ${error.message}`
            : "Data tetap aman di perangkat ini.",
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  async function saveImportedItems(nextItems: PortfolioItem[]) {
    localArahDanaStorage.writePortfolio(nextItems);

    if (user) {
      await saveCloudPortfolio(user, nextItems);
      setStatusMessage("Import tersimpan dan siap dipakai.");
    } else {
      setStatusMessage("Import tersimpan di perangkat ini.");
    }

    setItems(nextItems);
    setHasStoredPortfolio(true);
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="w-full max-w-full min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-stone-950">Import CSV</p>
        <p className="mt-1 max-w-full break-words text-sm leading-6 text-stone-600">{statusMessage}</p>
      </section>
      <CsvPortfolioImportSection
        existingItems={items}
        hasStoredPortfolio={hasStoredPortfolio}
        onImport={saveImportedItems}
        storageLabel={user ? "akun ArahDana" : "perangkat ini"}
        title="CSV Import Portofolio"
        description="Masukkan data portofolio dari CSV, tinjau pratinjau, lalu simpan saat sudah sesuai."
      />
    </div>
  );
}
