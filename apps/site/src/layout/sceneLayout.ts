import {
  TEXT_ROLE_STYLE,
  contentBox,
  type BriefContent,
  type PaletteRole,
  type SceneType,
  type TextRole,
} from "@motionbrief/brief";
import { LINE_HEIGHT, fitText, type FitProblem } from "./fit.js";
import type { Measure } from "./measure.js";

/** A scene to lay out. The site uses sample scenes; Claude writes the real ones. */
export interface Scene {
  type: SceneType;
  onScreenText: { role: TextRole; text: string }[];
  icons: string[];
  images: { name: string }[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Align = "left" | "center";

export interface TextSlot {
  /** Index into `scene.onScreenText`. */
  index: number;
  rect: Rect;
  align: Align;
}

export type ShapeKind =
  "card" | "button" | "icon" | "image" | "bar" | "dot" | "quote-mark" | "divider";

export interface Shape {
  kind: ShapeKind;
  rect: Rect;
  fill: PaletteRole;
  radius: number;
  label?: string;
}

export interface SceneLayout {
  /** The safe-zone content box. */
  content: Rect;
  /** Where the scene lays out: the content box minus the caption band. */
  area: Rect;
  captionBand?: Rect;
  texts: TextSlot[];
  shapes: Shape[];
  /** 1% of the area's shorter side. */
  unit: number;
}

/** Starting size of each role, in `unit`s. Text shrinks from here, never below the brief's minimum. */
export const ROLE_SIZE_UNITS: Record<TextRole, number> = {
  headline: 11,
  subhead: 6,
  body: 5.5,
  label: 5,
  stat: 26,
  quote: 7.5,
  attribution: 4.5,
  cta: 6,
};

type LayoutBrief = Pick<BriefContent, "canvas" | "safeZone" | "captions" | "rules" | "theme">;

interface Ctx {
  area: Rect;
  unit: number;
  gap: number;
  landscape: boolean;
  radius: number;
  scene: Scene;
  n: number;
  texts: TextSlot[];
  shapes: Shape[];
}

function stack(r: Rect, weights: number[], gap: number): Rect[] {
  if (!weights.length) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  const free = Math.max(0, r.h - gap * (weights.length - 1));
  let y = r.y;
  return weights.map((w) => {
    const h = (free * w) / total;
    const out = { x: r.x, y, w: r.w, h };
    y += h + gap;
    return out;
  });
}

function columns(r: Rect, weights: number[], gap: number): Rect[] {
  if (!weights.length) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  const free = Math.max(0, r.w - gap * (weights.length - 1));
  let x = r.x;
  return weights.map((w) => {
    const width = (free * w) / total;
    const out = { x, y: r.y, w: width, h: r.h };
    x += width + gap;
    return out;
  });
}

function inset(r: Rect, dx: number, dy = dx): Rect {
  return { x: r.x + dx, y: r.y + dy, w: Math.max(0, r.w - 2 * dx), h: Math.max(0, r.h - 2 * dy) };
}

function band(r: Rect, from: number, to: number): Rect {
  return { x: r.x, y: r.y + r.h * from, w: r.w, h: r.h * (to - from) };
}

const fill = (n: number, w: number) => Array.from({ length: n }, () => w);

function place(ctx: Ctx, index: number, rect: Rect, align: Align = "center") {
  if (index >= 0 && index < ctx.n) ctx.texts.push({ index, rect, align });
}

function shape(ctx: Ctx, kind: ShapeKind, rect: Rect, fillRole: PaletteRole, label?: string) {
  const radius = kind === "dot" ? rect.w / 2 : kind === "bar" ? ctx.radius / 3 : ctx.radius;
  ctx.shapes.push({
    kind,
    rect,
    fill: fillRole,
    radius,
    ...(label !== undefined ? { label } : {}),
  });
}

function centered(ctx: Ctx, region: Rect, weights: number[], align: Align = "center") {
  stack(region, weights, ctx.gap).forEach((r, i) => place(ctx, i, r, align));
}

const layouts: Record<Scene["type"], (ctx: Ctx) => void> = {
  title(ctx) {
    centered(ctx, band(ctx.area, 0.18, 0.82), [3, ...fill(ctx.n - 1, 1.4)]);
  },

  "kinetic-text"(ctx) {
    const rects = stack(band(ctx.area, 0.12, 0.88), [4, ...fill(ctx.n - 1, 1.5)], ctx.gap);
    rects.forEach((r, i) => place(ctx, i, r));
    const head = rects[0];
    if (head && ctx.n > 0) {
      const w = ctx.area.w * 0.3;
      shape(
        ctx,
        "divider",
        {
          x: ctx.area.x + (ctx.area.w - w) / 2,
          y: head.y + head.h + ctx.gap * 0.3,
          w,
          h: ctx.unit,
        },
        "accent",
      );
    }
  },

  bullets(ctx) {
    const rects = stack(ctx.area, [1.3, ...fill(ctx.n - 1, 1)], ctx.gap);
    rects.forEach((r, i) => {
      if (i === 0) return place(ctx, 0, r);
      shape(ctx, "card", r, "surface");
      const pad = ctx.unit * 3;
      const d = Math.min(ctx.unit * 3, r.h / 3);
      shape(ctx, "dot", { x: r.x + pad, y: r.y + (r.h - d) / 2, w: d, h: d }, "accent");
      place(
        ctx,
        i,
        { x: r.x + pad * 2 + d, y: r.y + pad / 2, w: r.w - pad * 3 - d, h: r.h - pad },
        "left",
      );
    });
  },

  stat(ctx) {
    centered(ctx, band(ctx.area, 0.1, 0.9), [3.2, ...fill(ctx.n - 1, 1.2)]);
  },

  chart(ctx) {
    const labels = Math.max(0, ctx.n - 1);
    const bars = labels || 3;
    const weights = labels ? [1.1, 3, ctx.landscape ? 1 : Math.max(1, labels * 0.55)] : [1.1, 3];
    const [head, chart, legend] = stack(ctx.area, ctx.n ? weights : [0, 1], ctx.gap);
    if (head) place(ctx, 0, head);
    if (!chart) return;
    columns(chart, fill(bars, 1), ctx.gap).forEach((col, i) => {
      const h = chart.h * (0.35 + (0.65 * (i + 1)) / bars);
      shape(
        ctx,
        "bar",
        { x: col.x, y: col.y + col.h - h, w: col.w, h },
        i % 2 ? "accent" : "primary",
      );
    });
    if (!legend || !labels) return;
    if (ctx.landscape) {
      columns(legend, fill(labels, 1), ctx.gap).forEach((r, i) => place(ctx, i + 1, r));
    } else {
      stack(legend, fill(labels, 1), ctx.gap / 2).forEach((r, i) => {
        const d = Math.min(ctx.unit * 3, r.h / 2);
        shape(
          ctx,
          "dot",
          { x: r.x, y: r.y + (r.h - d) / 2, w: d, h: d },
          i % 2 ? "accent" : "primary",
        );
        place(ctx, i + 1, { x: r.x + d * 2, y: r.y, w: r.w - d * 2, h: r.h }, "left");
      });
    }
  },

  "icon-grid"(ctx) {
    const labels = Math.max(0, ctx.n - 1);
    const cells = Math.max(labels, ctx.scene.icons.length);
    if (!cells) return centered(ctx, band(ctx.area, 0.3, 0.7), [1]);
    const [head, grid] = stack(ctx.area, [1, 4], ctx.gap);
    if (head) place(ctx, 0, head);
    if (!grid) return;
    const cols = Math.min(cells, ctx.landscape ? 4 : 2);
    const rows = Math.ceil(cells / cols);
    const rowRects = stack(grid, fill(rows, 1), ctx.gap);
    for (let k = 0; k < cells; k++) {
      const row = rowRects[Math.floor(k / cols)];
      if (!row) continue;
      const cell = columns(row, fill(cols, 1), ctx.gap)[k % cols];
      if (!cell) continue;
      const side = Math.min(cell.w, cell.h * 0.6);
      const tile = { x: cell.x + (cell.w - side) / 2, y: cell.y, w: side, h: side };
      shape(ctx, "icon", tile, "surface", ctx.scene.icons[k] ?? "");
      const top = tile.y + tile.h + ctx.gap * 0.4;
      place(ctx, k + 1, { x: cell.x, y: top, w: cell.w, h: cell.y + cell.h - top });
    }
  },

  "image-focus"(ctx) {
    const name = ctx.scene.images[0]?.name ?? "image";
    if (!ctx.n) return shape(ctx, "image", ctx.area, "surface", name);
    const weights = [2, ...fill(ctx.n - 1, 1.3)];
    if (ctx.landscape) {
      const [img, text] = columns(ctx.area, [1.3, 1], ctx.gap * 1.5);
      if (img) shape(ctx, "image", img, "surface", name);
      if (text) centered(ctx, band(text, 0.1, 0.9), weights, "left");
    } else {
      const [img, text] = stack(ctx.area, [3.2, 1 + ctx.n * 0.5], ctx.gap);
      if (img) shape(ctx, "image", img, "surface", name);
      if (text) centered(ctx, text, weights);
    }
  },

  quote(ctx) {
    const mark = ctx.unit * 10;
    const top = ctx.area.y + ctx.area.h * 0.08;
    shape(ctx, "quote-mark", { x: ctx.area.x, y: top, w: mark, h: mark }, "accent");
    const region = {
      x: ctx.area.x,
      y: top + mark * 1.2,
      w: ctx.area.w,
      h: ctx.area.h * 0.84 - mark * 1.2,
    };
    centered(ctx, region, [4, ...fill(ctx.n - 1, 1)], "left");
  },

  comparison(ctx) {
    const [head, body] = stack(ctx.area, [1, 4], ctx.gap);
    if (head) place(ctx, 0, head);
    if (!body) return;
    const cards = ctx.landscape ? columns(body, [1, 1], ctx.gap) : stack(body, [1, 1], ctx.gap);
    cards.forEach((card, c) => {
      shape(ctx, "card", card, "surface");
      const items: number[] = [];
      for (let i = 1 + c; i < ctx.n; i += 2) items.push(i);
      stack(inset(card, ctx.unit * 3), fill(items.length, 1), ctx.gap / 2).forEach((r, k) =>
        place(ctx, items[k] ?? -1, r),
      );
    });
  },

  cta(ctx) {
    const rects = stack(band(ctx.area, 0.15, 0.85), [2.4, ...fill(ctx.n - 1, 1.1)], ctx.gap);
    rects.forEach((r, i) => {
      if (i !== 1) return place(ctx, i, r);
      const w = r.w * 0.8;
      const button = { x: r.x + (r.w - w) / 2, y: r.y, w, h: r.h };
      shape(ctx, "button", button, "primary");
      place(ctx, 1, inset(button, ctx.unit * 3, ctx.unit * 1.5));
    });
  },
};

export function minFontPx(brief: Pick<BriefContent, "canvas" | "rules">): number {
  return Math.ceil((brief.canvas.height * brief.rules.minFontPctOfHeight) / 100);
}

/** Boxes for every text item and decoration of a scene, all inside the safe zone. */
export function layoutScene(brief: LayoutBrief, scene: Scene): SceneLayout {
  const c = contentBox(brief.canvas, brief.safeZone);
  const content = { x: c.x, y: c.y, w: c.width, h: c.height };
  const unit = Math.min(content.w, content.h) / 100;
  const gap = unit * 3;

  let area = content;
  let captionBand: Rect | undefined;
  if (brief.captions.enabled) {
    const h = Math.ceil(minFontPx(brief) * LINE_HEIGHT * brief.captions.maxLines + unit * 4);
    captionBand = { x: content.x, y: content.y + content.h - h, w: content.w, h };
    area = { ...content, h: Math.max(0, content.h - h - gap) };
  }

  const ctx: Ctx = {
    area,
    unit,
    gap,
    landscape: area.w > area.h * 1.15,
    radius: brief.theme.cornerRadius,
    scene,
    n: scene.onScreenText.length,
    texts: [],
    shapes: [],
  };
  layouts[scene.type](ctx);
  return {
    content,
    area,
    ...(captionBand ? { captionBand } : {}),
    texts: ctx.texts,
    shapes: ctx.shapes,
    unit,
  };
}

export interface PlacedText {
  index: number;
  role: TextRole;
  text: string;
  rect: Rect;
  align: Align;
  family: string;
  weight: number;
  color: PaletteRole;
  size: number;
  lines: string[];
  fits: boolean;
  problem?: FitProblem;
}

/** Fit every text item into its box at the brief's fonts, never below the minimum size. */
export function placeTexts(
  brief: LayoutBrief,
  scene: Scene,
  layout: SceneLayout,
  measure: Measure,
): PlacedText[] {
  const minSize = minFontPx(brief);
  return layout.texts.flatMap((slot) => {
    const item = scene.onScreenText[slot.index];
    if (!item) return [];
    const style = TEXT_ROLE_STYLE[item.role];
    const family = brief.theme.fonts[style.font];
    const fit = fitText(item.text, slot.rect, {
      family,
      weight: style.weight,
      maxSize: Math.max(minSize, layout.unit * ROLE_SIZE_UNITS[item.role]),
      minSize,
      maxLines: brief.rules.maxTextLinesPerBlock,
      measure,
    });
    return [
      {
        index: slot.index,
        role: item.role,
        text: item.text,
        rect: slot.rect,
        align: slot.align,
        family,
        weight: style.weight,
        color: style.color,
        size: fit.size,
        lines: fit.lines,
        fits: fit.fits,
        ...(fit.problem ? { problem: fit.problem } : {}),
      },
    ];
  });
}
