import { describe, expect, it } from "vitest";
import { briefContent, expandBrief } from "./defaults.js";
import { estimate } from "./estimate.js";
import { unwrap } from "./result.js";
import type { BriefInput, SceneInput } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const content = (input: BriefInput) => briefContent(unwrap(expandBrief(input, opts)));
const scenes = (n: number, type: SceneInput["type"] = "bullets"): SceneInput[] =>
  Array.from({ length: n }, () => ({ type, onScreenText: ["Point"], voText: "Say this line." }));

describe("estimate", () => {
  it("rates a one-scene brief light", () => {
    const e = estimate(content({ platform: "reels", scenes: scenes(1, "title") }));
    expect(e).toEqual({
      tier: "light",
      scenes: 1,
      durationSec: 3.5,
      complexityNotes: ["1 scene over 3.5 s"],
      voCharacters: 0,
    });
  });

  it("rates a long, busy brief heavy", () => {
    const e = estimate(
      content({ platform: "youtube", voiceover: { enabled: true }, scenes: scenes(12, "chart") }),
    );
    expect(e.tier).toBe("heavy");
    expect(e.complexityNotes).toEqual(
      expect.arrayContaining(["12 chart scenes", "Line captions", "Long video (over 60 s)"]),
    );
  });

  it("counts voice-over characters only when voice-over is on", () => {
    const off = estimate(content({ platform: "reels", scenes: scenes(2) }));
    const on = estimate(
      content({ platform: "reels", voiceover: { enabled: true }, scenes: scenes(2) }),
    );
    expect(off.voCharacters).toBe(0);
    expect(on.voCharacters).toBe(2 * "Say this line.".length);
    expect(on.complexityNotes.some((n) => n.startsWith("Voice-over: 28 characters"))).toBe(true);
  });

  it("never drops a tier when scenes are added", () => {
    const order = { light: 0, medium: 1, heavy: 2 };
    let last = 0;
    for (let n = 1; n <= 20; n++) {
      const tier = order[estimate(content({ platform: "reels", scenes: scenes(n) })).tier];
      expect(tier).toBeGreaterThanOrEqual(last);
      last = tier;
    }
    expect(last).toBe(2);
  });
});
