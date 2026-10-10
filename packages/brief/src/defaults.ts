import { estimate } from "./estimate.js";
import { computeBriefHash } from "./hash.js";
import {
  CUSTOM_WHERE_IT_PLAYS,
  PLATFORM_PRESETS,
  percentSafeZone,
  type PresetPlatform,
} from "./presets.js";
import { fail, formatIssues, ok, type Result } from "./result.js";
import {
  BRIEF_SCHEMA_ID,
  BriefContentSchema,
  BriefInputSchema,
  type Brief,
  type BriefContent,
  type MotionStyle,
  type Scene,
  type SceneType,
  type TextItem,
} from "./schema.js";
import { MOTION_STYLES, SCENE_TYPE_INFO, TEXT_ROLE_MAX_CHARS, defaultRole } from "./styles.js";
import { round1, suggestSceneDuration } from "./timing.js";

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

type TextInput = string | { role?: TextItem["role"]; text: string; maxChars?: number };

function normalizeText(item: TextInput, type: SceneType, index: number): TextItem {
  const t = typeof item === "string" ? { text: item } : item;
  const role = t.role ?? defaultRole(type, index);
  return { role, text: t.text, maxChars: t.maxChars ?? TEXT_ROLE_MAX_CHARS[role] };
}

function defaultHook(first: Scene, style: MotionStyle): string {
  const text = first.onScreenText[0]?.text;
  const what = text ? `"${text}"` : `the opening message (${first.goal})`;
  return `Get ${what} on screen within 0.5 s with a bold ${style} entrance and keep it moving through 1.5 s.`;
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

/**
 * Turn a minimal brief (platform + scenes) into a complete, validated one.
 * Fields the input sets are kept; everything else gets a default.
 */
export function expandBrief(input: unknown, options: ExpandOptions = {}): Result<Brief> {
  const parsed = BriefInputSchema.safeParse(input);
  if (!parsed.success) return fail(formatIssues(parsed.error.issues));
  const b = parsed.data;

  let canvas = b.canvas;
  let safeZone = b.safeZone;
  let whereItPlays = b.whereItPlays;
  if (b.platform === "custom") {
    if (!canvas) return fail([`canvas: required when platform is "custom" (width, height, fps)`]);
    safeZone ??= percentSafeZone(canvas);
    whereItPlays ??= CUSTOM_WHERE_IT_PLAYS;
  } else {
    const preset = PLATFORM_PRESETS[b.platform as PresetPlatform];
    canvas ??= { ...preset.canvas };
    safeZone ??= { ...preset.safeZone };
    whereItPlays ??= preset.whereItPlays;
  }

  const style = b.theme.motionStyle;
  const taken = new Set(b.scenes.flatMap((s) => (s.id ? [s.id] : [])));
  let next = 1;
  const scenes: Scene[] = b.scenes.map((s, i) => {
    let id = s.id;
    if (!id) {
      while (taken.has(`s${next}`)) next++;
      id = `s${next++}`;
      taken.add(id);
    }
    const onScreenText = s.onScreenText.map((t, j) => normalizeText(t, s.type, j));
    const scene: Scene = {
      id,
      type: s.type,
      goal: s.goal ?? SCENE_TYPE_INFO[s.type].defaultGoal,
      durationSec:
        s.durationSec ?? suggestSceneDuration({ ...s, onScreenText }, b.rules, b.voiceover),
      onScreenText,
      icons: s.icons,
      images: s.images,
      transitionIn: s.transitionIn ?? (i === 0 ? "cut" : MOTION_STYLES[style].defaultTransition),
    };
    if (s.voText !== undefined) scene.voText = s.voText;
    return scene;
  });

  // Captions follow the voice-over unless the input says otherwise.
  const rawCaptions = isRecord(input) && isRecord(input.captions) ? input.captions : {};
  const captions = {
    ...b.captions,
    enabled: typeof rawCaptions.enabled === "boolean" ? b.captions.enabled : b.voiceover.enabled,
  };

  const first = scenes[0];
  if (!first) return fail(["scenes: at least one scene is required"]);

  const content: BriefContent = {
    schema: BRIEF_SCHEMA_ID,
    id: b.id ?? (options.newId ?? defaultId)(),
    createdAt: b.createdAt ?? (options.now?.() ?? new Date()).toISOString(),
    audience: b.audience,
    purpose: b.purpose,
    whereItPlays,
    platform: b.platform,
    canvas,
    safeZone,
    durationSec: b.durationSec ?? round1(scenes.reduce((sum, s) => sum + s.durationSec, 0)),
    theme: b.theme,
    hook: b.hook ?? defaultHook(first, style),
    scenes,
    voiceover: b.voiceover,
    captions,
    music: b.music,
    rules: b.rules,
  };
  return finalizeBrief(content);
}
