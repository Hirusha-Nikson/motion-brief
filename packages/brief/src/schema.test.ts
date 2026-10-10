import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color.js";
import { PLATFORM_PRESETS, type PresetPlatform } from "./presets.js";
import { briefInvariantIssues, DEFAULT_PALETTE, type Platform } from "./schema.js";

const scene = (id: string, text = "Hi", maxChars = 48) => ({
  id,
  onScreenText: [{ text, maxChars }],
});

const base = {
  platform: "reels" as Platform,
  canvas: { width: 1080, height: 1920, fps: 30 },
  safeZone: { top: 220, right: 140, bottom: 420, left: 60 },
  scenes: [scene("s1")],
};

describe("briefInvariantIssues", () => {
  it("accepts a sane brief", () => {
    expect(briefInvariantIssues(base)).toEqual([]);
  });

  it("rejects a canvas that doesn't match the platform", () => {
    const issues = briefInvariantIssues({
      ...base,
      canvas: { width: 1920, height: 1080, fps: 30 },
    });
    expect(issues[0]?.path).toEqual(["canvas"]);
    expect(issues[0]?.message).toMatch(/use platform "custom"/i);
  });

  it("allows any canvas for custom", () => {
    expect(
      briefInvariantIssues({
        ...base,
        platform: "custom",
        canvas: { width: 800, height: 800, fps: 24 },
        safeZone: { top: 40, right: 40, bottom: 40, left: 40 },
      }),
    ).toEqual([]);
  });

  it("rejects a safe zone that leaves almost no room", () => {
    const issues = briefInvariantIssues({
      ...base,
      safeZone: { top: 900, right: 60, bottom: 900, left: 60 },
    });
    expect(issues.map((i) => i.path)).toEqual([["safeZone"]]);
  });

  it("rejects duplicate scene ids and text over maxChars", () => {
    const issues = briefInvariantIssues({
      ...base,
      scenes: [scene("s1"), scene("s1", "Too long", 3)],
    });
    expect(issues.map((i) => i.path)).toEqual([
      ["scenes", 1, "id"],
      ["scenes", 1, "onScreenText", 0, "text"],
    ]);
  });

  it.each(Object.keys(PLATFORM_PRESETS) as PresetPlatform[])(
    "accepts the %s preset",
    (platform) => {
      const p = PLATFORM_PRESETS[platform];
      expect(briefInvariantIssues({ ...base, platform, ...p })).toEqual([]);
    },
  );
});

describe("DEFAULT_PALETTE", () => {
  it.each(["text", "mutedText", "primary", "accent"] as const)(
    "%s passes 4.5:1 on background and surface",
    (role) => {
      expect(
        contrastRatio(DEFAULT_PALETTE[role], DEFAULT_PALETTE.background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(DEFAULT_PALETTE[role], DEFAULT_PALETTE.surface)).toBeGreaterThanOrEqual(
        4.5,
      );
    },
  );
});
