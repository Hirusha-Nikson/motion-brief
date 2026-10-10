import { contrastRatio } from "./color.js";
import type { BriefContent, PaletteRole } from "./schema.js";
import { round1, voDurationSec } from "./timing.js";

export type IssueSeverity = "error" | "warning";

export type CheckId = "contrast" | "scene-durations" | "script-length";

/** A one-click fix: replace the value at `path` (a JSON Pointer) with `value`. */
export interface Suggestion {
  label: string;
  path: string;
  value: unknown;
}

export interface BriefIssue {
  /** Stable across re-runs, so a warning stays acknowledged while it persists. */
  id: string;
  severity: IssueSeverity;
  check: CheckId | (string & {});
  sceneId?: string;
  /** JSON Pointer to the field to fix. */
  path?: string;
  message: string;
  suggestion?: Suggestion;
}

export interface ContrastPair {
  fg: PaletteRole;
  bg: PaletteRole;
  usage: string;
  severity: IssueSeverity;
}

/** Colour pairs used for text. Accent is decorative, so it only warns. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: "text", bg: "background", usage: "headlines, body and quotes", severity: "error" },
  {
    fg: "mutedText",
    bg: "background",
    usage: "subheads, labels and attributions",
    severity: "error",
  },
  { fg: "primary", bg: "background", usage: "stat numbers", severity: "error" },
  { fg: "text", bg: "surface", usage: "text on cards", severity: "error" },
  { fg: "mutedText", bg: "surface", usage: "labels on cards", severity: "error" },
  { fg: "background", bg: "primary", usage: "the call-to-action button", severity: "error" },
  { fg: "accent", bg: "background", usage: "highlights", severity: "warning" },
];

export const DURATION_TOLERANCE_SEC = 0.5;
/** A script may run this much over the target before we warn. */
export const SCRIPT_SLACK = 1.05;

/** Checks that need no rendering: contrast, outline timing, script length. */
export function checkBrief(brief: BriefContent): BriefIssue[] {
  const issues: BriefIssue[] = [];
  const { palette } = brief.theme;

  for (const pair of CONTRAST_PAIRS) {
    let ratio: number;
    try {
      ratio = contrastRatio(palette[pair.fg], palette[pair.bg]);
    } catch {
      continue; // invalid hex: the schema reports it
    }
    if (ratio < brief.rules.minContrast) {
      issues.push({
        id: `contrast:${pair.fg}:${pair.bg}`,
        severity: pair.severity,
        check: "contrast",
        path: `/theme/palette/${pair.fg}`,
        message: `${pair.fg} on ${pair.bg} is ${ratio.toFixed(2)}:1, below ${brief.rules.minContrast}:1 (used for ${pair.usage}).`,
      });
    }
  }

  const timed = brief.sceneMode === "manual" && brief.scenes.length > 0;
  if (
    timed &&
    brief.durationSec !== null &&
    brief.scenes.every((s) => s.durationSec !== undefined)
  ) {
    const total = round1(brief.scenes.reduce((sum, s) => sum + (s.durationSec ?? 0), 0));
    if (Math.abs(total - brief.durationSec) > DURATION_TOLERANCE_SEC) {
      issues.push({
        id: "scene-durations",
        severity: "warning",
        check: "scene-durations",
        path: "/durationSec",
        message: `Your scene lengths add up to ${total} s, but the target length is ${brief.durationSec} s.`,
        suggestion: { label: `Set length to ${total} s`, path: "/durationSec", value: total },
      });
    }
  }

  if (brief.contentMode === "script" && brief.voiceover.enabled && brief.durationSec !== null) {
    const spoken = voDurationSec(brief.topic, brief.voiceover);
    if (spoken > brief.durationSec * SCRIPT_SLACK) {
      const needed = Math.min(600, Math.ceil(spoken));
      issues.push({
        id: "script-length",
        severity: "warning",
        check: "script-length",
        path: "/durationSec",
        message: `Your script takes about ${round1(spoken)} s to read aloud at ${brief.voiceover.wordsPerMinute} words per minute, longer than the ${brief.durationSec} s target. Claude would have to trim it.`,
        suggestion: { label: `Set length to ${needed} s`, path: "/durationSec", value: needed },
      });
    }
  }

  return issues;
}
