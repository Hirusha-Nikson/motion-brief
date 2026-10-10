import { describe, expect, it } from "vitest";
import {
  PLATFORM_PRESETS,
  aspectRatio,
  contentBox,
  describeSafeZone,
  renderPlatformsMarkdown,
} from "./presets.js";

describe("PLATFORM_PRESETS", () => {
  it("uses the agreed starting values", () => {
    const vertical = { top: 220, right: 140, bottom: 420, left: 60 };
    for (const id of ["reels", "tiktok", "shorts"] as const) {
      expect(PLATFORM_PRESETS[id].canvas).toEqual({ width: 1080, height: 1920, fps: 30 });
      expect(PLATFORM_PRESETS[id].safeZone).toEqual(vertical);
    }
    for (const id of ["youtube", "presentation-16x9"] as const) {
      expect(PLATFORM_PRESETS[id].canvas).toEqual({ width: 1920, height: 1080, fps: 30 });
      expect(PLATFORM_PRESETS[id].safeZone).toEqual({
        top: 108,
        right: 192,
        bottom: 108,
        left: 192,
      });
      expect(PLATFORM_PRESETS[id].actionSafe).toEqual({ top: 54, right: 96, bottom: 54, left: 96 });
    }
    expect(PLATFORM_PRESETS.square.safeZone).toEqual({ top: 65, right: 65, bottom: 65, left: 65 });
    expect(PLATFORM_PRESETS["linkedin-16x9"].safeZone).toEqual({
      top: 54,
      right: 96,
      bottom: 54,
      left: 96,
    });
    expect(PLATFORM_PRESETS["linkedin-1x1"].safeZone).toEqual({
      top: 54,
      right: 54,
      bottom: 54,
      left: 54,
    });
    expect(PLATFORM_PRESETS["linkedin-4x5"].safeZone).toEqual({
      top: 68,
      right: 54,
      bottom: 68,
      left: 54,
    });
  });
});

describe("helpers", () => {
  it("computes aspect ratios", () => {
    expect(aspectRatio({ width: 1080, height: 1920 })).toBe("9:16");
    expect(aspectRatio({ width: 1080, height: 1350 })).toBe("4:5");
    expect(aspectRatio({ width: 1920, height: 1080 })).toBe("16:9");
  });

  it("computes the content box and describes the safe zone", () => {
    const { canvas, safeZone } = PLATFORM_PRESETS.reels;
    expect(contentBox(canvas, safeZone)).toEqual({ x: 60, y: 220, width: 880, height: 1280 });
    expect(describeSafeZone(canvas, safeZone)).toBe(
      "top 220 px (11.5%), right 140 px (13.0%), bottom 420 px (21.9%), left 60 px (5.6%)",
    );
  });

  it("renders platforms.md with every platform and the verify note", () => {
    const md = renderPlatformsMarkdown();
    expect(md).toContain("Verify them against the current platform UI");
    for (const id of [...Object.keys(PLATFORM_PRESETS), "custom"])
      expect(md).toContain(`\`${id}\``);
  });
});
