import { buildExample, exampleFiles, type ExampleSource } from "./examples.js";
import { briefJsonSchema, editJsonSchema } from "./json-schema.js";
import { renderPlatformsMarkdown } from "./presets.js";
import { fail, ok, type Result } from "./result.js";

/** Where generated files go, relative to the repo root. */
export const GENERATED_DIR = "packages/brief/generated";
export const EXAMPLES_DIR = "examples";

/**
 * Every generated file (repo-relative path → content): JSON Schemas, platforms.md
 * and the outputs of each example source.
 */
export function generatedFiles(
  sources: Record<string, ExampleSource>,
): Result<Record<string, string>> {
  const files: Record<string, string> = {
    [`${GENERATED_DIR}/motion-brief.schema.json`]: `${JSON.stringify(briefJsonSchema(), null, 2)}\n`,
    [`${GENERATED_DIR}/motion-edit.schema.json`]: `${JSON.stringify(editJsonSchema(), null, 2)}\n`,
    [`${GENERATED_DIR}/platforms.md`]: renderPlatformsMarkdown(),
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
