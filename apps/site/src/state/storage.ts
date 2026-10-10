import type { BriefContent } from "@motionbrief/brief";
import { toDraft } from "./draft.js";

const KEY = "motionbrief:draft:v2";

/** The autosaved draft, or null when there is none or storage is unavailable. */
export function loadSaved(): BriefContent | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? toDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function save(draft: BriefContent): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode, quota, or blocked storage: autosave is a convenience only.
  }
}

export function clearSaved(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // ignore
  }
}
