import Image from "next/image";
import type { StaticImageData } from "next/image";
import adaroLogo from "@/assets/brand/Adaro.png";
import alphabetLogo from "@/assets/brand/Alphabet.png";
import amazonLogo from "@/assets/brand/Amazon.png";
import antamLogo from "@/assets/brand/Antam.png";
import astraLogo from "@/assets/brand/Astra.webp";
import bcaLogo from "@/assets/brand/BCA.png";
import bniLogo from "@/assets/brand/BNI.png";
import briLogo from "@/assets/brand/BRI.png";
import btcLogo from "@/assets/brand/BTC.png";
import gotoLogo from "@/assets/brand/Goto.png";
import ihsgLogo from "@/assets/brand/IHSG.jpg";
import indofoodLogo from "@/assets/brand/Indofood.jpg";
import invescoLogo from "@/assets/brand/Invesco.png";
import mandiriLogo from "@/assets/brand/Mandiri.png";
import metaLogo from "@/assets/brand/Meta.png";
import microsoftLogo from "@/assets/brand/Microsoft.png";
import nasdaqLogo from "@/assets/brand/nasdaq.jpg";
import nvidiaLogo from "@/assets/brand/Nvidia.png";
import snpLogo from "@/assets/brand/SNP.png";
import spdrLogo from "@/assets/brand/SPDR.png";
import telkomLogo from "@/assets/brand/Telkom.jpg";
import teslaLogo from "@/assets/brand/Tesla.png";
import tsmcLogo from "@/assets/brand/tsmc.png";
import unileverLogo from "@/assets/brand/Unilever.jpg";
import { cn } from "@/lib/utils/format";

const logoMap: Record<string, StaticImageData> = {
  // Indonesian stocks
  BBCA: bcaLogo,
  BCA: bcaLogo,
  BBRI: briLogo,
  BRI: briLogo,
  BBNI: bniLogo,
  BNI: bniLogo,
  BMRI: mandiriLogo,
  MANDIRI: mandiriLogo,
  ADRO: adaroLogo,
  ANTM: antamLogo,
  ASTRA: astraLogo,
  ASII: astraLogo,
  TELK: telkomLogo,
  TLKM: telkomLogo,
  UNVR: unileverLogo,
  INDF: indofoodLogo,
  GOTO: gotoLogo,
  IHSG: ihsgLogo,

  // Fund companies
  INVESCO: invescoLogo,

  // International
  BTC: btcLogo,
  TSLA: teslaLogo,
  GOOGL: alphabetLogo,
  GOOG: alphabetLogo,
  MSFT: microsoftLogo,
  NVDA: nvidiaLogo,
  AMZN: amazonLogo,
  META: metaLogo,
  TSMC: tsmcLogo,

  // Exchange
  SPY: spdrLogo,
  QQQ: nasdaqLogo,
  IVV: snpLogo,
  SNP: snpLogo,
};

const nameLogoHints: Array<[string, StaticImageData]> = [
  ["BCA", bcaLogo],
  ["BANK CENTRAL ASIA", bcaLogo],
  ["BRI", briLogo],
  ["BANK RAKYAT", briLogo],
  ["BNI", bniLogo],
  ["MANDIRI", mandiriLogo],
  ["ADARO", adaroLogo],
  ["ANTAM", antamLogo],
  ["ANEKA TAMBANG", antamLogo],
  ["ASTRA", astraLogo],
  ["TELKOM", telkomLogo],
  ["UNILEVER", unileverLogo],
  ["INDOFOOD", indofoodLogo],
  ["GOTO", gotoLogo],
  ["INVESCO", invescoLogo],
  ["NASDAQ", nasdaqLogo],
  ["S&P", snpLogo],
  ["SPDR", spdrLogo],
  ["BITCOIN", btcLogo],
  ["TESLA", teslaLogo],
  ["ALPHABET", alphabetLogo],
  ["GOOGLE", alphabetLogo],
  ["MICROSOFT", microsoftLogo],
  ["NVIDIA", nvidiaLogo],
  ["AMAZON", amazonLogo],
  ["META", metaLogo],
  ["TSMC", tsmcLogo],
];

export function InvestmentLogo({
  name,
  ticker,
  className = "h-8 w-8",
  fallbackInitials,
}: {
  name: string;
  ticker?: string;
  className?: string;
  fallbackInitials?: string;
}) {
  const logoPath = resolveLogo(name, ticker);

  if (!logoPath) {
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-200",
          className,
        )}
        style={{
          fontSize: `clamp(0.5rem, 30%, 0.875rem)`,
        }}
      >
        {fallbackInitials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-white/86 p-1.5 ring-1 ring-stone-200/80",
        className,
      )}
    >
      <Image
        src={logoPath}
        alt={name}
        fill
        className="object-contain p-1.5"
        sizes="48px"
      />
    </div>
  );
}

function resolveLogo(name: string, ticker?: string) {
  const tickerKey = normalizeLogoKey(ticker);
  const nameKey = normalizeLogoKey(name);
  const direct = logoMap[tickerKey] ?? logoMap[nameKey];
  if (direct) return direct;

  return nameLogoHints.find(([hint]) => nameKey.includes(hint))?.[1] ?? null;
}

function normalizeLogoKey(value?: string) {
  return (value ?? "")
    .toUpperCase()
    .replace(/\.JK$/u, "")
    .replace(/[^A-Z0-9.&]/gu, "")
    .trim();
}
