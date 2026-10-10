import { applyPatch } from "rfc6902";
import { describe, expect, it } from "vitest";
import { briefContent, expandBrief } from "./defaults.js";
import { applyEdit, computeAffectedScenes, createEdit, diffBriefs } from "./patch.js";
import { unwrap } from "./result.js";
import type { Brief, BriefContent } from "./schema.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const base = unwrap(
  expandBrief(
    {
      platform: "reels",
      voiceover: { enabled: true },
      scenes: [
        { type: "title", onScreenText: ["Old title"], voText: "Welcome." },
        { type: "bullets", onScreenText: ["Points", "One", "Two"] },
        { type: "cta", onScreenText: ["Buy", "Now"], voText: "Go now." },
      ],
    },
    opts,
  ),
);

function edit(change: (draft: BriefContent) => void): { edited: BriefContent } {
  const edited = structuredClone(briefContent(base));
  change(edited);
  return { edited };
}

function affected(change: (draft: BriefContent) => void): string[] {
  const { edited } = edit(change);
  return computeAffectedScenes(base, diffBriefs(base, edited));
}

describe("createEdit + applyEdit", () => {
  it("reproduces the edited brief exactly", () => {
    const { edited } = edit((d) => {
      d.scenes[1]!.onScreenText[1]!.text = "First";
    });
    const e = unwrap(createEdit(base, edited));
    expect(e).toMatchObject({
      schema: "motion-edit/v1",
      baseHash: base.hash,
      affectedScenes: ["s2"],
    });
    expect(e.summary).toBe('Scene s2 › onScreenText #2 › text: "One" → "First"');

    // patch(original, ops) deep-equals the edited brief
    const patched = structuredClone(briefContent(base));
    applyPatch(patched, e.ops);
    expect(patched).toEqual(edited);

    const applied = unwrap(applyEdit(base, e));
    expect(briefContent(applied.brief)).toEqual(edited);
    expect(applied.brief.hash).toBe(e.resultHash);
    expect(applied.affectedScenes).toEqual(["s2"]);
  });

  it("supports chained edits", () => {
    const first = unwrap(
      applyEdit(base, unwrap(createEdit(base, edit((d) => void (d.hook = "Bang")).edited))),
    );
    const second = structuredClone(briefContent(first.brief));
    second.scenes[2]!.onScreenText[1]!.text = "Today";
    const applied = unwrap(applyEdit(first.brief, unwrap(createEdit(first.brief, second))));
    expect(applied.brief.hook).toBe("Bang");
    expect(applied.brief.scenes[2]?.onScreenText[1]?.text).toBe("Today");
  });

  it("rejects an edit made for another version (wrong baseHash)", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const result = applyEdit(base, { ...e, baseHash: "0".repeat(64) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/different version of the brief.*Re-import/);
  });

  it("rejects a saved brief that was changed after export", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const tampered: Brief = { ...base, purpose: "Something else" };
    const result = applyEdit(tampered, e);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/changed after export/);
  });

  it("rejects protected paths", () => {
    const result = applyEdit(base, {
      schema: "motion-edit/v1",
      baseHash: base.hash,
      ops: [{ op: "replace", path: "/hash", value: "x" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toBe("Edits may not change /hash.");
  });

  it("rejects ops that don't apply", () => {
    const result = applyEdit(base, {
      schema: "motion-edit/v1",
      baseHash: base.hash,
      ops: [{ op: "replace", path: "/scenes/9/goal", value: "x" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toMatch(/^Edit operation 1 \(replace \/scenes\/9\/goal\) failed/);
  });

  it("rejects an edit whose result is invalid", () => {
    const result = applyEdit(base, {
      schema: "motion-edit/v1",
      baseHash: base.hash,
      ops: [{ op: "replace", path: "/scenes/0/onScreenText/0/text", value: "x".repeat(49) }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^After applying the edit: scenes\[0\]/);
  });

  it("rejects a result that differs from the website's (resultHash)", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const result = applyEdit(base, { ...e, resultHash: "f".repeat(64) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/result hash differs/);
  });

  it("computes affectedScenes when the edit omits it", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.scenes[2]!.goal = "Sell")).edited));
    const { affectedScenes: _omit, ...rest } = e;
    expect(unwrap(applyEdit(base, rest)).affectedScenes).toEqual(["s3"]);
  });

  it("refuses an edit with no changes", () => {
    const result = createEdit(base, briefContent(base));
    expect(result.ok).toBe(false);
  });
});

describe("computeAffectedScenes", () => {
  it("marks every scene for theme, canvas and similar changes", () => {
    expect(affected((d) => void (d.theme.palette.primary = "#ff0000"))).toEqual(["s1", "s2", "s3"]);
    expect(affected((d) => void (d.safeZone.top = 300))).toEqual(["s1", "s2", "s3"]);
  });

  it("marks the first scene for a hook change", () => {
    expect(affected((d) => void (d.hook = "New hook"))).toEqual(["s1"]);
  });

  it("marks voice-over scenes for voice-over settings", () => {
    expect(affected((d) => void (d.voiceover.wordsPerMinute = 170))).toEqual(["s1", "s3"]);
  });

  it("marks nothing for music-only changes", () => {
    expect(affected((d) => void (d.music.note = "lofi"))).toEqual([]);
  });

  it("marks an added scene", () => {
    expect(
      affected((d) =>
        d.scenes.splice(1, 0, {
          id: "new",
          type: "quote",
          goal: "Quote",
          durationSec: 4,
          onScreenText: [],
          icons: [],
          images: [],
          transitionIn: "fade",
        }),
      ),
    ).toContain("new");
  });

  it("lists a removed scene after the remaining ones", () => {
    const ids = affected((d) => void d.scenes.splice(1, 1));
    expect(ids).toContain("s2");
    expect(ids[ids.length - 1]).toBe("s2");
  });

  it("follows index shifts across operations", () => {
    expect(
      computeAffectedScenes(base, [
        { op: "remove", path: "/scenes/0" },
        { op: "replace", path: "/scenes/0/goal", value: "Now first" },
      ]),
    ).toEqual(["s2", "s1"]);
  });
});
