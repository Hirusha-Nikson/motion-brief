// Builds the uploadable archives. Run via `pnpm package`.
//   dist/motion-brief-skill.zip  - the skill alone, for Customize > Skills > Upload
//   dist/motion-brief-plugin.zip - the whole plugin, for Customize > Plugins > Add > Upload plugin
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = join(root, "plugin");
const skillDir = join(pluginDir, "skills", "motion-brief");
const SKIP = new Set(["__pycache__", "node_modules", ".DS_Store"]);
// A fixed timestamp keeps the archives byte-identical across builds.
const mtime = new Date("2026-01-01T00:00:00Z");

function collect(dir, prefix, out = {}) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    if (SKIP.has(entry.name) || entry.name.endsWith(".pyc")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collect(full, `${prefix}${entry.name}/`, out);
    else out[`${prefix}${entry.name}`] = [readFileSync(full), { mtime }];
  }
  return out;
}

const outputs = {
  // The skill folder must be the archive's top level: motion-brief/SKILL.md.
  "motion-brief-skill.zip": collect(skillDir, "motion-brief/"),
  // The plugin's contents at the top level: .claude-plugin/plugin.json, skills/...
  "motion-brief-plugin.zip": collect(pluginDir, ""),
};

mkdirSync(join(root, "dist"), { recursive: true });
for (const [file, entries] of Object.entries(outputs)) {
  writeFileSync(join(root, "dist", file), zipSync(entries, { level: 9 }));
  console.log(`wrote dist/${file} (${Object.keys(entries).length} files)`);
}
