import Link from "next/link";
import { AboutArahDana } from "@/components/AboutArahDana";
import {
  APP_NAME,
  APP_RELEASE_TAG,
  APP_SHORT_DESCRIPTION,
} from "@/lib/appMeta";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 text-stone-950 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        Kembali ke ArahDana
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        About
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {APP_NAME}
      </h1>
      <p className="mt-4 text-base leading-7 text-stone-600">
        {APP_SHORT_DESCRIPTION}
      </p>

      <div className="mt-8">
        <AboutArahDana />
      </div>

      <section className="mt-5 rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Native + market foundation</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          Build ini berjalan di track {APP_RELEASE_TAG}. Fokusnya native shell,
          data market yang diproxy lewat backend, dan pengalaman fintech yang
          tetap tenang.
        </p>
      </section>
    </main>
  );
}
