import { describe, expect, it } from "vitest";
import { briefContent, expandBrief, finalizeBrief, nextSceneId } from "./defaults.js";
import { computeBriefHash } from "./hash.js";
import { PLATFORM_PRESETS, type PresetPlatform } from "./presets.js";
import { unwrap } from "./result.js";
import { BriefSchema, DEFAULT_PALETTE, type BriefInput } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const minimal: BriefInput = { platform: "reels", topic: "Cloudflare K2 new event tool" };

describe("expandBrief", () => {
  it("expands a minimal brief (topic + platform) into a complete valid brief", () => {
    const brief = unwrap(expandBrief(minimal, opts));
    expect(BriefSchema.safeParse(brief).success).toBe(true);
    expect(brief).toMatchObject({
      schema: "motion-brief/v1",
      id: "test-brief",
      createdAt: "2026-01-01T00:00:00.000Z",
      topic: "Cloudflare K2 new event tool",
      contentMode: "idea",
      audience: "",
      canvas: { width: 1080, height: 1920, fps: 30 },
      safeZone: { top: 220, right: 140, bottom: 420, left: 60 },
      durationSec: null,
      theme: { palette: DEFAULT_PALETTE, fonts: { heading: "Space Grotesk", body: "Inter" } },
      sceneMode: "auto",
      scenes: [],
      notes: [],
      icons: { enabled: false },
      voiceover: { enabled: false, language: "en-US", voice: "", wordsPerMinute: 150 },
      captions: { enabled: false, style: "line", maxLines: 2 },
      music: { enabled: false, genre: "" },
      rules: { minContrast: 4.5, minFontPctOfHeight: 3.5, readingWordsPerSec: 3 },
    });
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

  it("turns an outline into scene ideas with free ids and follows it", () => {
    const brief = unwrap(
      expandBrief(
        {
          ...minimal,
          scenes: ["Intro: what is Cloudflare", { id: "s1", idea: "K2 demo" }, "Outro"],
        },
        opts,
      ),
    );
    expect(brief.sceneMode).toBe("manual");
    expect(brief.scenes).toEqual([
      { id: "s2", idea: "Intro: what is Cloudflare" },
      { id: "s1", idea: "K2 demo" },
      { id: "s3", idea: "Outro" },
    ]);
  });

  it("keeps an explicit auto mode even with an outline", () => {
    const brief = unwrap(expandBrief({ ...minimal, sceneMode: "auto", scenes: ["A"] }, opts));
    expect(brief.sceneMode).toBe("auto");
  });

  it("turns captions on with the voice-over unless the input sets them", () => {
    const vo = { voiceover: { enabled: true } };
    expect(unwrap(expandBrief({ ...minimal, ...vo }, opts)).captions.enabled).toBe(true);
    expect(
      unwrap(expandBrief({ ...minimal, ...vo, captions: { enabled: false } }, opts)).captions
        .enabled,
    ).toBe(false);
  });

  it("reports readable errors", () => {
    const result = expandBrief(
      {
        platform: "reels",
        topic: "   ",
        notes: [""],
        theme: { palette: { primary: "blue" } },
        extra: 1,
      },
      opts,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "topic: Describe what the video is about",
        "notes[0]: Write the note or remove it",
        expect.stringMatching(/^theme\.palette\.primary: Use a 6-digit hex colour/),
        expect.stringMatching(/Unrecognized key: "extra"/),
      ]),
    );
  });

  it("requires an outline when the scene mode is manual", () => {
    const result = expandBrief({ ...minimal, sceneMode: "manual" }, opts);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors).toEqual([
        "scenes: Add at least one scene, or let Claude plan the scenes.",
      ]);
  });
});

describe("finalizeBrief", () => {
  it("recomputes the same estimate and hash from the content", () => {
    const brief = unwrap(expandBrief(minimal, opts));
    expect(unwrap(finalizeBrief(briefContent(brief)))).toEqual(brief);
  });
});

describe("nextSceneId", () => {
  it("returns the first free s<n>", () => {
    expect(nextSceneId([])).toBe("s1");
    expect(nextSceneId(["s1", "s3"])).toBe("s2");
  });
});
