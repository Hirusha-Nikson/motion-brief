import { canonicalJson, computeBriefHash } from "./hash.js";
import { estimate } from "./estimate.js";
import { briefContent } from "./defaults.js";
import { fail, formatIssues, ok, type Result } from "./result.js";
import {
  BRIEF_SCHEMA_ID,
  BriefSchema,
  EDIT_SCHEMA_ID,
  EditSchema,
  type Brief,
  type MotionEdit,
} from "./schema.js";

export const BRIEF_FENCE = "motion-brief";
export const EDIT_FENCE = "motion-edit";

const SITE_HINT = "Copy it again from the MotionBrief website and paste it unchanged.";

function fence(lang: string, value: unknown): string {
  return `\`\`\`${lang}\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

export function serializeBriefBlock(brief: Brief): string {
  return fence(BRIEF_FENCE, brief);
}

export function serializeEditBlock(edit: MotionEdit): string {
  return fence(EDIT_FENCE, edit);
}

/**
 * Bodies of every fenced code block tagged `lang` in `text` (``` or ~~~ fences,
 * indented up to 3 spaces). An unclosed fence runs to the end of the text.
 */
export function extractFencedBlocks(text: string, lang: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/.exec(lines[i] ?? "");
    if (!open?.[1]) continue;
    const marker = open[1];
    const close = new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}[ \\t]*$`);
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j] ?? "")) body.push(lines[j++] ?? "");
    if (open[2] === lang) blocks.push(body.join("\n"));
    i = j;
  }
  return blocks;
}

type Located = { ok: true; json: unknown } | { ok: false; error: string };

function locateJson(text: string, lang: string, schemaId: string): Located {
  const blocks = extractFencedBlocks(text, lang);
  let body: string;
  if (blocks.length > 1) {
    return { ok: false, error: `Found ${blocks.length} \`${lang}\` blocks. Paste only one.` };
  } else if (blocks[0] !== undefined) {
    body = blocks[0];
  } else if (text.trim().startsWith("{")) {
    body = text; // a bare brief.json / edit.json
  } else {
    return {
      ok: false,
      error: `No \`\`\`${lang} block found. ${SITE_HINT}`,
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `The ${lang} block isn't valid JSON (${reason}). It may be cut off or edited. ${SITE_HINT}`,
    };
  }
  const schema = (json as { schema?: unknown } | null)?.schema;
  if (schema !== schemaId) {
    return {
      ok: false,
      error: `Unsupported schema ${JSON.stringify(schema ?? null)}; expected "${schemaId}".`,
    };
  }
  return { ok: true, json };
}

/**
 * Find and validate a `motion-brief` block in pasted text (or a bare brief.json).
 * A hash or estimate that doesn't match the content is a warning, not an error.
 */
export function parseBriefBlock(text: string): Result<Brief> {
  const located = locateJson(text, BRIEF_FENCE, BRIEF_SCHEMA_ID);
  if (!located.ok) return fail([located.error]);
  const parsed = BriefSchema.safeParse(located.json);
  if (!parsed.success) {
    return fail([
      ...formatIssues(parsed.error.issues),
      "Fix these on the MotionBrief website and copy the prompt again.",
    ]);
  }
  const brief = parsed.data;
  const warnings: string[] = [];
  if (computeBriefHash(brief) !== brief.hash) {
    warnings.push(
      "The brief's hash doesn't match its content, so it was changed after export. Edits made against it may not apply.",
    );
  }
  if (canonicalJson(estimate(briefContent(brief))) !== canonicalJson(brief.estimate)) {
    warnings.push("The stored estimate differs from a fresh calculation.");
  }
  return ok(brief, warnings);
}

/** Find and validate a `motion-edit` block in pasted text (or a bare edit.json). */
export function parseEditBlock(text: string): Result<MotionEdit> {
  const located = locateJson(text, EDIT_FENCE, EDIT_SCHEMA_ID);
  if (!located.ok) return fail([located.error]);
  const parsed = EditSchema.safeParse(located.json);
  if (!parsed.success) return fail(formatIssues(parsed.error.issues));
  return ok(parsed.data);
}
