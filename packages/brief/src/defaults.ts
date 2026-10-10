import { estimate } from "./estimate.js";
import { computeBriefHash } from "./hash.js";
import { PLATFORM_PRESETS, percentSafeZone, type PresetPlatform } from "./presets.js";
import { fail, formatIssues, ok, type Result } from "./result.js";
import {
  BRIEF_SCHEMA_ID,
  BriefContentSchema,
  BriefInputSchema,
  type Brief,
  type BriefContent,
  type SceneIdea,
} from "./schema.js";

export interface ExpandOptions {
  /** Clock for `createdAt`. */
  now?: () => Date;
  /** Id generator for `id`. */
  newId?: () => string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function defaultId(): string {
  return `mb-${globalThis.crypto.randomUUID()}`;
}

/** Validate brief content, then add the derived `estimate` and `hash`. */
export function finalizeBrief(content: unknown): Result<Brief> {
  const parsed = BriefContentSchema.safeParse(content);
  if (!parsed.success) return fail(formatIssues(parsed.error.issues));
  const withEstimate = { ...parsed.data, estimate: estimate(parsed.data) };
  return ok({ ...withEstimate, hash: computeBriefHash(withEstimate) });
}

/** Brief without the derived fields: the part edits patch. */
export function briefContent(brief: Brief | BriefContent): BriefContent {
  const { estimate: _e, hash: _h, ...content } = brief as Brief;
  return content;
}

/** The next free `s<n>` scene id. */
export function nextSceneId(taken: Iterable<string>): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`s${n}`)) n++;
  return `s${n}`;
}

/**
 * Turn a minimal brief (topic + platform) into a complete, validated one.
 * Fields the input sets are kept; everything else gets a default.
 */
export function expandBrief(input: unknown, options: ExpandOptions = {}): Result<Brief> {
  const parsed = BriefInputSchema.safeParse(input);
  if (!parsed.success) return fail(formatIssues(parsed.error.issues));
  const b = parsed.data;

  let canvas = b.canvas;
  let safeZone = b.safeZone;
  if (b.platform === "custom") {
    if (!canvas) return fail([`canvas: required when platform is "custom" (width, height, fps)`]);
    safeZone ??= percentSafeZone(canvas);
  } else {
    const preset = PLATFORM_PRESETS[b.platform as PresetPlatform];
    canvas ??= { ...preset.canvas };
    safeZone ??= { ...preset.safeZone };
  }

  const taken = b.scenes.flatMap((s) => (typeof s === "object" && s.id ? [s.id] : []));
  const scenes: SceneIdea[] = b.scenes.map((s) => {
    const idea = typeof s === "string" ? { idea: s } : s;
    const id = idea.id ?? nextSceneId(taken);
    taken.push(id);
    return { ...idea, id };
  });

  // Captions follow the voice-over unless the input says otherwise.
  const rawCaptions = isRecord(input) && isRecord(input.captions) ? input.captions : {};
  const captions = {
    ...b.captions,
    enabled: typeof rawCaptions.enabled === "boolean" ? b.captions.enabled : b.voiceover.enabled,
  };
  // An outline given without a mode means the user wants it followed.
  const rawMode = isRecord(input) ? input.sceneMode : undefined;
  const sceneMode = rawMode === undefined && scenes.length ? "manual" : b.sceneMode;

  const content: BriefContent = {
    schema: BRIEF_SCHEMA_ID,
    id: b.id ?? (options.newId ?? defaultId)(),
    createdAt: b.createdAt ?? (options.now?.() ?? new Date()).toISOString(),
    topic: b.topic,
    contentMode: b.contentMode,
    audience: b.audience,
    platform: b.platform,
    canvas,
    safeZone,
    durationSec: b.durationSec,
    theme: b.theme,
    sceneMode,
    scenes,
    notes: b.notes,
    icons: b.icons,
    voiceover: b.voiceover,
    captions,
    music: b.music,
    rules: b.rules,
  };
  return finalizeBrief(content);
}
