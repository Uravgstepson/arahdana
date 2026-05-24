import type {
  AnalysisInput,
  AnalysisResult,
  PricePoint,
  SavedAnalysisResult,
} from "@/lib/types/investment";

export const ANALYSIS_RESULT_STORAGE_KEY = "arahdana.analysisResultPayloads";

export type AnalysisResultPayload = {
  id: string;
  input: AnalysisInput;
  result: AnalysisResult;
  prices: PricePoint[];
  dataSourceLabel: string;
  isMockData: boolean;
  savedSummary: SavedAnalysisResult;
};
