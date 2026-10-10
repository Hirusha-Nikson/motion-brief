// Downloads every supported Google Font (regular and bold where available) as TTF into the skill,
// so the MP4 renderer never depends on network access for fonts. Run after changing FONT_FAMILIES:
//   pnpm --filter @motionbrief/brief build && node scripts/fetch-fonts.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FONT_FAMILIES, FONT_INFO, googleFontsUrl } from "../packages/brief/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "plugin/skills/motion-brief/assets/fonts");
// Google Fonts serves plain TTF files to user agents it doesn't recognise as browsers.
const headers = { "User-Agent": "Wget/1.21" };

function fontFileName(family, weight) {
  return `${family.replace(/ /g, "")}-${weight}.ttf`;
}

mkdirSync(outDir, { recursive: true });
const manifest = {};
let bytes = 0;
for (const family of FONT_FAMILIES) {
  const css = await (await fetch(googleFontsUrl([family]), { headers })).text();
  const faces = [...css.matchAll(/font-weight: (\d+);[\s\S]*?src: url\((https:[^)]+\.ttf)\)/g)];
  manifest[family] = {};
  for (const weight of FONT_INFO[family].weights) {
    const face = faces.find((f) => Number(f[1]) === weight);
    if (!face) throw new Error(`No ${weight} face for ${family}`);
    const data = Buffer.from(await (await fetch(face[2], { headers })).arrayBuffer());
    const file = fontFileName(family, weight);
    writeFileSync(join(outDir, file), data);
    manifest[family][weight] = file;
    bytes += data.length;
  }
  console.log(`${family}: ${Object.keys(manifest[family]).join(", ")}`);
}
writeFileSync(join(outDir, "fonts.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(outDir, "LICENSE.md"),
  [
    "# Fonts",
    "",
    "These fonts come from Google Fonts (https://fonts.google.com). Each is licensed under the SIL Open Font License 1.1 (https://openfontlicense.org) or the Apache License 2.0, which allow bundling and redistribution. The copyright belongs to each font's authors; see the font's page on Google Fonts.",
    "",
    "Downloaded by `scripts/fetch-fonts.mjs`.",
    "",
  ].join("\n"),
);
console.log(`Total ${(bytes / 1024 / 1024).toFixed(1)} MB`);
