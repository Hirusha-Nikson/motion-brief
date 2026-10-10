import { applyPatch, type Operation } from "rfc6902";
import { briefContent, expandBrief } from "./defaults.js";
import { createEdit } from "./patch.js";
import { compileBriefPrompt, compileEditPrompt } from "./prompt.js";
import { fail, ok, type Result } from "./result.js";
import type { Brief, BriefInput, MotionEdit } from "./schema.js";

/** `examples/<name>/source.json`: a hand-written brief plus one edit to it. */
export interface ExampleSource {
  description: string;
  /** Minimal or partial brief; must set `id` and `createdAt` so output is reproducible. */
  brief: BriefInput;
  edit: {
    description: string;
    /** JSON Patch over the expanded brief (without estimate and hash). */
    ops: Operation[];
  };
}

export interface ExampleOutput {
  brief: Brief;
  prompt: string;
  edit: MotionEdit;
  editPrompt: string;
}

/** Expand an example, apply its edit and compile both prompts. Pure and deterministic. */
export function buildExample(source: ExampleSource): Result<ExampleOutput> {
  if (!source.brief.id || !source.brief.createdAt) {
    return fail(["Example briefs must set id and createdAt so the output is reproducible."]);
  }
  const expanded = expandBrief(source.brief);
  if (!expanded.ok) return fail(expanded.errors.map((e) => `brief: ${e}`));
  const brief = expanded.value;

  const edited = structuredClone(briefContent(brief));
  const failed = applyPatch(edited, source.edit.ops).findIndex((r) => r !== null);
  if (failed !== -1) return fail([`edit.ops[${failed}] does not apply to the expanded brief`]);
  const edit = createEdit(brief, edited);
  if (!edit.ok) return fail(edit.errors.map((e) => `edit: ${e}`));

  return ok({
    brief,
    prompt: compileBriefPrompt(brief),
    edit: edit.value,
    editPrompt: compileEditPrompt(edit.value, brief),
  });
}

/** Files written to `examples/<name>/`, keyed by file name. */
export function exampleFiles(output: ExampleOutput): Record<string, string> {
  return {
    "brief.json": `${JSON.stringify(output.brief, null, 2)}\n`,
    "prompt.md": output.prompt,
    "edit.json": `${JSON.stringify(output.edit, null, 2)}\n`,
    "edit-prompt.md": output.editPrompt,
  };
}
