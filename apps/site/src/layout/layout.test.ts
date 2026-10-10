import {
  PLATFORMS,
  PLATFORM_PRESETS,
  SCENE_TYPES,
  briefContent,
  expandBrief,
  unwrap,
  type BriefContent,
} from "@motionbrief/brief";
import { describe, expect, it } from "vitest";
import { headlineFrom, sampleScenes } from "../components/PreviewPanel.js";
import { fitText, wrapText } from "./fit.js";
import type { Measure } from "./measure.js";
import { layoutScene, minFontPx, placeTexts, type Rect, type Scene } from "./sceneLayout.js";

/** Deterministic stand-in for canvas metrics: half an em per character. */
const measure: Measure = (text, font) => text.length * font.size * 0.5;

function inside(inner: Rect, outer: Rect): boolean {
  const e = 0.5;
  return (
    inner.x >= outer.x - e &&
    inner.y >= outer.y - e &&
    inner.x + inner.w <= outer.x + outer.w + e &&
    inner.y + inner.h <= outer.y + outer.h + e
  );
}

function overlaps(a: Rect, b: Rect): boolean {
  const e = 0.5;
  return a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
}

/** One brief per platform; captions on for Reels so the caption band is covered. */
const briefs: BriefContent[] = PLATFORMS.map((platform) =>
  briefContent(
    unwrap(
      expandBrief({
        platform,
        topic: "Cloudflare K2 new event tool",
        audience: "Event organisers",
        ...(platform === "custom" ? { canvas: { width: 1280, height: 720, fps: 30 } } : {}),
        captions: { enabled: platform === "reels" },
      }),
    ),
  ),
);

/** Every scene type with 4 text items, 3 icons and an image. */
const stressScenes: Scene[] = SCENE_TYPES.map((type) => ({
  type,
  onScreenText: [
    { role: "headline", text: "One" },
    { role: "body", text: "Two" },
    { role: "label", text: "Three" },
    { role: "label", text: "Four" },
  ],
  icons: ["a", "b", "c"],
  images: [{ name: "x.png" }],
}));

describe("layoutScene", () => {
  it("keeps every text box and shape inside the safe zone, clear of captions", () => {
    for (const b of briefs) {
      for (const scene of stressScenes) {
        const layout = layoutScene(b, scene);
        for (const r of [...layout.texts.map((t) => t.rect), ...layout.shapes.map((s) => s.rect)]) {
          expect(inside(r, layout.content), `${b.platform}/${scene.type}`).toBe(true);
        }
        if (layout.captionBand) {
          for (const t of layout.texts) expect(overlaps(t.rect, layout.captionBand)).toBe(false);
        }
      }
    }
  });

  it("gives every text item its own box with no overlaps", () => {
    for (const b of briefs) {
      for (const scene of stressScenes) {
        const { texts } = layoutScene(b, scene);
        expect(texts.map((t) => t.index).sort(), `${b.platform}/${scene.type}`).toEqual([
          0, 1, 2, 3,
        ]);
        for (let i = 0; i < texts.length; i++) {
          for (let j = i + 1; j < texts.length; j++) {
            expect(
              overlaps(texts[i]!.rect, texts[j]!.rect),
              `${b.platform}/${scene.type} ${i}/${j}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it("fits every style-preview sample on every platform", () => {
    for (const b of briefs) {
      for (const { label, scene } of sampleScenes(b)) {
        for (const t of placeTexts(b, scene, layoutScene(b, scene), measure)) {
          expect(t.fits, `${b.platform}/${label}: ${t.text}`).toBe(true);
          expect(t.size).toBeGreaterThanOrEqual(minFontPx(b));
        }
      }
    }
  });

  it("uses the platform's content box", () => {
    const b = briefs[0]!;
    const { content } = layoutScene(b, stressScenes[0]!);
    const sz = PLATFORM_PRESETS.reels.safeZone;
    expect(content).toEqual({
      x: sz.left,
      y: sz.top,
      w: 1080 - sz.left - sz.right,
      h: 1920 - sz.top - sz.bottom,
    });
  });
});

describe("headlineFrom", () => {
  it("takes the first sentence and cuts on a word boundary", () => {
    expect(headlineFrom("Cloudflare K2. More details here.")).toBe("Cloudflare K2");
    expect(headlineFrom("Cloudflare K2 new event tool: what it does")).toBe(
      "Cloudflare K2 new event tool",
    );
    expect(headlineFrom("K2 — the event tool")).toBe("K2");
    expect(headlineFrom("A very long opening line that keeps going well past the limit")).toBe(
      "A very long opening line that keeps…",
    );
    expect(headlineFrom("   ")).toBe("");
  });
});

describe("fitText", () => {
  const opts = { family: "Inter", weight: 400, maxSize: 100, minSize: 20, maxLines: 2, measure };

  it("keeps the largest size that fits on one line", () => {
    expect(fitText("Hello", { w: 1000, h: 500 }, opts)).toEqual({
      size: 100,
      lines: ["Hello"],
      fits: true,
    });
  });

  it("shrinks, then wraps", () => {
    const r = fitText("Hello brave new world", { w: 400, h: 500 }, opts);
    expect(r.fits).toBe(true);
    expect(r.size).toBeLessThan(100);
    expect(r.lines.length).toBeLessThanOrEqual(2);
  });

  it("stops at the minimum size and says why", () => {
    expect(fitText("Supercalifragilistic", { w: 100, h: 500 }, opts)).toMatchObject({
      fits: false,
      size: 20,
      problem: "word-too-wide",
    });
    expect(fitText("a b c d e f g h", { w: 20, h: 500 }, opts).problem).toBe("too-many-lines");
  });

  it("keeps explicit line breaks", () => {
    expect(
      wrapText("one\ntwo", 1000, { family: "x", weight: 400, size: 10 }, measure).lines,
    ).toEqual(["one", "two"]);
  });
});
