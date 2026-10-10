import { z } from "zod";
import { PlanSchema } from "./plan.js";
import { BriefSchema, EditSchema } from "./schema.js";

const BASE_URL = "https://github.com/Hirusha-Nikson/motion-brief/schemas";

/** JSON Schema (draft 2020-12) for a complete `motion-brief/v1` block. Bundled into the skill. */
export function briefJsonSchema(): Record<string, unknown> {
  return {
    $id: `${BASE_URL}/motion-brief.v1.json`,
    title: "motion-brief/v1",
    description:
      "A complete MotionBrief video brief. Cross-field rules (unique scene ids, text within maxChars, canvas matching the platform, a usable safe zone) are enforced by @motionbrief/brief and listed in the skill's refs.",
    ...z.toJSONSchema(BriefSchema, { target: "draft-2020-12", io: "output" }),
  };
}

/** JSON Schema (draft 2020-12) for a `motion-plan/v1` file read by the MP4 renderer. */
export function planJsonSchema(): Record<string, unknown> {
  return {
    $id: `${BASE_URL}/motion-plan.v1.json`,
    title: "motion-plan/v1",
    description:
      "The confirmed script and scene plan for a MotionBrief video, read by scripts/render_video.py together with the brief.",
    ...z.toJSONSchema(PlanSchema, { target: "draft-2020-12", io: "input" }),
  };
}

/** JSON Schema (draft 2020-12) for a `motion-edit/v1` block. */
export function editJsonSchema(): Record<string, unknown> {
  return {
    $id: `${BASE_URL}/motion-edit.v1.json`,
    title: "motion-edit/v1",
    description:
      "An edit to a MotionBrief brief: an RFC 6902 JSON Patch over the brief without estimate and hash.",
    ...z.toJSONSchema(EditSchema, { target: "draft-2020-12", io: "output" }),
  };
}
