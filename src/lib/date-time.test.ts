import { describe, expect, it } from "vitest";

import {
  APP_LOCALE,
  APP_TIME_ZONE,
  formatAppDate,
  formatAppDateTime,
  formatAppRelativeTime,
  formatAppTime,
  toUtcIsoString,
} from "./date-time";

const REFERENCE_INSTANT = "2026-08-02T03:00:00.000Z";
const relativeFormatter = new Intl.RelativeTimeFormat(APP_LOCALE, {
  numeric: "auto",
});

describe("date-time", () => {
  it("preserva o locale e o timezone oficiais da aplicação", () => {
    expect(APP_LOCALE).toBe("pt-BR");
    expect(APP_TIME_ZONE).toBe("America/Sao_Paulo");
  });

  it("aplica fallbacks para entradas ausentes ou inválidas", () => {
    expect(formatAppDate(null)).toBe("—");
    expect(formatAppTime("data-invalida")).toBe("—");
    expect(formatAppDateTime("", { fallback: "N/D" })).toBe("N/D");
    expect(
      formatAppRelativeTime(
        "data-invalida",
        REFERENCE_INSTANT,
        "indisponível",
      ),
    ).toBe("indisponível");
    expect(toUtcIsoString(undefined)).toBeNull();
  });

  it("formata data e hora no timezone America/Sao_Paulo", () => {
    expect(
      formatAppDate(REFERENCE_INSTANT, { dateStyle: "short" }),
    ).toBe("02/08/2026");
    expect(
      formatAppTime(REFERENCE_INSTANT, { timeStyle: "short" }),
    ).toBe("00:00");
  });

  it("normaliza instantes válidos para ISO UTC", () => {
    expect(toUtcIsoString("2026-08-02T00:00:00-03:00")).toBe(
      REFERENCE_INSTANT,
    );
    expect(toUtcIsoString(new Date(REFERENCE_INSTANT))).toBe(
      REFERENCE_INSTANT,
    );
  });

  it.each([
    [30, 0, "second"],
    [59, 0, "second"],
    [60, 1, "minute"],
    [-60, -1, "minute"],
    [3_600, 1, "hour"],
    [-86_400, -1, "day"],
    [29 * 86_400, 29, "day"],
    [30 * 86_400, 1, "month"],
    [365 * 86_400, 1, "year"],
  ] as const)(
    "seleciona a unidade relativa correta para deslocamento de %s segundos",
    (offsetSeconds, expectedValue, unit) => {
      const target = Date.parse(REFERENCE_INSTANT) + offsetSeconds * 1_000;

      expect(formatAppRelativeTime(target, REFERENCE_INSTANT)).toBe(
        relativeFormatter.format(expectedValue, unit),
      );
    },
  );
});
