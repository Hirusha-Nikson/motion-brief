import { buildExample, exampleFiles, type ExampleSource } from "./examples.js";
import { briefJsonSchema, editJsonSchema, planJsonSchema } from "./json-schema.js";
import { renderPlatformsMarkdown } from "./presets.js";
import { fail, ok, type Result } from "./result.js";
import { presetsJson, renderConfigJson, renderStylesMarkdown } from "./skill-refs.js";

/** The skill folder; its `refs/` holds the generated copies of the contract. */
export const SKILL_DIR = "plugin/skills/motion-brief";
export const EXAMPLES_DIR = "examples";

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

/**
 * Every generated file (repo-relative path → content): the skill's JSON Schemas and
 * reference tables, and the outputs of each example source.
 */
export function generatedFiles(
  sources: Record<string, ExampleSource>,
): Result<Record<string, string>> {
  const files: Record<string, string> = {
    [`${SKILL_DIR}/refs/motion-brief.schema.json`]: json(briefJsonSchema()),
    [`${SKILL_DIR}/refs/motion-edit.schema.json`]: json(editJsonSchema()),
    [`${SKILL_DIR}/refs/platforms.md`]: renderPlatformsMarkdown(),
    [`${SKILL_DIR}/refs/styles.md`]: renderStylesMarkdown(),
    [`${SKILL_DIR}/refs/presets.json`]: json(presetsJson()),
    [`${SKILL_DIR}/refs/motion-plan.schema.json`]: json(planJsonSchema()),
    [`${SKILL_DIR}/refs/render-config.json`]: json(renderConfigJson()),
  };
  const errors: string[] = [];
  for (const [name, source] of Object.entries(sources)) {
    const built = buildExample(source);
    if (!built.ok) {
      errors.push(...built.errors.map((e) => `${EXAMPLES_DIR}/${name}: ${e}`));
      continue;
    }
    for (const [file, content] of Object.entries(exampleFiles(built.value))) {
      files[`${EXAMPLES_DIR}/${name}/${file}`] = content;
    }
  }
  return errors.length ? fail(errors) : ok(files);
}
