import type { z } from "zod";

export type Result<T> =
  { ok: true; value: T; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] };

export function ok<T>(value: T, warnings: string[] = []): Result<T> {
  return { ok: true, value, warnings };
}

export function fail<T = never>(errors: string[], warnings: string[] = []): Result<T> {
  return { ok: false, errors, warnings };
}

/** The value, or throw with all errors joined. For scripts and tests. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.value;
}

/** `scenes[1].onScreenText[0].text` */
export function formatPath(path: readonly PropertyKey[]): string {
  let out = "";
  for (const key of path) {
    if (typeof key === "number") out += `[${key}]`;
    else out += out ? `.${String(key)}` : String(key);
  }
  return out;
}

/** Zod issues as "path: message" lines a person can act on. */
export function formatIssues(issues: readonly z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    const where = formatPath(issue.path);
    const message = issue.message.replace(/, received undefined$/, " (missing)");
    return where ? `${where}: ${message}` : message;
  });
}
