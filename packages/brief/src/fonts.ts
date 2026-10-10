/**
 * Fonts a brief may use. All are on Google Fonts, so Claude Motion, the site preview
 * and the Remotion route can load the same files.
 */
export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "DM Sans",
  "Manrope",
  "Work Sans",
  "IBM Plex Sans",
  "Space Grotesk",
  "Sora",
  "Outfit",
  "Plus Jakarta Sans",
  "Raleway",
  "Oswald",
  "Bebas Neue",
  "Anton",
  "Archivo Black",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "DM Serif Display",
  "JetBrains Mono",
  "Space Mono",
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];
export type FontCategory = "sans" | "serif" | "display" | "mono";

export interface FontInfo {
  category: FontCategory;
  /** Weights to load: regular, plus bold when the family has one. */
  weights: readonly number[];
}

const sans: FontInfo = { category: "sans", weights: [400, 700] };
const serif: FontInfo = { category: "serif", weights: [400, 700] };
const display: FontInfo = { category: "display", weights: [400] };

export const FONT_INFO: Record<FontFamily, FontInfo> = {
  Inter: sans,
  Roboto: sans,
  "Open Sans": sans,
  Lato: sans,
  Montserrat: sans,
  Poppins: sans,
  "DM Sans": sans,
  Manrope: sans,
  "Work Sans": sans,
  "IBM Plex Sans": sans,
  "Space Grotesk": sans,
  Sora: sans,
  Outfit: sans,
  "Plus Jakarta Sans": sans,
  Raleway: sans,
  Oswald: { category: "display", weights: [400, 700] },
  "Bebas Neue": display,
  Anton: display,
  "Archivo Black": display,
  "Playfair Display": serif,
  Merriweather: serif,
  Lora: serif,
  "DM Serif Display": { category: "serif", weights: [400] },
  "JetBrains Mono": { category: "mono", weights: [400, 700] },
  "Space Mono": { category: "mono", weights: [400, 700] },
};

/** Google Fonts CSS2 URL that loads the given families with their weights. */
export function googleFontsUrl(families: readonly FontFamily[]): string {
  const unique = [...new Set(families)];
  const params = unique.map((family) => {
    const name = family.replace(/ /g, "+");
    return `family=${name}:wght@${FONT_INFO[family].weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=block`;
}
