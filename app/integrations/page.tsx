import { ApiTestPanel } from "@/components/ApiTestPanel";
import { IntegrationCard } from "@/components/IntegrationCard";
import { IntegrationsCsvImport } from "@/components/IntegrationsCsvImport";

export default function IntegrationsPage() {
  const cards = [
    {
      title: "Harga pasar",
      status: "Data publik",
      description:
        "Pantau harga saham Indonesia dan benchmark pasar untuk membantu review portofolio.",
    },
    {
      title: "Konteks makro",
      status: "Data publik",
      description:
        "Gunakan data kurs dan konteks pasar sebagai latar saat membaca risiko.",
    },
    {
      title: "Impor Bibit dan tabungan",
      status: "CSV aman",
      description:
        "File dibaca di browser, dipratinjau, lalu baru disimpan setelah kamu setujui.",
    },
    {
      title: "Login langsung bank/e-wallet/Bibit",
      status: "Tidak digunakan",
      description:
        "ArahDana tidak meminta password bank, OTP, kredensial e-wallet, Bibit, atau broker privat.",
    },
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 overflow-x-hidden">
      <section className="w-full max-w-full min-w-0 rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-950">
        <h2 className="text-lg font-semibold">Keamanan data</h2>
        <p className="mt-2 break-words">
          ArahDana tidak meminta kredensial finansial privat. Gunakan CSV untuk
          meninjau data terlebih dahulu sebelum disimpan.
        </p>
      </section>
      <IntegrationsCsvImport />
      <ApiTestPanel />
      <div className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <IntegrationCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
