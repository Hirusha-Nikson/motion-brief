import type { Canvas, Platform, SafeZone } from "./schema.js";

export type PresetPlatform = Exclude<Platform, "custom">;

export interface PlatformPreset {
  label: string;
  canvas: Canvas;
  /** Default `brief.safeZone`: all content stays inside it. */
  safeZone: SafeZone;
  /** Looser action-safe margins, where the platform distinguishes them (16:9 screens). */
  actionSafe?: SafeZone;
  whereItPlays: string;
  /** How the safe zone was derived. */
  basis: string;
}

function percentOf(canvas: Canvas, pct: number): SafeZone {
  const x = Math.round((canvas.width * pct) / 100);
  const y = Math.round((canvas.height * pct) / 100);
  return { top: y, right: x, bottom: y, left: x };
}

/** Even safe zone of `pct` percent per side; used for `custom` canvases. */
export function percentSafeZone(canvas: Canvas, pct = 5): SafeZone {
  return percentOf(canvas, pct);
}

const vertical: Canvas = { width: 1080, height: 1920, fps: 30 };
const landscape: Canvas = { width: 1920, height: 1080, fps: 30 };
const square: Canvas = { width: 1080, height: 1080, fps: 30 };
const portrait45: Canvas = { width: 1080, height: 1350, fps: 30 };

/** Clears the caption, button rail and profile overlays of vertical short-video apps. */
const verticalSafe: SafeZone = { top: 220, right: 140, bottom: 420, left: 60 };

/**
 * Platform presets: the single source for canvas sizes and safe zones.
 *
 * These are starting values. VERIFY AGAINST THE CURRENT PLATFORM UI before relying on them;
 * platforms move their overlays without notice. Users can override `safeZone` per brief.
 */
export const PLATFORM_PRESETS: Record<PresetPlatform, PlatformPreset> = {
  reels: {
    label: "Instagram Reels",
    canvas: vertical,
    safeZone: verticalSafe,
    whereItPlays: "Instagram Reels feed, vertical, often watched without sound",
    basis: "Clears caption, buttons and profile overlays",
  },
  tiktok: {
    label: "TikTok",
    canvas: vertical,
    safeZone: verticalSafe,
    whereItPlays: "TikTok feed, vertical, usually watched with sound",
    basis: "Clears caption, buttons and profile overlays",
  },
  shorts: {
    label: "YouTube Shorts",
    canvas: vertical,
    safeZone: verticalSafe,
    whereItPlays: "YouTube Shorts feed, vertical, usually watched with sound",
    basis: "Clears caption, buttons and channel overlays",
  },
  youtube: {
    label: "YouTube (16:9)",
    canvas: landscape,
    safeZone: percentOf(landscape, 10),
    actionSafe: percentOf(landscape, 5),
    whereItPlays: "YouTube, landscape, watched with sound on desktop and TV",
    basis: "10% title-safe for content; 5% action-safe for edge motion",
  },
  "presentation-16x9": {
    label: "Presentation (16:9)",
    canvas: landscape,
    safeZone: percentOf(landscape, 10),
    actionSafe: percentOf(landscape, 5),
    whereItPlays: "Presentation screen or slide embed, landscape, often projected",
    basis: "10% title-safe for content; 5% action-safe for edge motion",
  },
  "linkedin-16x9": {
    label: "LinkedIn (16:9)",
    canvas: landscape,
    safeZone: percentOf(landscape, 5),
    whereItPlays: "LinkedIn feed, landscape, autoplays muted",
    basis: "5% per side",
  },
  "linkedin-1x1": {
    label: "LinkedIn (1:1)",
    canvas: square,
    safeZone: percentOf(square, 5),
    whereItPlays: "LinkedIn feed, square, autoplays muted",
    basis: "5% per side",
  },
  "linkedin-4x5": {
    label: "LinkedIn (4:5)",
    canvas: portrait45,
    safeZone: percentOf(portrait45, 5),
    whereItPlays: "LinkedIn feed, portrait 4:5, autoplays muted",
    basis: "5% per side",
  },
  square: {
    label: "Square (1:1)",
    canvas: square,
    safeZone: percentOf(square, 6),
    whereItPlays: "Social feeds, square, often watched without sound",
    basis: "6% per side",
  },
};

export const CUSTOM_WHERE_IT_PLAYS = "Custom placement";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "9:16", "16:9", "4:5", ... */
export function aspectRatio(canvas: Pick<Canvas, "width" | "height">): string {
  const d = gcd(canvas.width, canvas.height);
  return `${canvas.width / d}:${canvas.height / d}`;
}

/** The content box left after removing the safe-zone margins. */
export function contentBox(canvas: Canvas, safeZone: SafeZone) {
  return {
    x: safeZone.left,
    y: safeZone.top,
    width: canvas.width - safeZone.left - safeZone.right,
    height: canvas.height - safeZone.top - safeZone.bottom,
  };
}

function pct(px: number, of: number): string {
  return `${((px / of) * 100).toFixed(1)}%`;
}

/** Safe zone as "top 220 px (11.5%), right 140 px (13.0%), ..." */
export function describeSafeZone(canvas: Canvas, safeZone: SafeZone): string {
  return [
    `top ${safeZone.top} px (${pct(safeZone.top, canvas.height)})`,
    `right ${safeZone.right} px (${pct(safeZone.right, canvas.width)})`,
    `bottom ${safeZone.bottom} px (${pct(safeZone.bottom, canvas.height)})`,
    `left ${safeZone.left} px (${pct(safeZone.left, canvas.width)})`,
  ].join(", ");
}

/** `platforms.md` for the skill's refs, generated from PLATFORM_PRESETS. */
export function renderPlatformsMarkdown(): string {
  const rows = (Object.keys(PLATFORM_PRESETS) as PresetPlatform[]).map((id) => {
    const p = PLATFORM_PRESETS[id];
    const s = p.safeZone;
    const action = p.actionSafe
      ? `${p.actionSafe.top} / ${p.actionSafe.right} / ${p.actionSafe.bottom} / ${p.actionSafe.left}`
      : "same";
    return `| \`${id}\` | ${p.label} | ${p.canvas.width}×${p.canvas.height} (${aspectRatio(p.canvas)}) | ${p.canvas.fps} | ${s.top} / ${s.right} / ${s.bottom} / ${s.left} | ${action} | ${p.basis} |`;
  });
  return [
    "# Platforms: canvas and safe zones",
    "",
    "Generated from `packages/brief/src/presets.ts`. Do not edit by hand.",
    "",
    "> These are starting values. **Verify them against the current platform UI**; platforms move their overlays without notice. A brief may override `safeZone`; the brief always wins.",
    "",
    "Safe zone values are margins in px from each edge: top / right / bottom / left. All content (text, icons, images, captions) stays inside the safe zone. Only background and decorative motion may extend to the action-safe area or the frame edge.",
    "",
    "| Platform id | Name | Canvas | fps | Safe zone (px) | Action-safe (px) | Basis |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    `| \`custom\` | Custom | from \`brief.canvas\` | from brief | 5% per side unless set | same | 5% per side |`,
    "",
  ].join("\n");
}
