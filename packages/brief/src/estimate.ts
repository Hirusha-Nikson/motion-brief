import { TYPICAL_LENGTH_SEC } from "./presets.js";
import type { BriefContent, Estimate, EstimateTier } from "./schema.js";
import { round1 } from "./timing.js";

/**
 * All estimate weights in one place. The score only ranks briefs into tiers;
 * it is not a token count and must never be shown as one.
 */
export const ESTIMATE_WEIGHTS = {
  base: 1,
  perScene: 2,
  perTenSeconds: 0.5,
  /** When Claude plans the scenes: about one scene per this many seconds. */
  secondsPerAutoScene: 6,
  perThousandTopicChars: 0.5,
  perNote: 0.4,
  voiceover: 2,
  captions: { line: 0.5, karaoke: 1.5 },
  music: 0.5,
  icons: 1,
  /** Score at which each tier starts. */
  tiers: { medium: 12, heavy: 24 },
} as const;

/** Rough characters of narration per second when Claude writes the script. */
export const VO_CHARS_PER_SEC = 15;
export const LONG_VIDEO_SEC = 90;

/** Plain-English meaning of each tier, shown on the site and by the skill. */
export const TIER_EXPLANATIONS: Record<EstimateTier, string> = {
  light: "A quick build: a short video with simple motion. Fine on any plan.",
  medium:
    "A typical build: several scenes, some data or voice-over. Uses a noticeable share of a session's usage.",
  heavy:
    "A big build: long runtime, many scenes or lots of extras. Claude will ask you to confirm before starting; consider a shorter cut.",
};

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Length used for estimating: the target, or the middle of the platform's usual range. */
export function plannedLength(brief: Pick<BriefContent, "durationSec" | "platform">): number {
  if (brief.durationSec !== null) return brief.durationSec;
  const [min, max] = TYPICAL_LENGTH_SEC[brief.platform];
  return Math.round((min + max) / 2);
}

/** Deterministic usage estimate: a tier plus the reasons behind it. */
export function estimate(brief: BriefContent): Estimate {
  const w = ESTIMATE_WEIGHTS;
  const durationSec = plannedLength(brief);
  const manual = brief.sceneMode === "manual" && brief.scenes.length > 0;
  const scenes = manual
    ? brief.scenes.length
    : Math.max(3, Math.round(durationSec / w.secondsPerAutoScene));
  const vo = brief.voiceover.enabled;
  const voCharacters = !vo
    ? 0
    : brief.contentMode === "script"
      ? brief.topic.length
      : Math.round(durationSec * VO_CHARS_PER_SEC);

  let score = w.base + scenes * w.perScene + (durationSec / 10) * w.perTenSeconds;
  score += (brief.topic.length / 1000) * w.perThousandTopicChars + brief.notes.length * w.perNote;
  if (vo) score += w.voiceover;
  if (brief.captions.enabled) score += w.captions[brief.captions.style];
  if (brief.music.enabled) score += w.music;
  if (brief.icons.enabled) score += w.icons;

  const tier: EstimateTier =
    score >= w.tiers.heavy ? "heavy" : score >= w.tiers.medium ? "medium" : "light";

  const notes = [
    manual
      ? `${plural(scenes, "scene")} from your outline`
      : `About ${plural(scenes, "scene")}, planned by Claude`,
    brief.durationSec === null
      ? `Length chosen by Claude (estimated at ${durationSec} s)`
      : `${round1(durationSec)} s long`,
  ];
  if (brief.notes.length) notes.push(`${plural(brief.notes.length, "note")} to follow`);
  if (vo) {
    notes.push(
      brief.contentMode === "script"
        ? `Voice-over from your script: ${voCharacters} characters`
        : `Voice-over written by Claude: about ${voCharacters} characters`,
    );
  }
  if (brief.captions.enabled) {
    notes.push(brief.captions.style === "karaoke" ? "Karaoke captions" : "Line captions");
  }
  if (brief.music.enabled) notes.push("Background music");
  if (brief.icons.enabled) notes.push("Tech and brand icons");
  if (durationSec > LONG_VIDEO_SEC) notes.push(`Long video (over ${LONG_VIDEO_SEC} s)`);

  return { tier, scenes, durationSec, complexityNotes: notes, voCharacters };
}
