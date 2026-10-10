import { describe, expect, it } from "vitest";
import {
  extractFencedBlocks,
  parseBriefBlock,
  parseEditBlock,
  serializeBriefBlock,
  serializeEditBlock,
} from "./blocks.js";
import { expandBrief } from "./defaults.js";
import { createEdit } from "./patch.js";
import { compileBriefPrompt } from "./prompt.js";
import { unwrap } from "./result.js";

const opts = { now: () => new Date("2026-01-01T00:00:00Z"), newId: () => "test-brief" };
const brief = unwrap(
  expandBrief(
    {
      platform: "square",
      topic: "Hello world, in motion",
      scenes: ["Say hello", "Say goodbye"],
    },
    opts,
  ),
);

function errorsOf(result: { ok: boolean; errors?: string[] }): string[] {
  expect(result.ok).toBe(false);
  return result.errors ?? [];
}

describe("parseBriefBlock", () => {
  it("round-trips serialize → parse", () => {
    const result = parseBriefBlock(serializeBriefBlock(brief));
    expect(result).toEqual({ ok: true, value: brief, warnings: [] });
  });

  it("finds the block inside a full prompt and surrounding chat text", () => {
    const text = `Hi Claude!\n\n${compileBriefPrompt(brief)}\nThanks`;
    expect(unwrap(parseBriefBlock(text))).toEqual(brief);
  });

  it("accepts ~~~ fences, longer fences, indentation and CRLF", () => {
    const json = JSON.stringify(brief, null, 2);
    for (const text of [
      `~~~motion-brief\n${json}\n~~~`,
      `\`\`\`\`motion-brief\n${json}\n\`\`\`\``,
      `  \`\`\` motion-brief\n${json}\n  \`\`\``,
      `\`\`\`motion-brief\r\n${json.replace(/\n/g, "\r\n")}\r\n\`\`\``,
    ]) {
      expect(unwrap(parseBriefBlock(text))).toEqual(brief);
    }
  });

  it("accepts a bare brief.json", () => {
    expect(unwrap(parseBriefBlock(JSON.stringify(brief)))).toEqual(brief);
  });

  it("explains a missing block", () => {
    expect(errorsOf(parseBriefBlock("Make me a video please"))[0]).toMatch(
      /No ```motion-brief block found.*MotionBrief website/,
    );
  });

  it("rejects more than one block", () => {
    const block = serializeBriefBlock(brief);
    expect(errorsOf(parseBriefBlock(`${block}\n${block}`))[0]).toMatch(/Found 2/);
  });

  it("explains truncated JSON", () => {
    const cut = serializeBriefBlock(brief).slice(0, 200);
    expect(errorsOf(parseBriefBlock(cut))[0]).toMatch(/isn't valid JSON.*cut off/);
  });

  it("rejects other schema versions", () => {
    const text = serializeBriefBlock({ ...brief, schema: "motion-brief/v9" as "motion-brief/v1" });
    expect(errorsOf(parseBriefBlock(text))[0]).toMatch(/Unsupported schema "motion-brief\/v9"/);
  });

  it("reports field errors with paths", () => {
    const bad = structuredClone(brief) as Record<string, unknown>;
    bad.canvas = { width: 1080, height: 1080, fps: 500 };
    expect(errorsOf(parseBriefBlock(JSON.stringify(bad)))[0]).toMatch(/^canvas\.fps: /);
  });

  it("warns when the content changed after export", () => {
    const tampered = structuredClone(brief);
    tampered.audience = "Someone else";
    const result = parseBriefBlock(serializeBriefBlock(tampered));
    expect(result.ok).toBe(true);
    expect(result.warnings[0]).toMatch(/hash doesn't match/);
  });

  it("ignores motion-brief text outside a matching fence", () => {
    expect(
      extractFencedBlocks("```js\nconst a = 1;\n```\n```motion-brief\n{}\n```", "motion-brief"),
    ).toEqual(["{}"]);
  });
});

describe("parseEditBlock", () => {
  it("round-trips an edit block", () => {
    const edited = structuredClone(brief);
    edited.scenes[1]!.idea = "Wave goodbye";
    const edit = unwrap(createEdit(brief, edited));
    expect(unwrap(parseEditBlock(`Please apply:\n${serializeEditBlock(edit)}`))).toEqual(edit);
  });

  it("doesn't mistake a brief block for an edit", () => {
    expect(errorsOf(parseEditBlock(serializeBriefBlock(brief)))[0]).toMatch(
      /No ```motion-edit block/,
    );
  });
});
