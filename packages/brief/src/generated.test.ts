import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPatch } from "rfc6902";
import { describe, expect, it } from "vitest";
import { parseBriefBlock, parseEditBlock } from "./blocks.js";
import { briefContent } from "./defaults.js";
import type { ExampleSource } from "./examples.js";
import { EXAMPLES_DIR, generatedFiles } from "./generate.js";
import { briefJsonSchema, editJsonSchema } from "./json-schema.js";
import { applyEdit } from "./patch.js";
import { unwrap } from "./result.js";
import type { Brief, MotionEdit } from "./schema.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const names = readdirSync(join(root, EXAMPLES_DIR), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
const sources: Record<string, ExampleSource> = Object.fromEntries(
  names.map((n) => [n, JSON.parse(read(`${EXAMPLES_DIR}/${n}/source.json`)) as ExampleSource]),
);

// ajv ships CommonJS with typings that don't suit NodeNext default imports.
const load = createRequire(import.meta.url);
const { Ajv2020 } = load("ajv/dist/2020") as { Ajv2020: new (o: object) => AjvLike };
const addFormats = load("ajv-formats") as (ajv: AjvLike) => void;
interface AjvLike {
  compile(schema: object): ((data: unknown) => boolean) & { errors?: unknown };
}
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateBrief = ajv.compile(briefJsonSchema());
const validateEdit = ajv.compile(editJsonSchema());

const expectedAffected: Record<string, string[]> = {
  "youtube-promo": ["s6"],
  "reels-explainer-vo": ["s3"],
  "linkedin-stat-post": ["s1", "s2", "s3"],
  "tech-stack-icons": ["frontend"],
};

describe("generated files", () => {
  it("are up to date (run `pnpm --filter @motionbrief/brief generate` if this fails)", () => {
    const files = unwrap(generatedFiles(sources));
    for (const [path, content] of Object.entries(files)) {
      expect(read(path), path).toBe(content);
    }
  });

  it("include the four required examples", () => {
    expect(names.sort()).toEqual(Object.keys(expectedAffected).sort());
  });
});

describe.each(names)("example %s", (name) => {
  const brief = JSON.parse(read(`${EXAMPLES_DIR}/${name}/brief.json`)) as Brief;
  const edit = JSON.parse(read(`${EXAMPLES_DIR}/${name}/edit.json`)) as MotionEdit;

  it("validates against the generated JSON Schema", () => {
    expect(validateBrief(brief), JSON.stringify(validateBrief.errors)).toBe(true);
    expect(validateEdit(edit), JSON.stringify(validateEdit.errors)).toBe(true);
  });

  it("parses from its prompt files without warnings", () => {
    expect(parseBriefBlock(read(`${EXAMPLES_DIR}/${name}/prompt.md`))).toEqual({
      ok: true,
      value: brief,
      warnings: [],
    });
    expect(unwrap(parseEditBlock(read(`${EXAMPLES_DIR}/${name}/edit-prompt.md`)))).toEqual(edit);
  });

  it("applies its edit exactly and only to the expected scenes", () => {
    const applied = unwrap(applyEdit(brief, edit));
    const patched = structuredClone(briefContent(brief));
    applyPatch(patched, edit.ops);
    expect(briefContent(applied.brief)).toEqual(patched);
    expect(applied.brief.hash).toBe(edit.resultHash);
    expect(applied.affectedScenes).toEqual(expectedAffected[name]);
  });
});

describe("JSON Schema", () => {
  it("rejects an invalid brief", () => {
    const brief = JSON.parse(read(`${EXAMPLES_DIR}/youtube-promo/brief.json`)) as Record<
      string,
      unknown
    >;
    expect(validateBrief({ ...brief, platform: "myspace" })).toBe(false);
    expect(validateBrief({ ...brief, surprise: true })).toBe(false);
    const { hash: _hash, ...noHash } = brief;
    expect(validateBrief(noHash)).toBe(false);
  });
});
