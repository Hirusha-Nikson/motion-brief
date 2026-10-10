import type { BriefContent, Estimate, EstimateTier, SceneType } from "./schema.js";
import { SCENE_TYPE_INFO } from "./styles.js";
import { round1, voDurationSec } from "./timing.js";

/**
 * All estimate weights in one place. The score only ranks briefs into tiers;
 * it is not a token count and must never be shown as one.
 */
export const ESTIMATE_WEIGHTS = {
  base: 1,
  perScene: 1,
  sceneType: {
    title: 0.5,
    "kinetic-text": 1.5,
    bullets: 1,
    stat: 1,
    chart: 2,
    "icon-grid": 1.5,
    "image-focus": 1,
    quote: 0.5,
    comparison: 1.5,
    cta: 0.5,
  } satisfies Record<SceneType, number>,
  perIcon: 0.25,
  perImage: 0.5,
  perTenSeconds: 0.5,
  voiceover: 2,
  captions: { line: 0.5, karaoke: 1.5 },
  /** Score at which each tier starts. */
  tiers: { medium: 10, heavy: 22 },
} as const;

export const LONG_VIDEO_SEC = 60;

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Deterministic usage estimate: a tier plus the reasons behind it. */
export function estimate(brief: BriefContent): Estimate {
  const w = ESTIMATE_WEIGHTS;
  const scenes = brief.scenes;
  const durationSec = round1(scenes.reduce((sum, s) => sum + s.durationSec, 0));
  const icons = scenes.reduce((sum, s) => sum + s.icons.length, 0);
  const images = scenes.reduce((sum, s) => sum + s.images.length, 0);
  const voText = brief.voiceover.enabled ? scenes.map((s) => s.voText ?? "").join(" ") : "";
  const voCharacters = brief.voiceover.enabled
    ? scenes.reduce((sum, s) => sum + (s.voText?.length ?? 0), 0)
    : 0;

  let score = w.base + scenes.length * w.perScene;
  for (const s of scenes) score += w.sceneType[s.type];
  score += icons * w.perIcon + images * w.perImage + (durationSec / 10) * w.perTenSeconds;
  if (voCharacters > 0) score += w.voiceover;
  if (brief.captions.enabled) score += w.captions[brief.captions.style];

  const tier: EstimateTier =
    score >= w.tiers.heavy ? "heavy" : score >= w.tiers.medium ? "medium" : "light";

  const notes = [`${plural(scenes.length, "scene")} over ${durationSec} s`];
  const byType = new Map<SceneType, number>();
  for (const s of scenes) byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
  for (const type of ["chart", "kinetic-text", "comparison", "icon-grid"] as const) {
    const n = byType.get(type);
    if (n) notes.push(`${plural(n, `${SCENE_TYPE_INFO[type].label.toLowerCase()} scene`)}`);
  }
  if (icons) notes.push(`${plural(icons, "icon")} to place`);
  if (images) notes.push(`${plural(images, "image")} to attach`);
  if (voCharacters) {
    const speech = round1(voDurationSec(voText, brief.voiceover));
    notes.push(
      `Voice-over: ${voCharacters} characters (~${speech} s of speech at ${brief.voiceover.wordsPerMinute} wpm)`,
    );
  }
  if (brief.captions.enabled) {
    notes.push(
      brief.captions.style === "karaoke"
        ? "Karaoke captions: word-by-word highlighting"
        : "Line captions",
    );
  }
  if (durationSec > LONG_VIDEO_SEC) notes.push(`Long video (over ${LONG_VIDEO_SEC} s)`);

  return { tier, scenes: scenes.length, durationSec, complexityNotes: notes, voCharacters };
}
