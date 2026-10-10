import { FONT_FAMILIES, FONT_INFO, googleFontsUrl, type FontFamily } from "@motionbrief/brief";
import { useEffect, useState } from "react";

const LINK_ID = "mb-google-fonts";
let stylesheet: Promise<boolean> | undefined;

/**
 * One stylesheet for every supported family; browsers only download the faces that get used.
 * Resolves to false if the stylesheet can't load (offline, blocked).
 */
export function loadFontStylesheet(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  stylesheet ??= new Promise<boolean>((resolve) => {
    const link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = googleFontsUrl(FONT_FAMILIES);
    link.onload = () => resolve(true);
    link.onerror = () => resolve(false);
    document.head.append(link);
  });
  return stylesheet;
}

export interface FontStatus {
  /** Bumps whenever loading finishes, so measurements re-run with real metrics. */
  version: number;
  /** Families that could not be loaded. */
  failed: FontFamily[];
}

async function loads(fonts: FontFaceSet, spec: string): Promise<boolean> {
  try {
    return (await fonts.load(spec)).length > 0;
  } catch {
    return false;
  }
}

/** Load the given families (all their weights) before text is measured. */
export function useFonts(families: readonly FontFamily[]): FontStatus {
  const [status, setStatus] = useState<FontStatus>({ version: 0, failed: [] });
  const key = [...new Set(families)].sort().join("|");

  useEffect(() => {
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    if (!fonts) return;
    let cancelled = false;
    const wanted = key.split("|").filter(Boolean) as FontFamily[];
    (async () => {
      const sheet = await loadFontStylesheet();
      const results = await Promise.all(
        wanted.map(async (family) => {
          if (!sheet) return false;
          const ok = await Promise.all(
            FONT_INFO[family].weights.map((w) => loads(fonts, `${w} 32px "${family}"`)),
          );
          return ok.every(Boolean);
        }),
      );
      if (cancelled) return;
      const failed = wanted.filter((_, i) => !results[i]);
      setStatus((s) => ({ version: s.version + 1, failed }));
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return status;
}
