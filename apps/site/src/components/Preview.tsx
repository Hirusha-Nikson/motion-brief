import type { BriefContent } from "@motionbrief/brief";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LINE_HEIGHT } from "../layout/fit.js";
import {
  minFontPx,
  type PlacedText,
  type Rect,
  type SceneLayout,
  type Shape,
} from "../layout/sceneLayout.js";

export interface SceneRender {
  layout: SceneLayout;
  texts: PlacedText[];
}

const MAX_HEIGHT = 560;

function box(r: Rect): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function ShapeView({ shape, draft }: { shape: Shape; draft: BriefContent }) {
  const { palette, fonts } = draft.theme;
  const style: CSSProperties = {
    ...box(shape.rect),
    background: palette[shape.fill],
    borderRadius: shape.radius,
  };
  switch (shape.kind) {
    case "quote-mark":
      return (
        <div
          className="pv-shape pv-quote"
          style={{
            ...box(shape.rect),
            color: palette[shape.fill],
            fontFamily: `"${fonts.heading}"`,
            fontSize: shape.rect.h * 1.8,
          }}
        >
          “
        </div>
      );
    case "image":
      return (
        <div
          className="pv-shape pv-image"
          style={{ ...style, borderColor: palette.mutedText, color: palette.mutedText }}
        >
          <span style={{ fontSize: Math.max(24, shape.rect.h * 0.05) }}>Image: {shape.label}</span>
        </div>
      );
    case "icon":
      return (
        <div className="pv-shape pv-icon" style={{ ...style, color: palette.text }}>
          <span style={{ fontSize: shape.rect.h * 0.22, fontFamily: `"${fonts.body}"` }}>
            {shape.label || "icon"}
          </span>
        </div>
      );
    default:
      return <div className={`pv-shape pv-${shape.kind}`} style={style} />;
  }
}

/** One scene at the real canvas size, scaled to fit, with fitted text. */
export function ScenePreview({
  draft,
  fit,
  showSafeZone,
  caption,
}: {
  draft: BriefContent;
  fit: SceneRender;
  showSafeZone: boolean;
  caption?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { canvas, safeZone, theme } = draft;
  const scale = Math.min(width / canvas.width, MAX_HEIGHT / canvas.height);
  const { layout, texts } = fit;
  const c = layout.content;
  const capSize = minFontPx(draft);

  return (
    <div ref={ref} className="pv-frame">
      <div
        className="pv-scaled"
        style={{ width: canvas.width * scale, height: canvas.height * scale }}
      >
        <div
          className="pv-stage"
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
            background: theme.palette.background,
          }}
        >
          {layout.shapes.map((s, i) => (
            <ShapeView key={i} shape={s} draft={draft} />
          ))}
          {texts.map((t) => (
            <div
              key={t.index}
              className={`pv-text ${t.fits ? "" : "pv-overflow"}`}
              style={{
                ...box(t.rect),
                alignItems: t.align === "center" ? "center" : "flex-start",
                textAlign: t.align,
              }}
            >
              <div
                style={{
                  fontFamily: `"${t.family}", sans-serif`,
                  fontWeight: t.weight,
                  fontSize: t.size,
                  lineHeight: LINE_HEIGHT,
                  color: theme.palette[t.color],
                }}
              >
                {t.lines.map((line, k) => (
                  <div key={k} className="pv-line">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {layout.captionBand ? (
            <div className="pv-caption" style={box(layout.captionBand)}>
              <span
                style={{
                  fontFamily: `"${theme.fonts.body}"`,
                  fontSize: capSize,
                  color: theme.palette.text,
                  background: `${theme.palette.surface}e6`,
                  borderRadius: theme.cornerRadius / 2,
                }}
              >
                {caption || "Captions appear here"}
              </span>
            </div>
          ) : null}
          {showSafeZone ? (
            <>
              <div
                className="pv-unsafe"
                style={{ left: 0, top: 0, width: canvas.width, height: safeZone.top }}
              />
              <div
                className="pv-unsafe"
                style={{ left: 0, top: c.y + c.h, width: canvas.width, height: safeZone.bottom }}
              />
              <div
                className="pv-unsafe"
                style={{ left: 0, top: c.y, width: safeZone.left, height: c.h }}
              />
              <div
                className="pv-unsafe"
                style={{ left: c.x + c.w, top: c.y, width: safeZone.right, height: c.h }}
              />
              <div className="pv-safe-outline" style={box(c)} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
