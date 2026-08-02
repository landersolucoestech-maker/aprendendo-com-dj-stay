import { describe, expect, it } from "vitest";

import {
  getSafeInternalPath,
  getSafeReturnPath,
  toSafeReturnLocation,
} from "@/routing/route-state";

describe("safe return paths", () => {
  it("preserves an internal course path with query string", () => {
    expect(
      getSafeReturnPath({
        from: {
          pathname: "/cursos",
          search: "?curso=producao-musical",
          hash: "",
        },
      }),
    ).toBe("/cursos?curso=producao-musical");
  });

  it("rejects protocol-relative and backslash redirects", () => {
    expect(getSafeInternalPath("//malicious.example")).toBe("/portal");
    expect(getSafeInternalPath("/\\malicious.example")).toBe("/portal");
  });

  it("converts a safe path into router location state", () => {
    expect(toSafeReturnLocation("/cursos?curso=producao-musical#comprar")).toEqual({
      pathname: "/cursos",
      search: "?curso=producao-musical",
      hash: "#comprar",
    });
  });

  it("falls back for external URLs", () => {
    expect(toSafeReturnLocation("https://malicious.example")).toEqual({
      pathname: "/portal",
      search: "",
      hash: "",
    });
  });
});
