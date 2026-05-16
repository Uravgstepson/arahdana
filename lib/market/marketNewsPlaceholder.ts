export type MarketNewsPlaceholder = {
  enabled: false;
  source: "disabled";
  note: string;
};

export function getDisabledMarketNewsProvider(): MarketNewsPlaceholder {
  return {
    enabled: false,
    source: "disabled",
    note: "Future RSS/news provider placeholder. ArahDana currently shows internal Market Insight only.",
  };
}
