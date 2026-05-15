"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Disclaimer } from "@/components/Disclaimer";
import { APP_VERSION_LABEL } from "@/lib/appMeta";
import { cn } from "@/lib/utils/format";

const titles: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/portfolio": "Portofolio",
  "/analyzer": "Analisis",
  "/watchlist": "Pantauan",
  "/market-prices": "Harga Pasar",
  "/settings": "Pengaturan",
  "/integrations": "Integrasi",
  "/profile": "Akun",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "ArahDana";
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  return (
    <div className="min-h-screen text-stone-950">
      <Sidebar />
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-44 pt-4 sm:px-5 lg:pb-8 lg:pl-72 lg:pr-6 lg:pt-6">
        <div className="motion-shell mb-5 flex flex-col gap-3 rounded-[1.7rem] border border-white/40 bg-white/50 p-4 shadow-sm backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">ArahDana</p>
            <h1
              className={cn(
                "text-2xl font-semibold leading-tight tracking-tight text-stone-950 transition-all duration-200 sm:text-[2rem]",
                !isHeaderExpanded && "sm:max-w-xs sm:truncate",
              )}
            >
              {title}
            </h1>
            {isHeaderExpanded ? (
              <p className="mt-3 text-sm text-stone-600">
                Dasbor pendukung keputusan investasi Indonesia
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsHeaderExpanded((current) => !current)}
            className="w-fit rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-white/70 hover:bg-white/90"
            aria-expanded={isHeaderExpanded}
          >
            {isHeaderExpanded ? "Tutup" : "Buka"}
          </button>
        </div>
        <div className="motion-shell motion-delay-1">
          <Disclaimer />
        </div>
        <div key={pathname} className="page-flow mt-5">
          {children}
        </div>
        <footer className="mt-8 text-center text-[0.68rem] font-medium tracking-[0.08em] text-stone-400 lg:hidden">
          {APP_VERSION_LABEL}
        </footer>
      </main>
    </div>
  );
}
