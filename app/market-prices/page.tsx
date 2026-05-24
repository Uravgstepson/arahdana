import { MarketPricesList } from "@/components/MarketPricesList";
import { marketCategories, type MarketCategory } from "@/lib/market/tickerUniverse";

export const dynamic = "force-dynamic";

type MarketPricesPageProps = {
  searchParams?: Promise<{ category?: string | string[] }>;
};

export default async function MarketPricesPage({
  searchParams,
}: MarketPricesPageProps) {
  const params = await searchParams;
  const initialCategory = normalizeCategory(params?.category);

  return <MarketPricesList initialCategory={initialCategory} />;
}

function normalizeCategory(value: string | string[] | undefined): MarketCategory {
  const category = Array.isArray(value) ? value[0] : value;
  return marketCategories.some((item) => item.key === category)
    ? (category as MarketCategory)
    : "idx_stock";
}
