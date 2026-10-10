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
      topic: "Cloudflare K2 new event tool",
      scenes: ["What is Cloudflare", "Meet K2", "Keep in touch"],
      notes: ["Quick intro to Cloudflare before K2"],
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
      d.scenes[1]!.idea = "Meet K2: live demo";
    });
    const e = unwrap(createEdit(base, edited));
    expect(e).toMatchObject({
      schema: "motion-edit/v1",
      baseHash: base.hash,
      affectedScenes: ["s2"],
    });
    expect(e.summary).toBe('Scene s2 › idea: "Meet K2" → "Meet K2: live demo"');

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
      applyEdit(
        base,
        unwrap(createEdit(base, edit((d) => void d.notes.push("Use my logo")).edited)),
      ),
    );
    const second = structuredClone(briefContent(first.brief));
    second.scenes[2]!.idea = "Keep in touch with Alex";
    const applied = unwrap(applyEdit(first.brief, unwrap(createEdit(first.brief, second))));
    expect(applied.brief.notes).toEqual(["Quick intro to Cloudflare before K2", "Use my logo"]);
    expect(applied.brief.scenes[2]?.idea).toBe("Keep in touch with Alex");
  });

  it("rejects an edit made for another version (wrong baseHash)", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const result = applyEdit(base, { ...e, baseHash: "0".repeat(64) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/different version of the brief.*Re-import/);
  });

  it("rejects a saved brief that was changed after export", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const tampered: Brief = { ...base, topic: "Something else" };
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
      ops: [{ op: "replace", path: "/scenes/9/idea", value: "x" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/^Edit operation 1 \(replace \/scenes\/9\/idea\) failed/);
    }
  });

  it("rejects an edit whose result is invalid", () => {
    const result = applyEdit(base, {
      schema: "motion-edit/v1",
      baseHash: base.hash,
      ops: [{ op: "replace", path: "/topic", value: " " }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[0]).toBe(
        "After applying the edit: topic: Describe what the video is about",
      );
  });

  it("rejects a result that differs from the website's (resultHash)", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.audience = "Kids")).edited));
    const result = applyEdit(base, { ...e, resultHash: "f".repeat(64) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/result hash differs/);
  });

  it("computes affectedScenes when the edit omits it", () => {
    const e = unwrap(createEdit(base, edit((d) => void (d.scenes[2]!.idea = "Bye")).edited));
    const { affectedScenes: _omit, ...rest } = e;
    expect(unwrap(applyEdit(base, rest)).affectedScenes).toEqual(["s3"]);
  });

  it("refuses an edit with no changes", () => {
    expect(createEdit(base, briefContent(base)).ok).toBe(false);
  });
});

describe("computeAffectedScenes", () => {
  it("marks the whole outline for changes outside a single scene", () => {
    expect(affected((d) => void (d.theme.palette.primary = "#ff0000"))).toEqual(["s1", "s2", "s3"]);
    expect(affected((d) => void (d.notes[0] = "Changed"))).toEqual(["s1", "s2", "s3"]);
    expect(affected((d) => void (d.topic = "Another topic"))).toEqual(["s1", "s2", "s3"]);
  });

  it("marks an added scene", () => {
    expect(affected((d) => void d.scenes.splice(1, 0, { id: "new", idea: "New scene" }))).toContain(
      "new",
    );
  });

  it("lists a removed scene after the remaining ones", () => {
    const ids = affected((d) => void d.scenes.splice(1, 1));
    expect(ids[ids.length - 1]).toBe("s2");
  });

  it("follows index shifts across operations", () => {
    expect(
      computeAffectedScenes(base, [
        { op: "remove", path: "/scenes/0" },
        { op: "replace", path: "/scenes/0/idea", value: "Now first" },
      ]),
    ).toEqual(["s2", "s1"]);
  });
});
