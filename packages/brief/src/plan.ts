import { z } from "zod";
import { SCENE_TYPES, SceneIdSchema, Sha256, TEXT_ROLES } from "./schema.js";

export const PLAN_SCHEMA_ID = "motion-plan/v1";

/** How a scene's elements enter. */
export const TRANSITIONS = [
  "cut",
  "fade",
  "slide-up",
  "slide-left",
  "wipe",
  "zoom",
  "pop",
] as const;

export const PlanTextSchema = z.strictObject({
  role: z.enum(TEXT_ROLES),
  text: z.string().min(1).max(300),
});

export const PlanSceneSchema = z.strictObject({
  id: SceneIdSchema,
  pattern: z.enum(SCENE_TYPES),
  /** Planned length. The renderer extends a scene to fit its spoken voice-over. */
  durationSec: z.number().min(1).max(120),
  /** On-screen text in layout order; the pattern decides where each item goes. */
  text: z.array(PlanTextSchema).max(8).default([]),
  /** Narration for this scene; empty when there's none. */
  voiceover: z.string().max(2000).default(""),
  /** dev-icons ids, rendered from `<icons dir>/<id>.png`. */
  icons: z.array(z.string().min(1).max(64)).max(12).default([]),
  /** File name of an image the user attached. */
  image: z.string().min(1).max(200).optional(),
  /** Count-up for a `stat` scene: shows prefix + value + suffix. */
  stat: z
    .strictObject({
      value: z.number(),
      prefix: z.string().max(8).default(""),
      suffix: z.string().max(12).default(""),
      decimals: z.int().min(0).max(3).default(0),
    })
    .optional(),
  /** Bars for a `chart` scene. */
  chart: z
    .strictObject({
      values: z.array(z.number().min(0)).min(1).max(8),
      labels: z.array(z.string().min(1).max(40)).max(8).default([]),
      /** Shown around each value above its bar, e.g. "$" and "%". */
      prefix: z.string().max(8).default(""),
      suffix: z.string().max(12).default(""),
    })
    .optional(),
  transition: z.enum(TRANSITIONS).default("fade"),
});

/**
 * `motion-plan/v1`: the script and scene plan the user confirmed, in the form the MP4
 * renderer (`scripts/render_video.py`) reads alongside the brief.
 */
export const PlanSchema = z.strictObject({
  schema: z.literal(PLAN_SCHEMA_ID),
  /** `hash` of the brief this plan was made from. */
  briefHash: Sha256,
  title: z.string().min(1).max(120),
  scenes: z.array(PlanSceneSchema).min(1).max(120),
});

export type Transition = (typeof TRANSITIONS)[number];
export type PlanScene = z.output<typeof PlanSceneSchema>;
export type MotionPlan = z.output<typeof PlanSchema>;
export type MotionPlanInput = z.input<typeof PlanSchema>;
