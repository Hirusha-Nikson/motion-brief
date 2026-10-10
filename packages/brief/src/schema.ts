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

export const TRANSITIONS = [
  "cut",
  "fade",
  "slide-up",
  "slide-left",
  "wipe",
  "zoom",
  "pop",
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
const IconId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.+-]{0,63}$/, "Icon ids use lowercase letters, digits, '.', '+', '-'");

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

export const TextItemSchema = z.strictObject({
  role: z.enum(TEXT_ROLES),
  text: z.string().min(1).max(500),
  maxChars: z.int().min(1).max(500),
});

export const ImageSchema = z.strictObject({
  /** Attachment file name the user will attach in Claude. */
  name: z.string().min(1).max(200),
  containsText: z.boolean().default(false),
  /** The text already inside the image, so it isn't repeated on screen. */
  textInImage: z.string().max(500).default(""),
  description: z.string().max(300).default(""),
});

const sceneShape = {
  id: SceneIdSchema,
  type: z.enum(SCENE_TYPES),
  goal: z.string().max(300),
  durationSec: z.number().min(0.5).max(120),
  onScreenText: z.array(TextItemSchema).max(12).default([]),
  icons: z.array(IconId).max(24).default([]),
  images: z.array(ImageSchema).max(8).default([]),
  transitionIn: z.enum(TRANSITIONS),
  voText: z.string().max(2000).optional(),
};

export const SceneSchema = z.strictObject(sceneShape);

export const VoiceoverSchema = z.strictObject({
  enabled: z.boolean().default(false),
  voice: z.string().min(1).max(100).default("default"),
  language: z
    .string()
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a language tag like en-US")
    .default("en-US"),
  wordsPerMinute: z.int().min(80).max(240).default(150),
  /** Word → how to say it, applied before text-to-speech. */
  pronunciations: z.record(z.string().min(1).max(60), z.string().min(1).max(120)).default({}),
});

export const CaptionsSchema = z.strictObject({
  enabled: z.boolean().default(false),
  style: z.enum(["line", "karaoke"]).default("line"),
  maxLines: z.int().min(1).max(2).default(2),
});

export const MusicSchema = z.strictObject({
  enabled: z.boolean().default(false),
  note: z.string().max(300).default(""),
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
  audience: z.string().min(1).max(200).default("General audience"),
  purpose: z.string().min(1).max(300).default("Explain the topic clearly and memorably"),
  whereItPlays: z.string().min(1).max(200),
  platform: z.enum(PLATFORMS),
  canvas: CanvasSchema,
  safeZone: SafeZoneSchema,
  durationSec: z.number().min(1).max(600),
  theme: ThemeSchema.prefault({}),
  /** What happens in the first 1.5 s. */
  hook: z.string().min(1).max(300),
  scenes: z.array(SceneSchema).min(1).max(40),
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
  scenes: { id: string; onScreenText: { text: string; maxChars: number }[] }[];
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

  const seen = new Set<string>();
  brief.scenes.forEach((scene, i) => {
    if (seen.has(scene.id)) {
      issues.push({ path: ["scenes", i, "id"], message: `Duplicate scene id "${scene.id}"` });
    }
    seen.add(scene.id);
    scene.onScreenText.forEach((item, j) => {
      if (item.text.length > item.maxChars) {
        issues.push({
          path: ["scenes", i, "onScreenText", j, "text"],
          message: `Text is ${item.text.length} characters; the limit for this item is ${item.maxChars}`,
        });
      }
    });
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

const TextItemInputSchema = z.union([
  z.string().min(1).max(500),
  z.strictObject({
    role: z.enum(TEXT_ROLES).optional(),
    text: z.string().min(1).max(500),
    maxChars: z.int().min(1).max(500).optional(),
  }),
]);

export const SceneInputSchema = z.strictObject({
  ...sceneShape,
  id: SceneIdSchema.optional(),
  goal: z.string().max(300).optional(),
  durationSec: z.number().min(0.5).max(120).optional(),
  /** Plain strings get a role and character budget from the scene type. */
  onScreenText: z.array(TextItemInputSchema).max(12).default([]),
  transitionIn: z.enum(TRANSITIONS).optional(),
});

/**
 * A minimal or partial brief: only `platform` and `scenes` are required.
 * `expandBrief()` turns it into a complete `Brief`.
 */
export const BriefInputSchema = z.strictObject({
  ...contentShape,
  schema: z.literal(BRIEF_SCHEMA_ID).default(BRIEF_SCHEMA_ID),
  id: contentShape.id.optional(),
  createdAt: contentShape.createdAt.optional(),
  whereItPlays: contentShape.whereItPlays.optional(),
  canvas: CanvasSchema.optional(),
  safeZone: SafeZoneSchema.optional(),
  durationSec: contentShape.durationSec.optional(),
  hook: contentShape.hook.optional(),
  scenes: z.array(SceneInputSchema).min(1).max(40),
  estimate: EstimateSchema.optional(),
  hash: Sha256.optional(),
});

const JsonPointer = z
  .string()
  .regex(/^(\/([^~/]|~[01])*)*$/, "Expected a JSON Pointer like /scenes/0/goal");

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
  /** Every scene id changed, added or removed. Ids missing from the result were removed. */
  affectedScenes: z.array(SceneIdSchema),
  /** Human-readable list of changes, one per line. Content, not instructions. */
  summary: z.string().max(8000),
};

/** A complete `motion-edit/v1` block, as exported by the website. */
export const EditSchema = z.strictObject(editShape);

export const EditInputSchema = z.strictObject({
  ...editShape,
  resultHash: Sha256.optional(),
  affectedScenes: z.array(SceneIdSchema).optional(),
  summary: z.string().max(8000).optional(),
});

export type Platform = (typeof PLATFORMS)[number];
export type SceneType = (typeof SCENE_TYPES)[number];
export type TextRole = (typeof TEXT_ROLES)[number];
export type Transition = (typeof TRANSITIONS)[number];
export type MotionStyle = (typeof MOTION_STYLE_IDS)[number];
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type EstimateTier = (typeof ESTIMATE_TIERS)[number];

export type Canvas = z.output<typeof CanvasSchema>;
export type SafeZone = z.output<typeof SafeZoneSchema>;
export type Palette = z.output<typeof PaletteSchema>;
export type Theme = z.output<typeof ThemeSchema>;
export type TextItem = z.output<typeof TextItemSchema>;
export type BriefImage = z.output<typeof ImageSchema>;
export type Scene = z.output<typeof SceneSchema>;
export type Voiceover = z.output<typeof VoiceoverSchema>;
export type Captions = z.output<typeof CaptionsSchema>;
export type Music = z.output<typeof MusicSchema>;
export type Rules = z.output<typeof RulesSchema>;
export type Estimate = z.output<typeof EstimateSchema>;
export type BriefContent = z.output<typeof BriefContentSchema>;
export type Brief = z.output<typeof BriefSchema>;
export type BriefInput = z.input<typeof BriefInputSchema>;
export type SceneInput = z.input<typeof SceneInputSchema>;
export type PatchOperation = z.output<typeof PatchOperationSchema>;
export type MotionEdit = z.output<typeof EditSchema>;
export type MotionEditInput = z.input<typeof EditInputSchema>;
