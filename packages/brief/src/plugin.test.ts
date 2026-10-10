import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { serializeBriefBlock } from "./blocks.js";
import { expandBrief } from "./defaults.js";
import { EXAMPLES_DIR, SKILL_DIR } from "./generate.js";
import { unwrap } from "./result.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pluginDir = join(root, "plugin");
const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

/** Minimal YAML frontmatter reader: `key: value` lines between the opening `---` markers. */
function frontmatter(text: string): Record<string, string> | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const out: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([a-z][a-z0-9_-]*):\s*(.*)$/.exec(line);
    if (m?.[1]) out[m[1]] = (m[2] ?? "").replace(/^"(.*)"$/, "$1");
  }
  return out;
}

describe("plugin manifest and marketplace", () => {
  const plugin = readJson(join(pluginDir, ".claude-plugin/plugin.json"));
  const market = readJson(join(root, ".claude-plugin/marketplace.json"));

  it("has a valid plugin.json", () => {
    expect(plugin.name).toBe("motion-brief");
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(String(plugin.name)).not.toMatch(/^(claude|anthropic)/);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description).toBeTruthy();
    expect((plugin.author as { name?: string }).name).toBeTruthy();
    expect(() => new URL(String(plugin.homepage))).not.toThrow();
  });

  it("has a marketplace that points at the plugin folder", () => {
    expect(market.name).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
    expect((market.owner as { name?: string }).name).toBeTruthy();
    const plugins = market.plugins as { name: string; source: string }[];
    expect(plugins).toHaveLength(1);
    expect(plugins[0]?.name).toBe(plugin.name);
    expect(plugins[0]?.source).toBe("./plugin");
    expect(existsSync(join(root, "plugin/.claude-plugin/plugin.json"))).toBe(true);
  });

  it("has nothing claude.ai refuses to install", () => {
    expect(existsSync(join(pluginDir, "bin"))).toBe(false);
    expect(existsSync(join(pluginDir, "CLAUDE.md"))).toBe(false);
  });
});

describe("skills", () => {
  const skillsDir = join(pluginDir, "skills");
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it("includes the main skill and the four commands", () => {
    expect(names.sort()).toEqual(["build", "check", "edit", "estimate", "motion-brief"]);
  });

  it.each(names)("%s follows the Agent Skills rules", (name) => {
    const text = readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");
    const fm = frontmatter(text);
    expect(fm, "frontmatter must start on line 1").not.toBeNull();
    expect(fm?.name).toBe(name);
    expect(name).toMatch(/^[a-z0-9-]{1,64}$/);
    expect(fm?.description?.length ?? 0).toBeGreaterThan(20);
    expect(fm?.description?.length ?? 0).toBeLessThanOrEqual(1024);
    expect(text.split("\n").length).toBeLessThan(500);
  });

  it("links only to files that exist", () => {
    const dir = join(root, SKILL_DIR);
    const files = ["SKILL.md", ...readdirSync(join(dir, "refs")).map((f) => `refs/${f}`)];
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const text = readFileSync(join(dir, file), "utf8");
      // Formatters turn an inline ```motion-brief into ``motion-brief; write `motion-brief` instead.
      expect(text, file).not.toMatch(/(^|[^`])``motion/m);
      const base = file.includes("/") ? join(dir, "refs") : dir;
      for (const [, target] of text.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)) {
        expect(existsSync(join(base, target!)), `${file} → ${target}`).toBe(true);
      }
      for (const [, script] of text.matchAll(/`python3 (scripts\/[^ `]+)/g)) {
        expect(existsSync(join(dir, script!)), `${file} → ${script}`).toBe(true);
      }
    }
  });
});

// ---- scripts/brief_tool.py must agree with this package ----

function findPython(): string | null {
  for (const cmd of ["python3", "python"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0 && /Python 3/.test(`${r.stdout}${r.stderr}`)) return cmd;
  }
  return null;
}

const python = findPython();
const tmp = mkdtempSync(join(tmpdir(), "motion-brief-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Report {
  kind: string | null;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

let n = 0;
function runTool(text: string): Report {
  const file = join(tmp, `case-${n++}.txt`);
  writeFileSync(file, text, "utf8");
  const r = spawnSync(python!, [join(root, SKILL_DIR, "scripts/brief_tool.py"), "check", file], {
    encoding: "utf8",
  });
  if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr);
  return JSON.parse(r.stdout) as Report;
}

const examples = readdirSync(join(root, EXAMPLES_DIR), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

describe.skipIf(!python)("scripts/brief_tool.py", () => {
  it.each(examples)("accepts example %s with a matching hash", (name) => {
    const report = runTool(readFileSync(join(root, EXAMPLES_DIR, name, "prompt.md"), "utf8"));
    expect(report).toMatchObject({ kind: "brief", ok: true, errors: [], warnings: [] });
    const edit = runTool(readFileSync(join(root, EXAMPLES_DIR, name, "edit-prompt.md"), "utf8"));
    expect(edit).toMatchObject({ kind: "edit", ok: true });
  });

  it("computes the same hash for unicode text, floats and every option", () => {
    const brief = unwrap(
      expandBrief({
        platform: "custom",
        canvas: { width: 1280, height: 720, fps: 25 },
        topic: 'Café ☕ — "quotes", tabs\tand\nnewlines, emoji 🎬, ලංකාව, 日本語 \u0001',
        contentMode: "script",
        audience: "Ünïcode fans",
        durationSec: 37.5,
        scenes: [{ idea: "Intro 🎉", durationSec: 4.25 }, "Outro"],
        notes: ["Keep it ✨"],
        icons: { enabled: true },
        voiceover: { enabled: true, voice: "warm", wordsPerMinute: 165 },
        music: { enabled: true, genre: "lo-fi" },
        rules: { minContrast: 7, readingWordsPerSec: 2.5 },
        theme: { cornerRadius: 0, motionStyle: "calm" },
      }),
    );
    const report = runTool(`Please build:\r\n${serializeBriefBlock(brief).replace(/\n/g, "\r\n")}`);
    expect(report).toMatchObject({ ok: true, errors: [], warnings: [] });
  });

  it("warns when the brief changed after export", () => {
    const brief = unwrap(expandBrief({ platform: "reels", topic: "Original" }));
    const report = runTool(serializeBriefBlock({ ...brief, topic: "Changed" }));
    expect(report.ok).toBe(true);
    expect(report.warnings[0]).toMatch(/hash doesn't match/);
  });

  it("reports schema and rule errors with field paths", () => {
    const brief = unwrap(expandBrief({ platform: "reels", topic: "A video" }));
    const bad = { ...brief, platform: "myspace", extra: 1 } as Record<string, unknown>;
    const report = runTool(serializeBriefBlock(bad as never));
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^platform: must be one of/),
        '(root): unrecognized key "extra"',
      ]),
    );

    const manual = runTool(serializeBriefBlock({ ...brief, sceneMode: "manual" }));
    expect(manual.errors[0]).toMatch(/^scenes: add at least one scene/);

    const wrongCanvas = runTool(
      serializeBriefBlock({ ...brief, canvas: { width: 1920, height: 1080, fps: 30 } }),
    );
    expect(wrongCanvas.errors[0]).toMatch(/^canvas: platform "reels" is 1080x1920/);
  });

  it("explains a missing or broken block", () => {
    expect(runTool("make me a video").errors[0]).toMatch(/No ```motion-brief block found/);
    expect(runTool("```motion-brief\n{ broken").errors[0]).toMatch(/isn't valid JSON/);
  });
});

describe("pnpm package", () => {
  it("builds a skill zip and a plugin zip with the right layout", () => {
    const r = spawnSync(process.execPath, [join(root, "scripts/package-plugin.mjs")], {
      encoding: "utf8",
    });
    expect(r.status, r.stderr).toBe(0);

    const skill = Object.keys(unzipSync(readFileSync(join(root, "dist/motion-brief-skill.zip"))));
    expect(skill.every((p) => p.startsWith("motion-brief/"))).toBe(true);
    expect(skill).toEqual(
      expect.arrayContaining([
        "motion-brief/SKILL.md",
        "motion-brief/scripts/brief_tool.py",
        "motion-brief/refs/motion-brief.schema.json",
      ]),
    );

    const plugin = Object.keys(unzipSync(readFileSync(join(root, "dist/motion-brief-plugin.zip"))));
    expect(plugin).toEqual(
      expect.arrayContaining([
        ".claude-plugin/plugin.json",
        "skills/motion-brief/SKILL.md",
        "skills/build/SKILL.md",
      ]),
    );
    expect(plugin.some((p) => p.includes("__pycache__"))).toBe(false);
  });
});
