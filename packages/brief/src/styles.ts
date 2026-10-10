import type { MotionStyle, SceneType, TextRole, Transition } from "./schema.js";

export interface MotionStyleInfo {
  label: string;
  description: string;
  /** CSS easing for entrances. */
  easing: string;
  entranceMs: number;
  exitMs: number;
  /** Delay between items that enter one after another. */
  staggerMs: number;
  defaultTransition: Transition;
}

export const MOTION_STYLES: Record<MotionStyle, MotionStyleInfo> = {
  calm: {
    label: "Calm",
    description: "Smooth, unhurried moves with soft fades and gentle drifts",
    easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    entranceMs: 700,
    exitMs: 500,
    staggerMs: 120,
    defaultTransition: "fade",
  },
  snappy: {
    label: "Snappy",
    description: "Fast, confident moves that land precisely with no bounce",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    entranceMs: 400,
    exitMs: 300,
    staggerMs: 60,
    defaultTransition: "slide-up",
  },
  playful: {
    label: "Playful",
    description: "Bouncy pops and overshoots with lively rhythm",
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    entranceMs: 550,
    exitMs: 350,
    staggerMs: 90,
    defaultTransition: "pop",
  },
};

export interface SceneTypeInfo {
  label: string;
  defaultGoal: string;
  defaultDurationSec: number;
  /** Default role for each text item by position; the last role repeats. */
  roles: readonly [TextRole, ...TextRole[]];
}

export const SCENE_TYPE_INFO: Record<SceneType, SceneTypeInfo> = {
  title: {
    label: "Title",
    defaultGoal: "Open with the main message",
    defaultDurationSec: 3.5,
    roles: ["headline", "subhead"],
  },
  "kinetic-text": {
    label: "Kinetic text",
    defaultGoal: "Deliver one idea with animated typography",
    defaultDurationSec: 4,
    roles: ["headline", "body"],
  },
  bullets: {
    label: "Bullets",
    defaultGoal: "List the key points one by one",
    defaultDurationSec: 5,
    roles: ["headline", "body"],
  },
  stat: {
    label: "Stat",
    defaultGoal: "Make one number land",
    defaultDurationSec: 4,
    roles: ["stat", "label", "body"],
  },
  chart: {
    label: "Chart",
    defaultGoal: "Show a trend or comparison in data",
    defaultDurationSec: 6,
    roles: ["headline", "label"],
  },
  "icon-grid": {
    label: "Icon grid",
    defaultGoal: "Show a set of tools or features",
    defaultDurationSec: 5,
    roles: ["headline", "label"],
  },
  "image-focus": {
    label: "Image focus",
    defaultGoal: "Spotlight an image",
    defaultDurationSec: 4,
    roles: ["headline", "body"],
  },
  quote: {
    label: "Quote",
    defaultGoal: "Let a voice speak",
    defaultDurationSec: 5,
    roles: ["quote", "attribution"],
  },
  comparison: {
    label: "Comparison",
    defaultGoal: "Contrast two options",
    defaultDurationSec: 5,
    roles: ["headline", "label"],
  },
  cta: {
    label: "Call to action",
    defaultGoal: "Tell viewers what to do next",
    defaultDurationSec: 3.5,
    roles: ["headline", "cta"],
  },
};

/** Default character budget per text role. */
export const TEXT_ROLE_MAX_CHARS: Record<TextRole, number> = {
  headline: 48,
  subhead: 80,
  body: 120,
  label: 32,
  stat: 12,
  quote: 180,
  attribution: 48,
  cta: 32,
};

export function defaultRole(type: SceneType, index: number): TextRole {
  const roles = SCENE_TYPE_INFO[type].roles;
  return roles[Math.min(index, roles.length - 1)] ?? roles[0];
}
