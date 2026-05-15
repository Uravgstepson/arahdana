export function toGoogleFinanceSymbol(input: string) {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return raw;
  if (raw.endsWith(".JK")) return `${raw.slice(0, -3)}:IDX`;
  return raw;
}

/**
 * Yahoo chart endpoint uses `.JK` for IDX equities.
 * We keep UI ticker format as Google Finance (`BBCA:IDX`), then convert here when we hit Yahoo.
 */
export function toYahooFinanceSymbol(input: string) {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return raw;
  if (raw.endsWith(":IDX")) return `${raw.slice(0, -4)}.JK`;
  // Common Google Finance exchange suffixes (US equities). Yahoo usually expects the bare symbol.
  const m = raw.match(/^([A-Z0-9.-]{1,24}):(NASDAQ|NYSE|AMEX|NYSEARCA|OTCMKTS|BATS)$/);
  if (m) {
    const base = m[1];
    // Yahoo uses dash for some dot-class shares (e.g. BRK.B -> BRK-B).
    if (base.includes(".") && /^[A-Z]{1,5}\.[A-Z]{1,2}$/.test(base)) {
      return base.replace(".", "-");
    }
    return base;
  }
  return raw;
}

export function isProbablyGoogleFinanceSymbol(input: string) {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9.-]{1,24}:[A-Z0-9.-]{1,24}$/.test(raw);
}
