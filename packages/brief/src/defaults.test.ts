import { describe, expect, it } from "vitest";
import { briefContent, expandBrief, finalizeBrief } from "./defaults.js";
import { computeBriefHash } from "./hash.js";
import { PLATFORM_PRESETS, type PresetPlatform } from "./presets.js";
import { unwrap } from "./result.js";
import { BriefSchema, DEFAULT_PALETTE, type BriefInput } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const minimal: BriefInput = {
  platform: "reels",
  scenes: [{ type: "title", onScreenText: ["Hello world"] }],
};

describe("expandBrief", () => {
  it("expands a minimal brief (platform + scenes) into a complete valid brief", () => {
    const brief = unwrap(expandBrief(minimal, opts));
    expect(BriefSchema.safeParse(brief).success).toBe(true);
    expect(brief).toMatchObject({
      schema: "motion-brief/v1",
      id: "test-brief",
      createdAt: "2026-01-01T00:00:00.000Z",
      audience: "General audience",
      whereItPlays: PLATFORM_PRESETS.reels.whereItPlays,
      canvas: { width: 1080, height: 1920, fps: 30 },
      safeZone: { top: 220, right: 140, bottom: 420, left: 60 },
      theme: { palette: DEFAULT_PALETTE, fonts: { heading: "Space Grotesk", body: "Inter" } },
      voiceover: { enabled: false, wordsPerMinute: 150 },
      captions: { enabled: false, style: "line", maxLines: 2 },
      rules: { minContrast: 4.5, minFontPctOfHeight: 3.5, readingWordsPerSec: 3 },
    });
    expect(brief.scenes[0]).toEqual({
      id: "s1",
      type: "title",
      goal: "Open with the main message",
      durationSec: 3.5,
      onScreenText: [{ role: "headline", text: "Hello world", maxChars: 48 }],
      icons: [],
      images: [],
      transitionIn: "cut",
    });
    expect(brief.durationSec).toBe(3.5);
    expect(brief.hook).toContain('"Hello world"');
    expect(brief.hash).toBe(computeBriefHash(brief));
  });

  it("is deterministic for the same input and options", () => {
    expect(unwrap(expandBrief(minimal, opts)).hash).toBe(unwrap(expandBrief(minimal, opts)).hash);
  });

  it.each(Object.keys(PLATFORM_PRESETS) as PresetPlatform[])("uses the %s preset", (platform) => {
    const brief = unwrap(expandBrief({ ...minimal, platform }, opts));
    expect(brief.canvas).toEqual(PLATFORM_PRESETS[platform].canvas);
    expect(brief.safeZone).toEqual(PLATFORM_PRESETS[platform].safeZone);
  });

  it("requires a canvas for custom and defaults its safe zone to 5%", () => {
    const missing = expandBrief({ ...minimal, platform: "custom" }, opts);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors[0]).toMatch(/^canvas: required/);

    const brief = unwrap(
      expandBrief(
        { ...minimal, platform: "custom", canvas: { width: 1000, height: 2000, fps: 24 } },
        opts,
      ),
    );
    expect(brief.safeZone).toEqual({ top: 100, right: 50, bottom: 100, left: 50 });
  });

  it("keeps fields the input sets", () => {
    const brief = unwrap(
      expandBrief(
        {
          ...minimal,
          audience: "Designers",
          hook: "A logo slams in",
          safeZone: { top: 300, right: 100, bottom: 500, left: 100 },
          scenes: [
            { type: "stat", durationSec: 7, transitionIn: "wipe", onScreenText: ["42%"] },
            { id: "outro", type: "cta", goal: "Sign up", onScreenText: ["Join"] },
          ],
        },
        opts,
      ),
    );
    expect(brief.audience).toBe("Designers");
    expect(brief.hook).toBe("A logo slams in");
    expect(brief.safeZone.top).toBe(300);
    expect(brief.scenes[0]).toMatchObject({ durationSec: 7, transitionIn: "wipe" });
    expect(brief.scenes[0]?.onScreenText[0]).toEqual({ role: "stat", text: "42%", maxChars: 12 });
    expect(brief.scenes[1]).toMatchObject({
      id: "outro",
      goal: "Sign up",
      transitionIn: "slide-up",
    });
  });

  it("generates scene ids that don't clash with explicit ones", () => {
    const brief = unwrap(
      expandBrief(
        { ...minimal, scenes: [{ type: "title" }, { id: "s1", type: "cta" }, { type: "quote" }] },
        opts,
      ),
    );
    expect(brief.scenes.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
  });

  it("turns captions on with the voice-over unless the input sets them", () => {
    const vo = { voiceover: { enabled: true } };
    expect(unwrap(expandBrief({ ...minimal, ...vo }, opts)).captions.enabled).toBe(true);
    expect(
      unwrap(expandBrief({ ...minimal, ...vo, captions: { enabled: false } }, opts)).captions
        .enabled,
    ).toBe(false);
  });

  it("makes scenes long enough to read the text and speak the voice-over", () => {
    const longText = "one two three four five six seven eight nine ten eleven twelve";
    const voText = Array.from({ length: 30 }, () => "word").join(" "); // 12 s at 150 wpm
    const brief = unwrap(
      expandBrief(
        {
          ...minimal,
          voiceover: { enabled: true },
          scenes: [
            { type: "title", onScreenText: [{ text: longText, maxChars: 80 }] },
            { type: "title", onScreenText: ["Hi"], voText },
          ],
        },
        opts,
      ),
    );
    expect(brief.scenes[0]?.durationSec).toBe(5); // 12 words / 3 wps + 1 s entrance
    expect(brief.scenes[1]?.durationSec).toBe(13); // 12 s speech + 0.6 s tail, rounded up
  });

  it("reports readable errors", () => {
    const result = expandBrief(
      {
        platform: "reels",
        scenes: [{ type: "title", onScreenText: ["x".repeat(60)], extra: 1 }],
        theme: { palette: { primary: "blue" } },
      },
      opts,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^theme\.palette\.primary: Use a 6-digit hex colour/),
        expect.stringMatching(/^scenes\[0\]: Unrecognized key: "extra"/),
      ]),
    );

    const tooLong = expandBrief(
      { platform: "reels", scenes: [{ type: "title", onScreenText: ["x".repeat(60)] }] },
      opts,
    );
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.errors).toEqual([
        "scenes[0].onScreenText[0].text: Text is 60 characters; the limit for this item is 48",
      ]);
    }
  });

  it("requires platform and scenes", () => {
    const result = expandBrief({}, opts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith("platform:"))).toBe(true);
      expect(result.errors.some((e) => e.startsWith("scenes:"))).toBe(true);
    }
  });
});

describe("finalizeBrief", () => {
  it("recomputes the same estimate and hash from the content", () => {
    const brief = unwrap(expandBrief(minimal, opts));
    expect(unwrap(finalizeBrief(briefContent(brief)))).toEqual(brief);
  });
});
