import {
  BriefContentSchema,
  checkBrief,
  finalizeBrief,
  formatIssues,
  type Brief,
  type BriefContent,
  type BriefIssue,
} from "@motionbrief/brief";

export interface Validation {
  issues: BriefIssue[];
  errors: BriefIssue[];
  warnings: BriefIssue[];
  /** The finished brief, when the schema accepts the draft. */
  brief?: Brief;
}

/** Everything the Copy button depends on: schema errors, brief checks and font loading. */
export function validateDraft(
  draft: BriefContent,
  failedFonts: readonly string[] = [],
): Validation {
  const issues: BriefIssue[] = [];

  const parsed = BriefContentSchema.safeParse(draft);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = `/${issue.path.map(String).join("/")}`;
      const sceneIndex = issue.path[0] === "scenes" ? Number(issue.path[1]) : NaN;
      const sceneId = draft.scenes[sceneIndex]?.id;
      issues.push({
        id: `schema:${path}:${issue.code}`,
        severity: "error",
        check: "schema",
        path,
        message: formatIssues([issue])[0] ?? issue.message,
        ...(sceneId ? { sceneId } : {}),
      });
    }
  }

  try {
    issues.push(...checkBrief(draft));
  } catch {
    // A malformed draft: schema errors already explain it.
  }

  for (const family of failedFonts) {
    issues.push({
      id: `font:${family}`,
      severity: "warning",
      check: "font",
      message: `The font "${family}" didn't load in this browser, so the style preview uses a fallback. Check your connection and reload.`,
    });
  }

  const final = parsed.success ? finalizeBrief(parsed.data) : undefined;
  return {
    issues,
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
    ...(final?.ok ? { brief: final.value } : {}),
  };
}
