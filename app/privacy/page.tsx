import Link from "next/link";
import type { ReactNode } from "react";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 text-stone-950 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        Kembali ke ArahDana
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Privasi
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Data kamu dipakai untuk menjalankan fitur ArahDana.
      </h1>

      <div className="mt-8 grid gap-4">
        <TrustSection title="Data yang disimpan">
          <p>
            ArahDana menyimpan data yang kamu masukkan, seperti portofolio,
            watchlist, goals, alert, pengaturan, laporan, dan masukan beta.
          </p>
        </TrustSection>
        <TrustSection title="Cara data digunakan">
          <p>
            Data digunakan untuk menghitung ringkasan, menampilkan insight,
            menyimpan preferensi, menjaga sinkronisasi akun, dan memperbaiki
            pengalaman aplikasi.
          </p>
        </TrustSection>
        <TrustSection title="Yang tidak kami lakukan">
          <p>
            ArahDana tidak menjual data portofolio pribadi. Kami juga tidak
            memakai nominal investasi untuk iklan atau pelacakan yang tidak
            diperlukan.
          </p>
        </TrustSection>
        <TrustSection title="Monitoring beta">
          <p>
            Saat private beta, ArahDana dapat mencatat error teknis dan event
            sederhana seperti login atau penggunaan import CSV. Event ini tidak
            berisi nominal, nama holding, ticker, atau catatan pribadi.
          </p>
        </TrustSection>
        <TrustSection title="Hapus data">
          <p>
            Kamu dapat meminta atau menghapus data akun dari Settings. Jika
            butuh bantuan, kirim masukan dari Menu agar kami bisa mengecek
            permintaanmu.
          </p>
        </TrustSection>
      </div>

      <nav className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-emerald-700">
        <Link href="/disclaimer">Disclaimer</Link>
        <Link href="/terms">Ketentuan</Link>
      </nav>
    </main>
  );
}

function TrustSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-7 text-stone-600">{children}</div>
    </section>
  );
}
