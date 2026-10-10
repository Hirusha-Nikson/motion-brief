import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.js";
import { googleFontsUrl } from "./fonts.js";
import { countWords, formatTimestamp, sceneTimeline, voDurationSec } from "./timing.js";

describe("timing", () => {
  it("counts words", () => {
    expect(countWords("  one  two\nthree ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });

  it("converts words per minute to seconds", () => {
    expect(voDurationSec("a b c d e", { wordsPerMinute: 150 })).toBe(2);
  });

  it("builds a timeline without float drift", () => {
    const t = sceneTimeline([
      { id: "a", durationSec: 0.1 },
      { id: "b", durationSec: 0.2 },
      { id: "c", durationSec: 3.5 },
    ]);
    expect(t).toEqual([
      { id: "a", start: 0, end: 0.1 },
      { id: "b", start: 0.1, end: 0.3 },
      { id: "c", start: 0.3, end: 3.8 },
    ]);
  });

  it("formats timestamps", () => {
    expect(formatTimestamp(0)).toBe("0:00.0");
    expect(formatTimestamp(75.25)).toBe("1:15.3");
    expect(formatTimestamp(9.96)).toBe("0:10.0");
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
