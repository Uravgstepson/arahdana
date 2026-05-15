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
  const [statusMessage, setStatusMessage] = useState("Memuat mode penyimpanan...");

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
        setStatusMessage("Belum login. Import akan disimpan ke localStorage browser ini.");
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
            ? "Login aktif. Data pembanding dimuat dari Supabase."
            : "Login aktif. Belum ada data cloud; import akan membuat portofolio Supabase.",
        );
      } catch (error) {
        if (!isMounted) return;
        setItems(localItems);
        setHasStoredPortfolio(Array.isArray(saved));
        setStatusMessage(
          error instanceof Error
            ? `Supabase tidak bisa dimuat, import akan memakai localStorage. ${error.message}`
            : "Supabase tidak bisa dimuat, import akan memakai localStorage.",
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
      setStatusMessage("Import tersimpan di Supabase dan dicadangkan ke localStorage.");
    } else {
      setStatusMessage("Import tersimpan di localStorage browser ini.");
    }

    setItems(nextItems);
    setHasStoredPortfolio(true);
  }

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-stone-950">Mode import CSV</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">{statusMessage}</p>
      </section>
      <CsvPortfolioImportSection
        existingItems={items}
        hasStoredPortfolio={hasStoredPortfolio}
        onImport={saveImportedItems}
        storageLabel={user ? "Supabase dan localStorage" : "localStorage"}
        title="CSV Import Portofolio"
        description="Import holdings reksadana/Bibit dari CSV tanpa mengunggah file. Kolom yang didukung: name, type, ticker, buy_price, quantity, current_price, buy_date, notes."
      />
    </div>
  );
}
