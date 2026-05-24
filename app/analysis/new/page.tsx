import { AnalyzerForm } from "@/components/AnalyzerForm";
import { FocusedFlowShell } from "@/components/FocusedFlow";

export default function NewAnalysisPage() {
  return (
    <FocusedFlowShell
      eyebrow="Analysis Setup"
      title="Buat analisis baru"
      description="Pilih DCA planner untuk rencana setoran berkala, atau analisis data pasar terbaru untuk membaca ticker sebelum membuat keputusan."
      backHref="/dashboard"
    >
      <AnalyzerForm />
    </FocusedFlowShell>
  );
}
