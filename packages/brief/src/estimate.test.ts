import { describe, expect, it } from "vitest";
import { briefContent, expandBrief } from "./defaults.js";
import { estimate, plannedLength } from "./estimate.js";
import { unwrap } from "./result.js";
import type { BriefInput } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const content = (input: Partial<BriefInput>) =>
  briefContent(unwrap(expandBrief({ platform: "reels", topic: "A video", ...input }, opts)));

describe("estimate", () => {
  it("rates a short brief light and explains it", () => {
    expect(estimate(content({ durationSec: 15 }))).toEqual({
      tier: "light",
      scenes: 3,
      durationSec: 15,
      complexityNotes: ["About 3 scenes, planned by Claude", "15 s long"],
      voCharacters: 0,
    });
  });

  it("uses the platform's typical length when Claude picks it", () => {
    expect(plannedLength({ platform: "reels", durationSec: null })).toBe(38);
    expect(estimate(content({})).complexityNotes[1]).toBe(
      "Length chosen by Claude (estimated at 38 s)",
    );
  });

  it("counts outline scenes and rates a long, busy brief heavy", () => {
    const e = estimate(
      content({
        platform: "youtube",
        durationSec: 180,
        scenes: Array.from({ length: 12 }, (_, i) => `Scene ${i + 1}`),
        voiceover: { enabled: true },
        music: { enabled: true },
        icons: { enabled: true },
      }),
    );
    expect(e.tier).toBe("heavy");
    expect(e.complexityNotes).toEqual(
      expect.arrayContaining(["12 scenes from your outline", "Long video (over 90 s)"]),
    );
  });

  it("counts voice-over characters from the script or the length", () => {
    const script = content({
      contentMode: "script",
      topic: "Hello there",
      voiceover: { enabled: true },
    });
    expect(estimate(script).voCharacters).toBe(11);
    const idea = content({ durationSec: 20, voiceover: { enabled: true } });
    expect(estimate(idea).voCharacters).toBe(300);
    expect(estimate(content({ durationSec: 20 })).voCharacters).toBe(0);
  });

  it("never drops a tier as the video gets longer", () => {
    const order = { light: 0, medium: 1, heavy: 2 };
    let last = 0;
    for (let d = 5; d <= 600; d += 5) {
      const tier = order[estimate(content({ durationSec: d })).tier];
      expect(tier).toBeGreaterThanOrEqual(last);
      last = tier;
    }
    expect(last).toBe(2);
  });
});
