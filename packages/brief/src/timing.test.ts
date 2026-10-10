import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.js";
import { googleFontsUrl } from "./fonts.js";
import { countWords, round1, voDurationSec } from "./timing.js";

describe("timing", () => {
  it("counts words", () => {
    expect(countWords("  one  two\nthree ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });

  it("converts words per minute to seconds", () => {
    expect(voDurationSec("a b c d e", { wordsPerMinute: 150 })).toBe(2);
  });

  it("rounds to tenths", () => {
    expect(round1(0.1 + 0.2)).toBe(0.3);
  });
});

describe("contrastRatio", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});

describe("googleFontsUrl", () => {
  it("loads each family once with its weights", () => {
    expect(googleFontsUrl(["Inter", "Bebas Neue", "Inter"])).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Bebas+Neue:wght@400&display=block",
    );
  });
});
