import { describe, expect, it } from "vitest";
import { checkBrief } from "./checks.js";
import { briefContent, expandBrief } from "./defaults.js";
import { unwrap } from "./result.js";
import type { BriefContent, BriefInput } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const make = (input: Partial<BriefInput> = {}): BriefContent =>
  briefContent(unwrap(expandBrief({ platform: "reels", topic: "A video", ...input }, opts)));
const checks = (b: BriefContent) => checkBrief(b).map((i) => `${i.severity}:${i.id}`);

describe("checkBrief", () => {
  it("passes a brief built from defaults", () => {
    expect(checkBrief(make())).toEqual([]);
  });

  it("flags low-contrast text pairs, warning only for accent", () => {
    const b = make();
    b.theme.palette.mutedText = "#20263a";
    b.theme.palette.accent = "#1a2030";
    expect(checks(b)).toEqual([
      "error:contrast:mutedText:background",
      "error:contrast:mutedText:surface",
      "warning:contrast:accent:background",
    ]);
  });

  it("warns when outline lengths don't add up to the target, with a fix", () => {
    const b = make({
      durationSec: 20,
      scenes: [
        { idea: "A", durationSec: 5 },
        { idea: "B", durationSec: 6 },
      ],
    });
    expect(checkBrief(b)).toEqual([
      expect.objectContaining({
        id: "scene-durations",
        severity: "warning",
        suggestion: { label: "Set length to 11 s", path: "/durationSec", value: 11 },
      }),
    ]);
  });

  it("ignores outline lengths when some are missing or the length is Claude's choice", () => {
    expect(
      checkBrief(make({ durationSec: 20, scenes: [{ idea: "A", durationSec: 5 }, "B"] })),
    ).toEqual([]);
    expect(checkBrief(make({ scenes: [{ idea: "A", durationSec: 5 }] }))).toEqual([]);
  });

  it("warns when a script is too long to read aloud in the target length", () => {
    const script = Array.from({ length: 100 }, () => "word").join(" "); // 40 s at 150 wpm
    const b = make({
      contentMode: "script",
      topic: script,
      durationSec: 30,
      voiceover: { enabled: true },
    });
    const issue = checkBrief(b).find((i) => i.check === "script-length");
    expect(issue?.message).toMatch(/about 40 s to read aloud/);
    expect(issue?.suggestion?.value).toBe(40);
    b.voiceover.enabled = false;
    expect(checkBrief(b)).toEqual([]);
  });
});
