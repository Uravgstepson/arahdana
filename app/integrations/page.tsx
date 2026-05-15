import { ApiTestPanel } from "@/components/ApiTestPanel";
import { IntegrationCard } from "@/components/IntegrationCard";
import { IntegrationsCsvImport } from "@/components/IntegrationsCsvImport";

export default function IntegrationsPage() {
  const cards = [
    {
      title: "Data pasar dari Google Finance",
      status: "Data publik",
      description:
        "Route uji untuk ticker saham Indonesia seperti BBCA:IDX, BBRI:IDX, TLKM:IDX, ASII:IDX, dan benchmark IHSG ^JKSE melalui /api/market (source=auto). Metadata dicoba dari Google Finance, dan data chart akan fallback ke Yahoo jika diperlukan.",
    },
    {
      title: "Data kurs Bank Indonesia",
      status: "Data publik",
      description:
        "Route /api/macro/bi-rate memanggil webservice kurs Bank Indonesia getSubKursLokal3 dan menormalkan XML menjadi JSON untuk konteks makro.",
    },
    {
      title: "Impor Bibit dan tabungan semi-otomatis",
      status: "CSV browser-only",
      description:
        "CSV holdings dibaca di browser, dipratinjau, divalidasi, lalu disimpan ke Supabase saat login atau localStorage saat belum login.",
    },
    {
      title: "Login langsung bank/e-wallet/Bibit",
      status: "Nonaktif di V1",
      description:
        "Sinkronisasi berbasis kredensial tetap nonaktif. ArahDana tidak akan meminta password bank, OTP, kredensial e-wallet, kredensial Bibit, atau kredensial broker privat.",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-950">
        <h2 className="text-lg font-semibold">Peringatan keamanan</h2>
        <p className="mt-2">
          Integrasi bank/e-wallet nyata nonaktif di V1. Integrasi akun Bibit
          langsung juga nonaktif di V1. Gunakan impor tempel/CSV semi-otomatis
          agar data portofolio dan tabungan bisa ditinjau sebelum disimpan.
        </p>
      </section>
      <IntegrationsCsvImport />
      <ApiTestPanel />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <IntegrationCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
