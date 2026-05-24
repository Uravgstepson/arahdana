export type MarketAssetCategory =
  | "index"
  | "currency"
  | "commodity"
  | "crypto"
  | "bond"
  | "stock"
  | "fund";

export type MarketDirection = "up" | "down" | "flat";

export type MarketAsset = {
  id: string;
  name: string;
  ticker?: string;
  aliases: string[];
  category: MarketAssetCategory;
  categoryLabel: string;
  region: string;
  value: string;
  change: string;
  changePercent: number;
  direction: MarketDirection;
  status: string;
  overview: string;
  insight: string;
  relatedIds: string[];
  trend: number[];
};

export const marketCategoryLabels: Record<MarketAssetCategory, string> = {
  index: "Indeks",
  currency: "Mata Uang",
  commodity: "Komoditas",
  crypto: "Crypto",
  bond: "Obligasi",
  stock: "Saham populer",
  fund: "Dana",
};

export const marketAssets: MarketAsset[] = [
  {
    id: "bbca",
    name: "Bank Central Asia",
    ticker: "BBCA",
    aliases: ["bank bca", "bca", "bbca.jk", "saham bca", "perbankan"],
    category: "stock",
    categoryLabel: "Saham populer",
    region: "Indonesia",
    value: "Rp 9.400",
    change: "+1.8%",
    changePercent: 1.8,
    direction: "up",
    status: "Menguat",
    overview: "Bank besar Indonesia dengan likuiditas tinggi dan minat investor stabil.",
    insight: "Bank Central Asia menunjukkan penguatan mingguan dengan sektor perbankan tetap dominan.",
    relatedIds: ["ihsg", "usd-idr", "bri"],
    trend: [42, 45, 44, 48, 50, 53, 57, 61],
  },
  {
    id: "bri",
    name: "Bank Rakyat Indonesia",
    ticker: "BBRI",
    aliases: ["bank bri", "bbri.jk", "bri", "saham bri"],
    category: "stock",
    categoryLabel: "Saham populer",
    region: "Indonesia",
    value: "Rp 4.720",
    change: "+0.9%",
    changePercent: 0.9,
    direction: "up",
    status: "Stabil",
    overview: "Saham perbankan dengan eksposur kuat ke kredit mikro dan domestik.",
    insight: "BRI bergerak stabil seiring minat pasar pada saham bank besar.",
    relatedIds: ["bbca", "ihsg", "banking-sector"],
    trend: [44, 43, 45, 46, 47, 47, 49, 50],
  },
  {
    id: "ihsg",
    name: "IHSG",
    ticker: "IHSG",
    aliases: ["indeks harga saham gabungan", "jkse", "^jkse", "idx composite", "pasar saham indonesia"],
    category: "index",
    categoryLabel: "Indeks",
    region: "Indonesia",
    value: "6.950",
    change: "-1.2%",
    changePercent: -1.2,
    direction: "down",
    status: "Melemah",
    overview: "Indeks utama pasar saham Indonesia untuk membaca arah pasar domestik.",
    insight: "IHSG melemah 1.2% hari ini, tetapi tekanan masih terlihat terkendali.",
    relatedIds: ["bbca", "bri", "usd-idr"],
    trend: [62, 61, 60, 58, 56, 57, 55, 54],
  },
  {
    id: "sp500",
    name: "S&P 500",
    ticker: "S&P500",
    aliases: ["s&p500", "sp500", "snp 500", "amerika", "us index"],
    category: "index",
    categoryLabel: "Indeks",
    region: "Amerika Serikat",
    value: "5.320",
    change: "+0.4%",
    changePercent: 0.4,
    direction: "up",
    status: "Risk-on",
    overview: "Indeks saham besar Amerika Serikat yang sering memengaruhi sentimen global.",
    insight: "S&P 500 masih positif, memberi nada risk-on moderat untuk pasar global.",
    relatedIds: ["nasdaq", "usd-idr", "gold"],
    trend: [48, 49, 51, 53, 54, 55, 56, 58],
  },
  {
    id: "nasdaq",
    name: "Nasdaq",
    ticker: "NASDAQ",
    aliases: ["nasdaq composite", "nasdaq 100", "qqq", "teknologi amerika", "tech stocks"],
    category: "index",
    categoryLabel: "Indeks",
    region: "Amerika Serikat",
    value: "16.740",
    change: "+0.7%",
    changePercent: 0.7,
    direction: "up",
    status: "Menguat",
    overview: "Indeks yang sensitif terhadap saham teknologi dan pertumbuhan.",
    insight: "Nasdaq menguat ringan karena minat pada saham teknologi masih bertahan.",
    relatedIds: ["sp500", "bitcoin", "usd-idr"],
    trend: [44, 48, 47, 52, 55, 54, 58, 61],
  },
  {
    id: "nikkei",
    name: "Nikkei 225",
    ticker: "NIKKEI",
    aliases: ["nikkei", "jepang", "japan index", "nikkei225"],
    category: "index",
    categoryLabel: "Indeks",
    region: "Jepang",
    value: "38.900",
    change: "-0.3%",
    changePercent: -0.3,
    direction: "down",
    status: "Tenang",
    overview: "Indeks utama Jepang yang sering dipantau untuk sentimen Asia.",
    insight: "Nikkei bergerak tipis, pasar Asia cenderung menunggu katalis baru.",
    relatedIds: ["sp500", "usd-idr", "ihsg"],
    trend: [57, 58, 56, 57, 55, 54, 55, 54],
  },
  {
    id: "usd-idr",
    name: "US Dollar / Rupiah",
    ticker: "USD/IDR",
    aliases: ["dolar", "dollar", "us dollar", "usd", "rupiah", "kurs dolar", "mata uang"],
    category: "currency",
    categoryLabel: "Mata Uang",
    region: "Global",
    value: "Rp 16.120",
    change: "+0.2%",
    changePercent: 0.2,
    direction: "up",
    status: "Menguat",
    overview: "Kurs utama untuk membaca tekanan eksternal terhadap aset Indonesia.",
    insight: "Dolar sedikit menguat, investor perlu memantau dampaknya ke obligasi dan emiten impor.",
    relatedIds: ["gold", "ihsg", "fr-bonds"],
    trend: [52, 52, 53, 54, 54, 55, 55, 56],
  },
  {
    id: "gold",
    name: "Gold",
    ticker: "XAU",
    aliases: ["emas", "gold", "xauusd", "logam mulia", "antam"],
    category: "commodity",
    categoryLabel: "Komoditas",
    region: "Global",
    value: "US$ 2.360",
    change: "+0.8%",
    changePercent: 0.8,
    direction: "up",
    status: "Defensif",
    overview: "Aset lindung nilai yang sering naik saat dolar atau sentimen risiko melemah.",
    insight: "Emas menguat akibat permintaan defensif dan pelemahan selera risiko.",
    relatedIds: ["usd-idr", "bitcoin", "sp500"],
    trend: [45, 46, 48, 49, 51, 52, 54, 57],
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    ticker: "BTC",
    aliases: ["btc", "crypto", "kripto", "bitcoin", "aset digital"],
    category: "crypto",
    categoryLabel: "Crypto",
    region: "Global",
    value: "Rp 1.080.000.000",
    change: "+2.6%",
    changePercent: 2.6,
    direction: "up",
    status: "Volatil",
    overview: "Crypto terbesar dengan volatilitas tinggi dan sensitivitas besar pada likuiditas global.",
    insight: "Bitcoin menguat, tetapi volatilitas tetap tinggi sehingga ukuran posisi perlu dijaga.",
    relatedIds: ["ethereum", "nasdaq", "usd-idr"],
    trend: [41, 39, 45, 50, 48, 56, 60, 66],
  },
  {
    id: "ethereum",
    name: "Ethereum",
    ticker: "ETH",
    aliases: ["eth", "ethereum", "crypto ethereum", "kripto ethereum"],
    category: "crypto",
    categoryLabel: "Crypto",
    region: "Global",
    value: "Rp 52.600.000",
    change: "+1.4%",
    changePercent: 1.4,
    direction: "up",
    status: "Volatil",
    overview: "Crypto besar dengan ekosistem aplikasi terdesentralisasi yang luas.",
    insight: "Ethereum mengikuti penguatan crypto utama, namun risikonya tetap agresif.",
    relatedIds: ["bitcoin", "nasdaq", "gold"],
    trend: [40, 42, 43, 46, 45, 50, 53, 55],
  },
  {
    id: "fr-bonds",
    name: "FR Bonds Indonesia",
    ticker: "FR",
    aliases: ["obligasi indonesia", "surat utang negara", "sun", "fr bonds", "obligasi", "bond indonesia"],
    category: "bond",
    categoryLabel: "Obligasi",
    region: "Indonesia",
    value: "Yield 6.7%",
    change: "-0.1%",
    changePercent: -0.1,
    direction: "flat",
    status: "Stabil",
    overview: "Obligasi pemerintah Indonesia untuk membaca stabilitas yield domestik.",
    insight: "Pasar obligasi relatif stabil dengan pergerakan yield terbatas.",
    relatedIds: ["usd-idr", "ihsg", "money-market"],
    trend: [49, 50, 50, 51, 50, 50, 49, 50],
  },
  {
    id: "money-market",
    name: "Pasar Uang",
    aliases: ["pasar uang", "reksadana pasar uang", "money market", "rdpu", "cash management"],
    category: "fund",
    categoryLabel: "Dana",
    region: "Indonesia",
    value: "Stabil",
    change: "+0.1%",
    changePercent: 0.1,
    direction: "flat",
    status: "Defensif",
    overview: "Instrumen defensif untuk likuiditas, dana darurat, dan parkir dana jangka pendek.",
    insight: "Pasar uang tetap stabil dan cocok sebagai bantalan likuiditas portofolio.",
    relatedIds: ["fr-bonds", "usd-idr", "gold"],
    trend: [50, 50, 50, 51, 51, 51, 52, 52],
  },
  {
    id: "banking-sector",
    name: "Banking Sector",
    aliases: ["sektor perbankan", "banking", "bank indonesia", "saham bank"],
    category: "stock",
    categoryLabel: "Saham populer",
    region: "Indonesia",
    value: "Dominan",
    change: "+1.1%",
    changePercent: 1.1,
    direction: "up",
    status: "Menguat",
    overview: "Tema sektor yang banyak memengaruhi arah IHSG.",
    insight: "Sektor perbankan masih dominan minggu ini.",
    relatedIds: ["bbca", "bri", "ihsg"],
    trend: [46, 47, 48, 50, 51, 52, 54, 56],
  },
];

export const popularMarketAssetIds = [
  "bbca",
  "ihsg",
  "usd-idr",
  "gold",
  "bitcoin",
  "fr-bonds",
];

export function getMarketAssetById(id: string) {
  return marketAssets.find((asset) => asset.id === id) ?? null;
}

export function searchMarketAssets(query: string, limit = 6) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return popularMarketAssetIds
      .map((id) => getMarketAssetById(id))
      .filter((asset): asset is MarketAsset => Boolean(asset))
      .slice(0, limit);
  }

  return marketAssets
    .map((asset) => ({ asset, score: scoreAsset(asset, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.asset.name.localeCompare(b.asset.name))
    .map((entry) => entry.asset)
    .slice(0, limit);
}

function scoreAsset(asset: MarketAsset, query: string) {
  const candidates = [
    asset.name,
    asset.ticker ?? "",
    asset.categoryLabel,
    asset.region,
    ...asset.aliases,
  ].map(normalizeSearchText);
  const words = query.split(" ").filter(Boolean);

  let score = 0;
  candidates.forEach((candidate) => {
    if (!candidate) return;
    if (candidate === query) score = Math.max(score, 100);
    if (candidate.startsWith(query)) score = Math.max(score, 78);
    if (candidate.includes(query)) score = Math.max(score, 58);
    const wordScore = words.filter((word) => candidate.includes(word)).length;
    if (wordScore > 0) score = Math.max(score, 20 + wordScore * 12);
  });

  return score;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/&.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
