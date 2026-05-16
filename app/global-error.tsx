"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ArahDana global error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main className="grid min-h-screen place-items-center px-4 py-10">
          <section className="w-full max-w-xl rounded-[1.6rem] border border-rose-100 bg-rose-50 p-6 text-rose-950 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">ArahDana</p>
            <h1 className="mt-2 text-2xl font-semibold">Aplikasi perlu dimuat ulang</h1>
            <p className="mt-3 text-sm leading-6">
              Terjadi kesalahan tidak terduga di shell aplikasi. Data portofolio tidak dihapus oleh pesan ini.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
            >
              Coba lagi
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
