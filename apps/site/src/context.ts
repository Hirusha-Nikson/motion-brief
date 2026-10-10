import type { BriefContent, BriefIssue } from "@motionbrief/brief";
import { createContext, useContext, type Dispatch } from "react";
import type { Measure } from "./layout/measure.js";
import type { Action, AppState, StepId } from "./state/draft.js";
import type { Validation } from "./validate.js";

export interface Builder {
  state: AppState;
  dispatch: Dispatch<Action>;
  validation: Validation;
  /** Shorthand for an `update` action. */
  update: (recipe: (draft: BriefContent) => void) => void;
  /** Text measurement for the style preview. */
  measure: Measure;
  /** Bumps when fonts finish loading, so the preview re-measures. */
  fontsVersion: number;
}

export const BuilderContext = createContext<Builder | null>(null);

export function useBuilder(): Builder {
  const builder = useContext(BuilderContext);
  if (!builder) throw new Error("useBuilder must be used inside BuilderContext");
  return builder;
}

/** Which builder step holds the field an issue points at. */
export function stepForIssue(issue: Pick<BriefIssue, "path" | "check">): StepId {
  const path = issue.path ?? "";
  if (/^\/(topic|contentMode|audience)/.test(path)) return "idea";
  if (/^\/(platform|canvas|safeZone|durationSec)/.test(path)) return "platform";
  if (path.startsWith("/theme") || issue.check === "font") return "theme";
  if (/^\/(scenes|sceneMode|notes|icons)/.test(path)) return "plan";
  if (/^\/(voiceover|captions|music)/.test(path)) return "audio";
  return "review";
}
