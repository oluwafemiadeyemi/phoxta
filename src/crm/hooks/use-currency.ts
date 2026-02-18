import { useOne } from "@refinedev/core";
import { useCallback, useMemo } from "react";
import type { CompanySettings } from "@crm/types";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY";

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string }> = {
  GBP: { symbol: "£", locale: "en-GB" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
  JPY: { symbol: "¥", locale: "ja-JP" },
  AUD: { symbol: "A$", locale: "en-AU" },
  CAD: { symbol: "C$", locale: "en-CA" },
  CHF: { symbol: "CHF", locale: "de-CH" },
  CNY: { symbol: "¥", locale: "zh-CN" },
};

/**
 * Hook that reads the company currency setting and provides formatting helpers.
 * Default: GBP (£).
 */
export function useCurrency() {
  const { result } = useOne<CompanySettings>({
    resource: "companySettings",
    id: "00000000-0000-0000-0000-000000000001",
  });

  const currencyCode: CurrencyCode = (result?.currency as CurrencyCode) || "GBP";
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.GBP;

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: currencyCode,
      }),
    [currencyCode, config.locale],
  );

  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [currencyCode, config.locale],
  );

  /** Format a number as currency, e.g. £1,234.56 */
  const format = useCallback(
    (value: number) => formatter.format(value),
    [formatter],
  );

  /** Format a number in compact notation, e.g. £1.2M */
  const formatCompact = useCallback(
    (value: number) => compactFormatter.format(value),
    [compactFormatter],
  );

  return {
    currencyCode,
    symbol: config.symbol,
    locale: config.locale,
    format,
    formatCompact,
  };
}
