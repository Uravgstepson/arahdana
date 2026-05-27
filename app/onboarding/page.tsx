import Link from "next/link";

const sections = [
  {
    title: "Apa yang ArahDana lakukan",
    body: "ArahDana membantu mencatat portofolio, memantau harga publik, mengimpor CSV, dan membuat analisis deterministik berdasarkan data harga historis, tren, volatilitas, drawdown, horizon waktu, modal, dan toleransi risiko.",
  },
  {
    title: "Apa yang tidak dilakukan",
    body: "ArahDana bukan penasihat keuangan, tidak menjamin return, tidak membaca rekening bank secara langsung, tidak meminta OTP atau password broker, dan tidak menggantikan riset pribadi.",
  },
  {
    title: "Menggunakan portofolio",
    body: "Masuk ke Portofolio, tambah holding manual atau impor CSV, isi harga beli, unit, harga kini, dan ticker jika tersedia. Tombol perbarui harga memakai data pasar publik jika ticker didukung.",
  },
  {
    title: "Menggunakan analyzer",
    body: "Masuk ke Analisis, pilih instrumen, isi ticker, modal, toleransi risiko 5 sampai 30, dan horizon waktu. Kamu bisa memakai data pasar publik, harga manual, atau data contoh untuk memahami mekanismenya.",
  },
  {
    title: "Membaca BUY, WAIT, AVOID",
    body: "BUY berarti sinyal relatif mendukung sesuai parameter kamu. WAIT berarti kondisinya belum cukup menarik atau risikonya perlu dipantau. AVOID berarti risiko, tren, atau drawdown terlalu buruk untuk parameter saat ini. Semua sinyal wajib diverifikasi ulang.",
  },
  {
    title: "Disclaimer beta",
    body: "Ini beta software. Analisis bisa salah, data pasar bisa terlambat atau gagal, dan model aturan bisa tidak cocok untuk situasi kamu. Selalu verifikasi sebelum berinvestasi.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="premium-gradient-surface overflow-hidden rounded-[1.8rem] p-6 text-white">
        <p className="text-sm font-medium text-white/62">ArahDana v1.1</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Mulai dengan batasan yang jelas</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          ArahDana dibuat sebagai alat bantu pencatatan dan analisis awal. Gunakan untuk membuat keputusan lebih terstruktur, bukan untuk menyerahkan keputusan investasi.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/porto/add" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-stone-950">
            Buka portofolio
          </Link>
          <Link href="/analysis/new" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Coba analyzer
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-950">{section.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{section.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
