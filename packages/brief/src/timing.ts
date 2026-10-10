import type { Rules, Scene, Voiceover } from "./schema.js";
import { SCENE_TYPE_INFO } from "./styles.js";

/** Time for entrance and settle before text can be read. */
export const ENTRANCE_ALLOWANCE_SEC = 1;
/** Breathing room after the voice-over ends. */
export const VO_TAIL_SEC = 0.6;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundUpToHalf(n: number): number {
  return Math.ceil(n * 2 - 1e-9) / 2;
}

/** Seconds needed to read `text` at the brief's reading speed. */
export function readingTimeSec(text: string, rules: Pick<Rules, "readingWordsPerSec">): number {
  return countWords(text) / rules.readingWordsPerSec;
}

/** Seconds of speech for `text` at the voice-over's words per minute. */
export function voDurationSec(text: string, voiceover: Pick<Voiceover, "wordsPerMinute">): number {
  return (countWords(text) * 60) / voiceover.wordsPerMinute;
}

/** Shortest comfortable scene length: type default, reading time, voice-over length. */
export function suggestSceneDuration(
  scene: Pick<Scene, "type" | "onScreenText" | "voText">,
  rules: Pick<Rules, "readingWordsPerSec">,
  voiceover: Pick<Voiceover, "enabled" | "wordsPerMinute">,
): number {
  const text = scene.onScreenText.map((t) => t.text).join(" ");
  const reading = readingTimeSec(text, rules) + ENTRANCE_ALLOWANCE_SEC;
  const vo =
    voiceover.enabled && scene.voText ? voDurationSec(scene.voText, voiceover) + VO_TAIL_SEC : 0;
  const base = SCENE_TYPE_INFO[scene.type].defaultDurationSec;
  return Math.min(120, roundUpToHalf(Math.max(base, reading, vo)));
}

/** Start and end time of each scene, in seconds. */
export function sceneTimeline(scenes: readonly Pick<Scene, "id" | "durationSec">[]) {
  let t = 0;
  return scenes.map((scene) => {
    const start = t;
    t = round1(t + scene.durationSec);
    return { id: scene.id, start, end: t };
  });
}

/** 75.25 → "1:15.3" */
export function formatTimestamp(sec: number): string {
  const tenths = Math.round(sec * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths - minutes * 600) / 10;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}
