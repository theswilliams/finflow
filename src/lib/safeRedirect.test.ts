import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeRedirect";

const ORIGIN = "https://finflow.example.com";

describe("safeNextPath", () => {
  it("keeps normal same-site paths and query strings", () => {
    expect(safeNextPath("/budgets", ORIGIN)).toBe("/budgets");
    expect(safeNextPath("/transactions?month=2026-08", ORIGIN)).toBe("/transactions?month=2026-08");
  });

  it("falls back when missing, empty or the bare root", () => {
    expect(safeNextPath(null, ORIGIN)).toBe("/dashboard");
    expect(safeNextPath("", ORIGIN)).toBe("/dashboard");
    expect(safeNextPath("/", ORIGIN)).toBe("/dashboard");
  });

  it.each([
    "@evil.com",
    ".evil.com",
    "evil.com/path",
    "https://evil.com",
    "http://evil.com/x",
    "//evil.com",
    "//evil.com/path",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "data:text/html,hi",
    "/ok\r\nSet-Cookie: a=b",
    "/path\twith-tab",
  ])("rejects the redirect target %j", (bad) => {
    expect(safeNextPath(bad, ORIGIN)).toBe("/dashboard");
  });

  it("supports a custom fallback and rejects very long values", () => {
    expect(safeNextPath("@evil.com", ORIGIN, "/login")).toBe("/login");
    expect(safeNextPath("/" + "a".repeat(600), ORIGIN)).toBe("/dashboard");
  });

  it("never yields a URL on another origin, for any of the attack strings", () => {
    for (const bad of ["@evil.com", ".evil.com", "//evil.com", "/\\evil.com", "https://evil.com"]) {
      const target = new URL(safeNextPath(bad, ORIGIN), ORIGIN);
      expect(target.origin).toBe(ORIGIN);
    }
  });
});
