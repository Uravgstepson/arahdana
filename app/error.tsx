"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/AppState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ArahDana route error]", error);
  }, [error]);

  return (
    <ErrorState
      title="Halaman gagal dimuat"
      message="Ada bagian aplikasi yang tidak berhasil dirender. Data lokal tetap aman; coba muat ulang bagian ini."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-800"
        >
          Coba lagi
        </button>
      }
    />
  );
}
