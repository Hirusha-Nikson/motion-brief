import { Pointer, applyPatch, createPatch, type Operation } from "rfc6902";
import { briefContent, finalizeBrief } from "./defaults.js";
import { computeBriefHash } from "./hash.js";
import { fail, formatIssues, ok, type Result } from "./result.js";
import {
  EDIT_SCHEMA_ID,
  EditInputSchema,
  type Brief,
  type BriefContent,
  type MotionEdit,
  type PatchOperation,
} from "./schema.js";

/** Edits may not touch identity or derived fields. */
export const PROTECTED_PATHS = ["/schema", "/id", "/createdAt", "/estimate", "/hash"] as const;

const REIMPORT_HINT =
  "Re-import the current brief on the MotionBrief website, redo the change, and copy a new edit.";

function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function get(doc: unknown, path: string): unknown {
  try {
    return Pointer.fromJSON(path).get(doc);
  } catch {
    return undefined;
  }
}

function sceneIds(doc: BriefContent): string[] {
  return Array.isArray(doc.scenes) ? doc.scenes.map((s) => s.id) : [];
}

const SCENE_PATH = /^\/scenes\/(\d+|-)(\/.*)?$/;

/**
 * Outline scene ids an edit changes, adds or removes, in the edited brief's order with removed
 * ids last. Any change outside a single outline scene (topic, notes, theme, ...) affects the
 * whole video, so every outline scene is listed.
 */
export function computeAffectedScenes(base: Brief | BriefContent, ops: readonly Operation[]) {
  const doc = clone(briefContent(base));
  const touched = new Set<string>();
  const seenIds = new Set(sceneIds(doc));
  let all = false;

  for (const op of ops) {
    const paths = "from" in op ? [op.from, op.path] : [op.path];
    const before = sceneIds(doc);
    const after = (): string[] => sceneIds(doc);
    const marks: Array<() => void> = [];

    for (const [k, path] of paths.entries()) {
      const m = SCENE_PATH.exec(path);
      if (!m) {
        all = true;
        continue;
      }
      const isTarget = k === paths.length - 1;
      const exact = m[2] === undefined;
      const insertion =
        isTarget && exact && (op.op === "add" || op.op === "move" || op.op === "copy");
      const removal = exact && (op.op === "remove" || (op.op === "move" && !isTarget));
      const index = m[1] === "-" ? -1 : Number(m[1]);
      if (!insertion && before[index]) touched.add(before[index]);
      if (!removal) {
        marks.push(() => {
          const ids = after();
          const id = index === -1 ? ids[ids.length - 1] : ids[index];
          if (id) touched.add(id);
        });
      }
    }
    applyPatch(doc, [op]);
    for (const mark of marks) mark();
    for (const id of sceneIds(doc)) seenIds.add(id);
  }

  const final = sceneIds(doc);
  const finalSet = new Set(final);
  if (all) for (const id of seenIds) touched.add(id);
  return [
    ...final.filter((id) => touched.has(id)),
    ...[...touched].filter((id) => !finalSet.has(id)),
  ];
}

function short(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v.length > 60 ? `${v.slice(0, 57)}...` : v);
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? "" : "s"}]`;
  if (v && typeof v === "object") {
    const { idea } = v as Record<string, unknown>;
    if (typeof idea === "string") return short(idea);
    return "{...}";
  }
  return JSON.stringify(v);
}

/** JSON Pointer tokens as "theme › palette › primary" or "onScreenText #2 › text". */
function readableTokens(tokens: readonly string[]): string {
  const parts: string[] = [];
  for (const t of tokens) {
    if (t === "-") parts.push(`${parts.pop() ?? ""} (new item)`);
    else if (/^\d+$/.test(t)) parts.push(`${parts.pop() ?? ""} #${Number(t) + 1}`);
    else parts.push(t);
  }
  return parts.join(" › ");
}

function label(path: string, doc: BriefContent): string {
  const tokens = Pointer.fromJSON(path).tokens.slice(1);
  if (tokens[0] === "scenes" && tokens[1] !== undefined) {
    const scene = tokens[1] === "-" ? undefined : doc.scenes[Number(tokens[1])];
    const rest = tokens.slice(2);
    const name = `Scene ${scene?.id ?? `#${Number(tokens[1]) + 1}`}`;
    return rest.length ? `${name} › ${readableTokens(rest)}` : name;
  }
  return readableTokens(tokens);
}

/** One plain-English line per operation. */
export function describeChanges(base: Brief | BriefContent, ops: readonly Operation[]): string[] {
  const doc = clone(briefContent(base));
  const lines: string[] = [];
  for (const op of ops) {
    const isScene = /^\/scenes\/(\d+|-)$/.test(op.path);
    switch (op.op) {
      case "add": {
        const v = op.value as { id?: string; idea?: string } | undefined;
        lines.push(
          isScene
            ? `Added scene ${v?.id ?? "?"}: ${short(v?.idea ?? "")}`
            : `${label(op.path, doc)}: added ${short(op.value)}`,
        );
        break;
      }
      case "remove":
        lines.push(
          isScene
            ? `Removed ${label(op.path, doc).replace("Scene", "scene")}`
            : `${label(op.path, doc)}: removed ${short(get(doc, op.path))}`,
        );
        break;
      case "replace":
        lines.push(`${label(op.path, doc)}: ${short(get(doc, op.path))} → ${short(op.value)}`);
        break;
      case "move": {
        const to = /^\/scenes\/(\d+)$/.exec(op.path);
        lines.push(
          to
            ? `Moved ${label(op.from, doc)} to position ${Number(to[1]) + 1}`
            : `Moved ${label(op.from, doc)} to ${label(op.path, doc)}`,
        );
        break;
      }
      case "copy":
        lines.push(`Copied ${label(op.from, doc)} to ${op.path}`);
        break;
      case "test":
        break;
    }
    applyPatch(doc, [op]);
  }
  return lines;
}

/** JSON Patch from `base` to `edited`, ignoring the derived `estimate` and `hash`. */
export function diffBriefs(base: Brief | BriefContent, edited: Brief | BriefContent): Operation[] {
  return createPatch(briefContent(base), briefContent(edited));
}

/** Build a `motion-edit/v1` block that turns `base` into `edited`. */
export function createEdit(base: Brief, edited: Brief | BriefContent): Result<MotionEdit> {
  const final = finalizeBrief(briefContent(edited));
  if (!final.ok) return final;
  const ops = diffBriefs(base, final.value);
  if (ops.length === 0) return fail(["No changes between the original and the edited brief."]);
  return ok({
    schema: EDIT_SCHEMA_ID,
    baseHash: base.hash,
    resultHash: final.value.hash,
    ops: ops as PatchOperation[],
    affectedScenes: computeAffectedScenes(base, ops),
    summary: describeChanges(base, ops).join("\n"),
  });
}

export interface AppliedEdit {
  brief: Brief;
  affectedScenes: string[];
}

/**
 * Apply an edit to the saved brief. Rejects a wrong `baseHash`, a tampered base,
 * protected paths, failing ops, an invalid result and a `resultHash` mismatch.
 */
export function applyEdit(base: Brief, edit: unknown): Result<AppliedEdit> {
  const parsed = EditInputSchema.safeParse(edit);
  if (!parsed.success) return fail(formatIssues(parsed.error.issues));
  const e = parsed.data;

  if (computeBriefHash(base) !== base.hash) {
    return fail([
      `The saved brief was changed after export (its hash doesn't match). ${REIMPORT_HINT}`,
    ]);
  }
  if (e.baseHash !== base.hash) {
    return fail([
      `This edit was made for a different version of the brief (edit base ${e.baseHash.slice(0, 12)}…, saved brief ${base.hash.slice(0, 12)}…). ${REIMPORT_HINT}`,
    ]);
  }
  const ops = e.ops as Operation[];
  const blocked = ops.flatMap((op) =>
    ("from" in op ? [op.from, op.path] : [op.path]).filter((p) =>
      PROTECTED_PATHS.some((q) => under(p, q)),
    ),
  );
  if (blocked.length) return fail([`Edits may not change ${[...new Set(blocked)].join(", ")}.`]);

  const doc = clone(briefContent(base));
  const results = applyPatch(doc, ops);
  const failed = results.findIndex((r) => r !== null);
  if (failed !== -1) {
    const op = ops[failed];
    return fail([
      `Edit operation ${failed + 1} (${op?.op} ${op?.path}) failed: ${results[failed]?.name}. ${REIMPORT_HINT}`,
    ]);
  }

  const final = finalizeBrief(doc);
  if (!final.ok) return fail(final.errors.map((err) => `After applying the edit: ${err}`));
  if (e.resultHash && final.value.hash !== e.resultHash) {
    return fail([
      `The edited brief doesn't match what the website produced (result hash differs). ${REIMPORT_HINT}`,
    ]);
  }
  return ok({
    brief: final.value,
    affectedScenes: e.affectedScenes ?? computeAffectedScenes(base, ops),
  });
}
