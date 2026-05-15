"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Disclaimer } from "@/components/Disclaimer";
import { APP_VERSION_LABEL } from "@/lib/appMeta";

const titles: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/portfolio": "Portofolio",
  "/analyzer": "Analisis",
  "/watchlist": "Pantauan",
  "/market-prices": "Harga Pasar",
  "/settings": "Pengaturan",
  "/integrations": "Integrasi",
  "/profile": "Akun",
  "/login": "Login",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "ArahDana";

  return (
    <div className="min-h-screen text-stone-950">
      <Sidebar />
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-28 pt-4 sm:px-5 lg:pb-8 lg:pl-32 lg:pr-6 lg:pt-6">
        <header className="motion-shell sticky top-3 z-40 mb-5 flex items-center justify-between rounded-[1.5rem] border border-white/50 bg-white/66 px-4 py-3 shadow-sm backdrop-blur-3xl sm:static sm:rounded-[1.7rem] sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              ArahDana
            </p>
            <h1 className="truncate text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
              {title}
            </h1>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Capsule
          </span>
        </header>
        <Disclaimer />
        <div key={pathname} className="page-flow relative z-0">
          {children}
        </div>
        <footer className="mt-8 text-center text-[0.68rem] font-medium tracking-[0.08em] text-stone-400 lg:hidden">
          {APP_VERSION_LABEL}
        </footer>
      </main>
    </div>
  );
}
