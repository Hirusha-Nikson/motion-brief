import type { MotionStyle, PaletteRole, SceneType, TextRole } from "./schema.js";

export interface MotionStyleInfo {
  label: string;
  description: string;
  /** CSS easing for entrances. */
  easing: string;
  entranceMs: number;
  exitMs: number;
  /** Delay between items that enter one after another. */
  staggerMs: number;
}

export const MOTION_STYLES: Record<MotionStyle, MotionStyleInfo> = {
  calm: {
    label: "Calm",
    description: "Smooth, unhurried moves with soft fades and gentle drifts",
    easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    entranceMs: 700,
    exitMs: 500,
    staggerMs: 120,
  },
  snappy: {
    label: "Snappy",
    description: "Fast, confident moves that land precisely with no bounce",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    entranceMs: 400,
    exitMs: 300,
    staggerMs: 60,
  },
  playful: {
    label: "Playful",
    description: "Bouncy pops and overshoots with lively rhythm",
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    entranceMs: 550,
    exitMs: 350,
    staggerMs: 90,
  },
};

/** Scene patterns Claude can compose a video from. */
export const SCENE_TYPE_INFO: Record<SceneType, { label: string; description: string }> = {
  title: { label: "Title", description: "A bold opening or section title" },
  "kinetic-text": {
    label: "Kinetic text",
    description: "One idea delivered with animated typography",
  },
  bullets: { label: "Bullets", description: "Key points revealed one by one" },
  stat: { label: "Stat", description: "One number that lands, with a counter" },
  chart: { label: "Chart", description: "A trend or comparison drawn from data" },
  "icon-grid": { label: "Icon grid", description: "A set of tools, brands or features" },
  "image-focus": { label: "Image focus", description: "An attached image in the spotlight" },
  quote: { label: "Quote", description: "A testimonial or quote with attribution" },
  comparison: { label: "Comparison", description: "Two options side by side" },
  cta: { label: "Call to action", description: "What viewers should do next" },
};

export interface TextRoleStyle {
  font: "heading" | "body";
  weight: 400 | 700;
  /** Palette colour of the text. */
  color: PaletteRole;
  /** Palette colour behind it, when the role sits on its own fill (CTA button). */
  fill?: PaletteRole;
}

/** How each text role is set. The site's style preview and the compiled prompt both follow this. */
export const TEXT_ROLE_STYLE: Record<TextRole, TextRoleStyle> = {
  headline: { font: "heading", weight: 700, color: "text" },
  subhead: { font: "body", weight: 400, color: "mutedText" },
  body: { font: "body", weight: 400, color: "text" },
  label: { font: "body", weight: 700, color: "mutedText" },
  stat: { font: "heading", weight: 700, color: "primary" },
  quote: { font: "heading", weight: 400, color: "text" },
  attribution: { font: "body", weight: 400, color: "mutedText" },
  cta: { font: "heading", weight: 700, color: "background", fill: "primary" },
};
