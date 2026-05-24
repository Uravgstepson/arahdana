import type { RiskCategory } from "@/lib/types/investment";
import { Badge } from "@/components/ui";

const labels: Record<RiskCategory, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

const tones: Record<RiskCategory, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export function RiskBadge({ risk }: { risk: RiskCategory }) {
  return <Badge tone={tones[risk]}>{labels[risk]}</Badge>;
}
