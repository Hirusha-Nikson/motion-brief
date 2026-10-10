// Writes the JSON Schemas, platforms.md and example outputs. Run via `pnpm --filter @motionbrief/brief generate`.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLES_DIR, generatedFiles } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const examplesDir = join(root, EXAMPLES_DIR);

const sources = {};
for (const entry of readdirSync(examplesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = join(examplesDir, entry.name, "source.json");
  sources[entry.name] = JSON.parse(readFileSync(file, "utf8"));
}

const result = generatedFiles(sources);
if (!result.ok) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}
for (const [path, content] of Object.entries(result.value)) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`wrote ${path}`);
}
