import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const features = [
  {
    title: "Porto",
    text: "Pantau nilai, alokasi, performa, dan health score portofolio.",
  },
  {
    title: "Analisis",
    text: "Baca sinyal rule-based dari data harga, tren, risiko, dan entry zone.",
  },
  {
    title: "Goals",
    text: "Rancang DCA untuk tujuan finansial dengan proyeksi yang realistis.",
  },
  {
    title: "Alerts",
    text: "Buat sinyal harga, risiko, konsentrasi, volatilitas, dan verdict.",
  },
  {
    title: "Journal",
    text: "Siapkan ruang refleksi keputusan agar review investasi lebih sadar.",
  },
  {
    title: "Reports",
    text: "Generate laporan mingguan, bulanan, dan kuartalan tanpa API AI berbayar.",
  },
];

export default function LandingPage() {
  return (
    <main className="public-art-background text-stone-950">
      <section className="relative isolate min-h-[92svh] overflow-hidden bg-stone-950/78 text-white">
        <Image
          src="/icons/Logo_full_brand-removebg-preview.png"
          alt=""
          width={900}
          height={900}
          priority
          className="absolute right-[-9rem] top-12 h-[34rem] w-[34rem] max-w-none object-contain opacity-[0.16] sm:right-[-5rem] sm:h-[42rem] sm:w-[42rem]"
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(12,10,9,0),rgba(238,245,242,0.9))]" />
        <div className="relative mx-auto flex min-h-[92svh] max-w-6xl flex-col px-5 pb-24 pt-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3" aria-label="ArahDana">
              <BrandMark variant="icon" tone="light" className="h-11 w-11" />
              <span className="text-lg font-semibold tracking-tight">ArahDana</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="#fitur"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 sm:inline-flex"
              >
                Lihat fitur
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950 shadow-sm"
              >
                Masuk
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 items-center py-16">
            <div className="max-w-3xl">
              <p className="w-fit rounded-full bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 ring-1 ring-emerald-300/20">
                Beta private untuk investor Indonesia
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-7xl">
                ArahDana
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                Capsule dashboard untuk tracking portofolio, analisis risiko, goals DCA, alerts, dan laporan review. Dibuat agar keputusan investasi terasa lebih rapi, bukan lebih impulsif.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/beta"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-emerald-400 px-5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-emerald-300"
                >
                  Mulai sekarang
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/12 hover:bg-white/15"
                >
                  Masuk
                </Link>
                <Link
                  href="#fitur"
                  className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-white/15 px-5 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Lihat fitur
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat label="Data aman" value="Akun + perangkat" />
            <HeroStat label="Analyzer" value="Rule-based" />
            <HeroStat label="Reports" value="Weekly to quarterly" />
          </div>
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Decision support
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            Untuk investor yang ingin lebih tenang saat mengevaluasi portofolio.
          </h2>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Cocok untuk pengguna yang mulai membangun portofolio, melakukan DCA, mencatat target, dan ingin review berkala tanpa bahasa spekulatif.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[1.35rem] border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[1.6rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Capsule identity
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Semua sinyal dalam satu ruang yang rapi.
            </h2>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Portfolio tracker, analyzer, goals, pantauan, dan reports dibuat sebagai satu alur: input data, pahami risiko, lalu review secara berkala.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-stone-950 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-200">
              Safety
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Bukan nasihat keuangan.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/68">
              ArahDana adalah alat pendukung keputusan. Hasil analisis, alerts, dan reports tidak menjamin keuntungan dan tidak menggantikan riset pribadi atau konsultasi profesional.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/68">
              Data pribadi tidak ditampilkan di landing page. Di browser mobile,
              ArahDana bisa dipasang sebagai PWA dari menu browser.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/beta"
                className="inline-flex rounded-[1rem] bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950"
              >
                Mulai sekarang
              </Link>
              <Link
                href="/privacy"
                className="inline-flex rounded-[1rem] bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/12"
              >
                Privasi
              </Link>
              <Link
                href="/disclaimer"
                className="inline-flex rounded-[1rem] bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/12"
              >
                Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
