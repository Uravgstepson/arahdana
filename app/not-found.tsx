import Link from "next/link";

export default function NotFound() {
  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-6 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">404</p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">Halaman tidak ditemukan</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Link ini tidak tersedia di ArahDana beta. Kembali ke Home untuk melanjutkan.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
      >
        Kembali ke Home
      </Link>
    </section>
  );
}
