import {
  BriefDraftSchema,
  BriefSchema,
  PLATFORM_PRESETS,
  briefContent,
  expandBrief,
  nextSceneId,
  percentSafeZone,
  type BriefContent,
  type Platform,
  type Suggestion,
} from "@motionbrief/brief";

export const STEPS = [
  { id: "idea", label: "Idea" },
  { id: "platform", label: "Platform" },
  { id: "theme", label: "Theme" },
  { id: "plan", label: "Scenes & notes" },
  { id: "audio", label: "Audio" },
  { id: "review", label: "Review & export" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export interface AppState {
  draft: BriefContent;
  step: StepId;
  /** Ids of warnings the user accepted. */
  acknowledged: string[];
}

export type Action =
  | { type: "update"; recipe: (draft: BriefContent) => void }
  | { type: "load"; draft: BriefContent }
  | { type: "step"; step: StepId }
  | { type: "acknowledge"; id: string; on: boolean }
  | { type: "suggest"; suggestion: Suggestion };

/** A fresh draft: Reels, default theme, Claude plans everything. The topic starts empty. */
export function newDraft(): BriefContent {
  const result = expandBrief({ platform: "reels", topic: "-" });
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return { ...briefContent(result.value), topic: "" };
}

export function initialState(draft: BriefContent = newDraft()): AppState {
  return { draft, step: "idea", acknowledged: [] };
}

/** Accept a stored or shared brief: complete, an unfinished draft, or minimal. */
export function toDraft(value: unknown): BriefContent | null {
  const full = BriefSchema.safeParse(value);
  if (full.success) return briefContent(full.data);
  const draft = BriefDraftSchema.safeParse(value);
  if (draft.success) return draft.data;
  const expanded = expandBrief(value);
  return expanded.ok ? briefContent(expanded.value) : null;
}

function unescapeToken(t: string): string {
  return t.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Set the value at a JSON Pointer; ignores paths that don't exist. */
export function setAtPointer(doc: unknown, pointer: string, value: unknown): void {
  const tokens = pointer.split("/").slice(1).map(unescapeToken);
  const last = tokens.pop();
  if (last === undefined) return;
  let node: unknown = doc;
  for (const t of tokens) {
    if (node === null || typeof node !== "object") return;
    node = (node as Record<string, unknown>)[t];
  }
  if (node !== null && typeof node === "object") (node as Record<string, unknown>)[last] = value;
}

function withDraft(state: AppState, recipe: (d: BriefContent) => void): AppState {
  const draft = structuredClone(state.draft);
  recipe(draft);
  return { ...state, draft };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "update":
      return withDraft(state, action.recipe);
    case "load":
      return { ...initialState(action.draft), step: state.step };
    case "step":
      return { ...state, step: action.step };
    case "acknowledge": {
      const rest = state.acknowledged.filter((id) => id !== action.id);
      return { ...state, acknowledged: action.on ? [...rest, action.id] : rest };
    }
    case "suggest":
      return withDraft(state, (d) =>
        setAtPointer(d, action.suggestion.path, action.suggestion.value),
      );
  }
}

// ---- Draft edits shared by the step components ----

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function setPlatform(d: BriefContent, platform: Platform): void {
  d.platform = platform;
  if (platform === "custom") {
    d.safeZone = percentSafeZone(d.canvas);
    return;
  }
  const preset = PLATFORM_PRESETS[platform];
  d.canvas = { ...preset.canvas, fps: d.canvas.fps };
  d.safeZone = { ...preset.safeZone };
}

export function resetSafeZone(d: BriefContent): void {
  d.safeZone =
    d.platform === "custom"
      ? percentSafeZone(d.canvas)
      : { ...PLATFORM_PRESETS[d.platform].safeZone };
}

export function addSceneIdea(d: BriefContent): void {
  d.scenes.push({ id: nextSceneId(d.scenes.map((s) => s.id)), idea: "" });
}

export function moveItem<T>(list: T[], from: number, to: number): void {
  if (to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  if (item !== undefined) list.splice(to, 0, item);
}
