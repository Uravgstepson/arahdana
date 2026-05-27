import Link from "next/link";
import type { ReactNode } from "react";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 text-stone-950 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        Kembali ke ArahDana
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        Ketentuan
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Gunakan ArahDana sebagai ruang bantu, bukan pengganti keputusanmu.
      </h1>

      <div className="mt-8 grid gap-4">
        <TrustSection title="Penggunaan aplikasi">
          <p>
            ArahDana dibuat untuk membantu mencatat portofolio, memantau kondisi,
            dan merapikan proses review investasi.
          </p>
        </TrustSection>
        <TrustSection title="Tanggung jawab pengguna">
          <p>
            Kamu bertanggung jawab atas data yang dimasukkan dan keputusan yang
            diambil. Pastikan data penting dicek ulang sebelum digunakan.
          </p>
        </TrustSection>
        <TrustSection title="Tidak ada nasihat finansial">
          <p>
            ArahDana tidak memberikan nasihat finansial, hukum, pajak, atau
            rekomendasi personal. Untuk keputusan besar, pertimbangkan berbicara
            dengan profesional yang berizin.
          </p>
        </TrustSection>
        <TrustSection title="Ketersediaan layanan">
          <p>
            Selama private beta, fitur bisa berubah, diperbaiki, atau sementara
            tidak tersedia. Kami berusaha menjaga aplikasi tetap aman dan jelas.
          </p>
        </TrustSection>
        <TrustSection title="Akun dan data">
          <p>
            Kamu dapat menghapus data akun dari Settings. Setelah penghapusan,
            data yang sudah dihapus tidak dapat dipulihkan dari ArahDana.
          </p>
        </TrustSection>
      </div>

      <nav className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-emerald-700">
        <Link href="/disclaimer">Disclaimer</Link>
        <Link href="/privacy">Privasi</Link>
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
