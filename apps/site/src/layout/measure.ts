export interface FontSpec {
  family: string;
  weight: number;
  size: number;
}

/** Width in px of `text` set in `font`. */
export type Measure = (text: string, font: FontSpec) => number;

/** Conservative estimate for when no canvas is available (tests, very old browsers). */
export const approxMeasure: Measure = (text, font) =>
  text.length * font.size * (font.weight >= 700 ? 0.6 : 0.56);

/** Canvas `measureText`, the same metrics the browser uses to lay out the preview. */
export function createCanvasMeasure(): Measure {
  let ctx: CanvasRenderingContext2D | null;
  try {
    ctx =
      typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) return approxMeasure;
  const context = ctx;
  return (text, font) => {
    context.font = `${font.weight} ${font.size}px "${font.family}", sans-serif`;
    return context.measureText(text).width;
  };
}
