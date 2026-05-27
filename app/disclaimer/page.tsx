import Link from "next/link";
import type { ReactNode } from "react";

export default function DisclaimerPage() {
  return (
    <TrustPageShell
      eyebrow="Disclaimer"
      title="ArahDana membantu kamu melihat data, bukan memberi nasihat finansial."
    >
      <TrustSection title="Peran ArahDana">
        <p>
          ArahDana adalah alat pencatat portofolio dan pendukung keputusan. Kami
          membantu menata data, melihat risiko, dan membuat catatan agar proses
          investasi lebih rapi.
        </p>
      </TrustSection>
      <TrustSection title="Bukan rekomendasi investasi">
        <p>
          Informasi, skor, alert, dan analisis di ArahDana bukan ajakan membeli,
          menjual, atau menahan instrumen investasi apa pun.
        </p>
      </TrustSection>
      <TrustSection title="Keputusan tetap milik pengguna">
        <p>
          Setiap keputusan investasi tetap menjadi tanggung jawab pengguna.
          Pertimbangkan tujuan, profil risiko, dan kondisi pribadi sebelum
          mengambil keputusan.
        </p>
      </TrustSection>
      <TrustSection title="Data bisa tidak sempurna">
        <p>
          Harga pasar, hasil impor, dan perhitungan dapat terlambat atau tidak
          lengkap. Gunakan ArahDana sebagai alat bantu, lalu cek sumber resmi
          sebelum mengambil keputusan penting.
        </p>
      </TrustSection>
    </TrustPageShell>
  );
}

function TrustPageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 text-stone-950 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        Kembali ke ArahDana
      </Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <div className="mt-8 grid gap-4">{children}</div>
      <TrustLinks />
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

function TrustLinks() {
  return (
    <nav className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-emerald-700">
      <Link href="/privacy">Privasi</Link>
      <Link href="/terms">Ketentuan</Link>
      <Link href="/disclaimer">Disclaimer</Link>
    </nav>
  );
}
