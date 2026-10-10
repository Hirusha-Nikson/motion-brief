import type { Voiceover } from "./schema.js";

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Seconds of speech for `text` at the voice-over's words per minute. */
export function voDurationSec(text: string, voiceover: Pick<Voiceover, "wordsPerMinute">): number {
  return (countWords(text) * 60) / voiceover.wordsPerMinute;
}
