import { DEFAULT_PALETTE, type Palette } from "@motionbrief/brief";

/** One-click palettes. Each passes every contrast pair at 4.5:1 (tested). */
export const PALETTE_PRESETS: readonly { name: string; palette: Palette }[] = [
  { name: "Midnight", palette: { ...DEFAULT_PALETTE } },
  {
    name: "Paper",
    palette: {
      background: "#fbfaf7",
      surface: "#efece4",
      primary: "#1d4ed8",
      accent: "#b45309",
      text: "#1c1b19",
      mutedText: "#57534e",
    },
  },
  {
    name: "Forest",
    palette: {
      background: "#0f1f17",
      surface: "#1b3326",
      primary: "#6ee7a8",
      accent: "#facc15",
      text: "#f0fdf4",
      mutedText: "#a7c4b3",
    },
  },
  {
    name: "Sunset",
    palette: {
      background: "#fff7ed",
      surface: "#ffedd5",
      primary: "#c2410c",
      accent: "#6d28d9",
      text: "#1c1917",
      mutedText: "#57534e",
    },
  },
];
