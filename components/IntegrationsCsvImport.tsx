"use client";

import { useEffect, useState } from "react";
import type { PortfolioItem } from "@/lib/types/investment";
import { localArahDanaStorage } from "@/lib/storage/localStorage";
import { loadCloudPortfolio, saveCloudPortfolio } from "@/lib/supabase/sync";
import { useAuth } from "@/components/AuthProvider";
import { CsvPortfolioImportSection } from "@/components/CsvPortfolioImportSection";
import { trackAppEvent } from "@/lib/monitoring/events";

export function IntegrationsCsvImport() {
  const { isConfigured, isLoading: isAuthLoading, user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [hasStoredPortfolio, setHasStoredPortfolio] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Menyiapkan import...");

  useEffect(() => {
    if (isAuthLoading) return;

    let isMounted = true;
    void (async () => {
      const saved = !isConfigured ? localArahDanaStorage.readPortfolio() : null;
      const localItems = Array.isArray(saved) ? saved : [];

      if (!user) {
        if (!isMounted) return;
        setItems(localItems);
        setHasStoredPortfolio(Array.isArray(saved));
        setStatusMessage(
          isConfigured
            ? "Login untuk menyimpan import ke akun."
            : "Data akan disimpan aman di perangkat ini.",
        );
        return;
      }

      try {
        const cloudItems = await loadCloudPortfolio(user);
        if (!isMounted) return;
        const nextItems = cloudItems;
        setItems(nextItems);
        setHasStoredPortfolio(nextItems.length > 0);
        localArahDanaStorage.writePortfolio(nextItems);
        setStatusMessage(
          nextItems.length > 0
            ? "Data pembanding siap."
            : "Portofolio siap dibuat dari file pertamamu.",
        );
      } catch (error) {
        if (!isMounted) return;
        setItems([]);
        setHasStoredPortfolio(false);
        setStatusMessage(
          error instanceof Error
            ? `Portofolio akun belum bisa dimuat. ${error.message}`
            : "Portofolio akun belum bisa dimuat.",
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user]);

  async function saveImportedItems(nextItems: PortfolioItem[]) {
    if (!user && isConfigured) {
      setStatusMessage("Login untuk menyimpan import ke akun.");
      return;
    }

    let savedItems = nextItems;
    if (user) {
      await saveCloudPortfolio(user, nextItems);
      savedItems = await loadCloudPortfolio(user);
      localArahDanaStorage.writePortfolio(savedItems);
      setStatusMessage("Import tersimpan dan siap dipakai.");
    } else {
      localArahDanaStorage.writePortfolio(nextItems);
      setStatusMessage("Import tersimpan di perangkat ini.");
    }

    setItems(savedItems);
    setHasStoredPortfolio(true);
    trackAppEvent("csv_import_used", {
      page: "/integrations",
      source: "integrations_import",
    });
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
