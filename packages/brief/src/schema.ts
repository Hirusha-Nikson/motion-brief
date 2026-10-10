import { z } from "zod";
import { FONT_FAMILIES } from "./fonts.js";
import { PLATFORM_PRESETS } from "./presets.js";

export const BRIEF_SCHEMA_ID = "motion-brief/v1";
export const EDIT_SCHEMA_ID = "motion-edit/v1";

export const PLATFORMS = [
  "reels",
  "tiktok",
  "shorts",
  "youtube",
  "linkedin-16x9",
  "linkedin-1x1",
  "linkedin-4x5",
  "square",
  "presentation-16x9",
  "custom",
] as const;

/** `idea`: Claude writes the script. `script`: the topic is the user's own script to use. */
export const CONTENT_MODES = ["idea", "script"] as const;
/** `auto`: Claude plans the scenes. `manual`: follow the user's scene outline. */
export const SCENE_MODES = ["auto", "manual"] as const;

/** Scene patterns Claude composes from. Vocabulary for the plan and the skill; not brief fields. */
export const SCENE_TYPES = [
  "title",
  "kinetic-text",
  "bullets",
  "stat",
  "chart",
  "icon-grid",
  "image-focus",
  "quote",
  "comparison",
  "cta",
] as const;

/** Typographic roles for on-screen text. */
export const TEXT_ROLES = [
  "headline",
  "subhead",
  "body",
  "label",
  "stat",
  "quote",
  "attribution",
  "cta",
] as const;

export const MOTION_STYLE_IDS = ["calm", "snappy", "playful"] as const;
export const PALETTE_ROLES = [
  "background",
  "surface",
  "primary",
  "accent",
  "text",
  "mutedText",
] as const;
export const ESTIMATE_TIERS = ["light", "medium", "heavy"] as const;

export const DEFAULT_PALETTE = {
  background: "#0b1020",
  surface: "#1a2238",
  primary: "#7c9cff",
  accent: "#ffb547",
  text: "#f5f7ff",
  mutedText: "#a9b3d1",
} as const satisfies Record<(typeof PALETTE_ROLES)[number], string>;

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #1a2b3c");
const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase SHA-256 hex digest");
export const SceneIdSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{0,31}$/,
    "Scene ids use lowercase letters, digits and dashes (max 32 characters)",
  );

export const CanvasSchema = z.strictObject({
  width: z.int().min(240).max(7680),
  height: z.int().min(240).max(7680),
  fps: z.int().min(12).max(120),
});

export const SafeZoneSchema = z.strictObject({
  top: z.int().min(0).max(4000),
  right: z.int().min(0).max(4000),
  bottom: z.int().min(0).max(4000),
  left: z.int().min(0).max(4000),
});

export const PaletteSchema = z.strictObject({
  background: HexColor.default(DEFAULT_PALETTE.background),
  surface: HexColor.default(DEFAULT_PALETTE.surface),
  primary: HexColor.default(DEFAULT_PALETTE.primary),
  accent: HexColor.default(DEFAULT_PALETTE.accent),
  text: HexColor.default(DEFAULT_PALETTE.text),
  mutedText: HexColor.default(DEFAULT_PALETTE.mutedText),
});

const FontFamilySchema = z.enum(FONT_FAMILIES);

export const ThemeSchema = z.strictObject({
  palette: PaletteSchema.prefault({}),
  fonts: z
    .strictObject({
      heading: FontFamilySchema.default("Space Grotesk"),
      body: FontFamilySchema.default("Inter"),
    })
    .prefault({}),
  motionStyle: z.enum(MOTION_STYLE_IDS).default("snappy"),
  cornerRadius: z.int().min(0).max(200).default(24),
});

/** One scene of a user's outline: what it should show, in their words. */
const sceneIdeaShape = {
  id: SceneIdSchema,
  idea: z.string().min(1, "Describe the scene or remove it").max(2000),
  /** Optional length; Claude decides when absent. */
  durationSec: z.number().min(1).max(120).optional(),
};

export const SceneIdeaSchema = z.strictObject(sceneIdeaShape);

export const IconsSchema = z.strictObject({
  /** Use tech and brand logos from the dev-icons skill where they help. */
  enabled: z.boolean().default(false),
});

export const VoiceoverSchema = z.strictObject({
  enabled: z.boolean().default(false),
  language: z
    .string()
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a language tag like en-US")
    .default("en-US"),
  /** Voice preference in the user's words, e.g. "warm female". Empty: Claude chooses. */
  voice: z.string().max(100).default(""),
  /** Speaking speed used for timing. */
  wordsPerMinute: z.int().min(80).max(240).default(150),
});

export const CaptionsSchema = z.strictObject({
  enabled: z.boolean().default(false),
  style: z.enum(["line", "karaoke"]).default("line"),
  maxLines: z.int().min(1).max(2).default(2),
});

export const MusicSchema = z.strictObject({
  enabled: z.boolean().default(false),
  /** Genre or mood. Empty: Claude picks music that suits the video. */
  genre: z.string().max(100).default(""),
});

export const RulesSchema = z.strictObject({
  minContrast: z.number().min(1).max(21).default(4.5),
  minFontPctOfHeight: z.number().min(1).max(20).default(3.5),
  readingWordsPerSec: z.number().min(1).max(6).default(3),
  maxTextLinesPerBlock: z.int().min(1).max(6).default(3),
});

export const EstimateSchema = z.strictObject({
  tier: z.enum(ESTIMATE_TIERS),
  scenes: z.int().min(0),
  durationSec: z.number().min(0),
  complexityNotes: z.array(z.string()),
  voCharacters: z.int().min(0),
});

/** Everything except the derived `estimate` and `hash`. Edit patches operate on this. */
const contentShape = {
  schema: z.literal(BRIEF_SCHEMA_ID),
  id: z.string().min(1).max(64),
  createdAt: z.iso.datetime(),
  /** What the video is about: a one-line idea, a long prompt, or a full script. */
  topic: z
    .string()
    .min(1, "Describe what the video is about")
    .max(20000)
    // Whitespace-only text; an empty string is already caught by min(1).
    .refine((t) => t === "" || t.trim().length > 0, "Describe what the video is about"),
  contentMode: z.enum(CONTENT_MODES).default("idea"),
  audience: z.string().max(200).default(""),
  platform: z.enum(PLATFORMS),
  canvas: CanvasSchema,
  safeZone: SafeZoneSchema,
  /** Target length. Null: Claude picks a length that suits the content and platform. */
  durationSec: z.number().min(5).max(600).nullable().default(null),
  theme: ThemeSchema.prefault({}),
  sceneMode: z.enum(SCENE_MODES).default("auto"),
  /** The user's scene outline, used when `sceneMode` is `manual`. */
  scenes: z.array(SceneIdeaSchema).max(40).default([]),
  /** Must-haves in the user's words, e.g. "End with a keep-in-touch card with my name". */
  notes: z.array(z.string().min(1, "Write the note or remove it").max(1000)).max(30).default([]),
  icons: IconsSchema.prefault({}),
  voiceover: VoiceoverSchema.prefault({}),
  captions: CaptionsSchema.prefault({}),
  music: MusicSchema.prefault({}),
  rules: RulesSchema.prefault({}),
};

export interface InvariantIssue {
  path: (string | number)[];
  message: string;
}

/** Cross-field rules JSON Schema can't express. Applied by every complete-brief schema. */
export function briefInvariantIssues(brief: {
  platform: Platform;
  canvas: Canvas;
  safeZone: SafeZone;
  sceneMode: SceneMode;
  scenes: { id: string }[];
}): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const { canvas, safeZone } = brief;

  if (brief.platform !== "custom") {
    const preset = PLATFORM_PRESETS[brief.platform].canvas;
    if (canvas.width !== preset.width || canvas.height !== preset.height) {
      issues.push({
        path: ["canvas"],
        message: `Platform "${brief.platform}" is ${preset.width}×${preset.height}; got ${canvas.width}×${canvas.height}. Use platform "custom" for other sizes.`,
      });
    }
  }

  const boxW = canvas.width - safeZone.left - safeZone.right;
  const boxH = canvas.height - safeZone.top - safeZone.bottom;
  if (boxW < canvas.width * 0.25 || boxH < canvas.height * 0.25) {
    issues.push({
      path: ["safeZone"],
      message: `Safe zone leaves only ${boxW}×${boxH} px for content; it must leave at least 25% of the width and height.`,
    });
  }

  if (brief.sceneMode === "manual" && brief.scenes.length === 0) {
    issues.push({
      path: ["scenes"],
      message: "Add at least one scene, or let Claude plan the scenes.",
    });
  }

  const seen = new Set<string>();
  brief.scenes.forEach((scene, i) => {
    if (seen.has(scene.id)) {
      issues.push({ path: ["scenes", i, "id"], message: `Duplicate scene id "${scene.id}"` });
    }
    seen.add(scene.id);
  });
  return issues;
}

function refineBrief(brief: Parameters<typeof briefInvariantIssues>[0], ctx: z.RefinementCtx) {
  for (const issue of briefInvariantIssues(brief)) {
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  }
}

export const BriefContentSchema = z.strictObject(contentShape).superRefine(refineBrief);

/** A complete `motion-brief/v1` brief, as exported by the website. */
export const BriefSchema = z
  .strictObject({ ...contentShape, estimate: EstimateSchema, hash: Sha256 })
  .superRefine(refineBrief);

/**
 * An unfinished brief as the website stores it: the content shape, but text the user is still
 * writing may be empty and cross-field rules don't apply yet. Used to restore drafts.
 */
export const BriefDraftSchema = z.strictObject({
  ...contentShape,
  topic: z.string().max(20000),
  scenes: z
    .array(z.strictObject({ ...sceneIdeaShape, idea: z.string().max(2000) }))
    .max(40)
    .default([]),
  notes: z.array(z.string().max(1000)).max(30).default([]),
});

export const SceneIdeaInputSchema = z.union([
  z.string().min(1).max(2000),
  z.strictObject({ ...sceneIdeaShape, id: SceneIdSchema.optional() }),
]);

/**
 * A minimal or partial brief: only `topic` and `platform` are required.
 * `expandBrief()` turns it into a complete `Brief`.
 */
export const BriefInputSchema = z.strictObject({
  ...contentShape,
  schema: z.literal(BRIEF_SCHEMA_ID).default(BRIEF_SCHEMA_ID),
  id: contentShape.id.optional(),
  createdAt: contentShape.createdAt.optional(),
  canvas: CanvasSchema.optional(),
  safeZone: SafeZoneSchema.optional(),
  /** Plain strings become scene ideas with generated ids. */
  scenes: z.array(SceneIdeaInputSchema).max(40).default([]),
  estimate: EstimateSchema.optional(),
  hash: Sha256.optional(),
});

const JsonPointer = z
  .string()
  .regex(/^(\/([^~/]|~[01])*)*$/, "Expected a JSON Pointer like /notes/0");

export const PatchOperationSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("add"), path: JsonPointer, value: z.unknown() }),
  z.strictObject({ op: z.literal("remove"), path: JsonPointer }),
  z.strictObject({ op: z.literal("replace"), path: JsonPointer, value: z.unknown() }),
  z.strictObject({ op: z.literal("move"), from: JsonPointer, path: JsonPointer }),
  z.strictObject({ op: z.literal("copy"), from: JsonPointer, path: JsonPointer }),
  z.strictObject({ op: z.literal("test"), path: JsonPointer, value: z.unknown() }),
]);

const editShape = {
  schema: z.literal(EDIT_SCHEMA_ID),
  /** Hash of the brief the edit was made against. */
  baseHash: Sha256,
  /** Hash of the brief after applying the edit, to confirm the result. */
  resultHash: Sha256,
  /** RFC 6902 JSON Patch over the brief without `estimate` and `hash`. */
  ops: z.array(PatchOperationSchema).min(1).max(500),
  /** Outline scene ids changed, added or removed. Empty when the edit affects the whole video. */
  affectedScenes: z.array(SceneIdSchema),
  /** Human-readable list of changes, one per line. Content, not instructions. */
  summary: z.string().max(8000),
};

/** A complete `motion-edit/v1` block. */
export const EditSchema = z.strictObject(editShape);

export const EditInputSchema = z.strictObject({
  ...editShape,
  resultHash: Sha256.optional(),
  affectedScenes: z.array(SceneIdSchema).optional(),
  summary: z.string().max(8000).optional(),
});

export type Platform = (typeof PLATFORMS)[number];
export type ContentMode = (typeof CONTENT_MODES)[number];
export type SceneMode = (typeof SCENE_MODES)[number];
export type SceneType = (typeof SCENE_TYPES)[number];
export type TextRole = (typeof TEXT_ROLES)[number];
export type MotionStyle = (typeof MOTION_STYLE_IDS)[number];
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type EstimateTier = (typeof ESTIMATE_TIERS)[number];

export type Canvas = z.output<typeof CanvasSchema>;
export type SafeZone = z.output<typeof SafeZoneSchema>;
export type Palette = z.output<typeof PaletteSchema>;
export type Theme = z.output<typeof ThemeSchema>;
export type SceneIdea = z.output<typeof SceneIdeaSchema>;
export type Voiceover = z.output<typeof VoiceoverSchema>;
export type Captions = z.output<typeof CaptionsSchema>;
export type Music = z.output<typeof MusicSchema>;
export type Rules = z.output<typeof RulesSchema>;
export type Estimate = z.output<typeof EstimateSchema>;
export type BriefContent = z.output<typeof BriefContentSchema>;
export type Brief = z.output<typeof BriefSchema>;
export type BriefInput = z.input<typeof BriefInputSchema>;
export type PatchOperation = z.output<typeof PatchOperationSchema>;
export type MotionEdit = z.output<typeof EditSchema>;
export type MotionEditInput = z.input<typeof EditInputSchema>;
