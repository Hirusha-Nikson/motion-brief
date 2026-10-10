import type { Measure } from "./measure.js";

import { LINE_HEIGHT } from "@motionbrief/brief";

export { LINE_HEIGHT };

export type FitProblem = "word-too-wide" | "too-many-lines" | "too-tall";

export interface FitResult {
  size: number;
  lines: string[];
  fits: boolean;
  problem?: FitProblem;
}

export interface FitOptions {
  family: string;
  weight: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  measure: Measure;
}

/** Greedy word wrap. Never breaks inside a word; reports a word wider than the box. */
export function wrapText(
  text: string,
  width: number,
  font: { family: string; weight: number; size: number },
  measure: Measure,
): { lines: string[]; wordTooWide: boolean } {
  const lines: string[] = [];
  let wordTooWide = false;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (measure(word, font) > width) wordTooWide = true;
      const candidate = line ? `${line} ${word}` : word;
      if (!line || measure(candidate, font) <= width) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return { lines, wordTooWide };
}

/**
 * Shrink from `maxSize` towards `minSize` until the text wraps into the box within
 * `maxLines`. Never goes below `minSize`; reports why it doesn't fit there.
 */
export function fitText(text: string, box: { w: number; h: number }, o: FitOptions): FitResult {
  const minSize = Math.max(1, Math.floor(o.minSize));
  let size = Math.max(minSize, Math.floor(o.maxSize));
  for (;;) {
    const font = { family: o.family, weight: o.weight, size };
    const { lines, wordTooWide } = wrapText(text, box.w, font, o.measure);
    const tooMany = lines.length > o.maxLines;
    const tooTall = lines.length * size * LINE_HEIGHT > box.h;
    if (!wordTooWide && !tooMany && !tooTall) return { size, lines, fits: true };
    if (size <= minSize) {
      const problem: FitProblem = wordTooWide
        ? "word-too-wide"
        : tooMany
          ? "too-many-lines"
          : "too-tall";
      return { size, lines, fits: false, problem };
    }
    size = Math.max(minSize, Math.min(size - 1, Math.floor(size * 0.94)));
  }
}
