import { CONTRAST_PAIRS } from "./checks.js";
import { PLATFORM_PRESETS, TYPICAL_LENGTH_SEC, type PresetPlatform } from "./presets.js";
import { MOTION_STYLE_IDS, PLATFORMS, SCENE_TYPES, TEXT_ROLES } from "./schema.js";
import {
  LINE_HEIGHT,
  MOTION_STYLES,
  ROLE_SIZE_UNITS,
  SCENE_TYPE_INFO,
  TEXT_ROLE_STYLE,
} from "./styles.js";

/** `refs/styles.md` for the skill: motion styles, text styles, contrast pairs, scene patterns. */
export function renderStylesMarkdown(): string {
  const motion = MOTION_STYLE_IDS.map((id) => {
    const s = MOTION_STYLES[id];
    return `| \`${id}\` | ${s.description} | \`${s.easing}\` | ${s.entranceMs} ms | ${s.exitMs} ms | ${s.staggerMs} ms |`;
  });
  const text = TEXT_ROLES.map((role) => {
    const s = TEXT_ROLE_STYLE[role];
    return `| \`${role}\` | ${s.font} | ${s.weight === 700 ? "bold" : "regular"} | \`${s.color}\` | ${s.fill ? `\`${s.fill}\`` : "–"} |`;
  });
  const pairs = CONTRAST_PAIRS.map(
    (p) =>
      `| \`${p.fg}\` on \`${p.bg}\` | ${p.usage} | ${p.severity === "error" ? "must pass" : "should pass"} |`,
  );
  const scenes = SCENE_TYPES.map(
    (t) => `| \`${t}\` | ${SCENE_TYPE_INFO[t].label} | ${SCENE_TYPE_INFO[t].description} |`,
  );
  return [
    "# Styles",
    "",
    "Generated from `packages/brief`. Do not edit by hand.",
    "",
    "## Motion styles (`theme.motionStyle`)",
    "",
    "| Style | Feel | Entrance easing | Entrance | Exit | Stagger |",
    "| --- | --- | --- | --- | --- | --- |",
    ...motion,
    "",
    "## Text roles",
    "",
    "Font is `theme.fonts.heading` or `theme.fonts.body`. Colours are palette roles; use them as CSS variables.",
    "",
    "| Role | Font | Weight | Colour | Sits on |",
    "| --- | --- | --- | --- | --- |",
    ...text,
    "",
    "Cards and panels use `surface`. Decorative shapes may use `primary` and `accent`.",
    "",
    "## Contrast pairs (`rules.minContrast`)",
    "",
    "| Pair | Used for | Requirement |",
    "| --- | --- | --- |",
    ...pairs,
    "",
    "## Scene patterns",
    "",
    "| Pattern | Name | Use it for |",
    "| --- | --- | --- |",
    ...scenes,
    "",
  ].join("\n");
}

function bezier(easing: string): number[] {
  const m = /cubic-bezier\(([^)]+)\)/.exec(easing);
  if (!m?.[1]) throw new Error(`Not a cubic-bezier: ${easing}`);
  return m[1].split(",").map((n) => Number(n.trim()));
}

/** `refs/render-config.json`: the style tables scripts/render_video.py renders with. */
export function renderConfigJson(): Record<string, unknown> {
  return {
    note: "Generated from packages/brief. Do not edit by hand.",
    lineHeight: LINE_HEIGHT,
    roleSizeUnits: ROLE_SIZE_UNITS,
    textRoles: TEXT_ROLE_STYLE,
    motionStyles: Object.fromEntries(
      MOTION_STYLE_IDS.map((id) => {
        const s = MOTION_STYLES[id];
        return [
          id,
          {
            easing: bezier(s.easing),
            entranceMs: s.entranceMs,
            exitMs: s.exitMs,
            staggerMs: s.staggerMs,
          },
        ];
      }),
    ),
    contrastPairs: CONTRAST_PAIRS,
  };
}

/** `refs/presets.json`: platform canvases for scripts/brief_tool.py. */
export function presetsJson(): Record<string, unknown> {
  const platforms = Object.fromEntries(
    PLATFORMS.map((id) => {
      const [min, max] = TYPICAL_LENGTH_SEC[id];
      if (id === "custom") return [id, { typicalSec: [min, max] }];
      const p = PLATFORM_PRESETS[id as PresetPlatform];
      return [
        id,
        { label: p.label, width: p.canvas.width, height: p.canvas.height, typicalSec: [min, max] },
      ];
    }),
  );
  return {
    note: "Generated from packages/brief. Do not edit by hand.",
    platforms,
    minContentShare: 0.25,
  };
}
