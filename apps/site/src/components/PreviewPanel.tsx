import type { BriefContent } from "@motionbrief/brief";
import { useMemo, useState } from "react";
import { useBuilder } from "../context.js";
import { layoutScene, placeTexts, type Scene } from "../layout/sceneLayout.js";
import { CheckboxField } from "./fields.js";
import { ScenePreview } from "./Preview.js";

/** First sentence or line of the topic, cut to a headline-sized length. */
export function headlineFrom(topic: string, max = 40): string {
  const first =
    topic
      .trim()
      .split(/[\n.!?:]| [-–—] /)[0]
      ?.trim() ?? "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max / 2 ? space : max).trim()}…`;
}

/** Sample frames that show the theme. They are not the video's scenes. */
export function sampleScenes(d: BriefContent): { label: string; scene: Scene }[] {
  const none = { icons: [], images: [] };
  return [
    {
      label: "Title",
      scene: {
        type: "title",
        onScreenText: [
          { role: "headline", text: headlineFrom(d.topic) || "Your video title" },
          { role: "subhead", text: d.audience ? `For ${d.audience}` : "A short subtitle" },
        ],
        ...none,
      },
    },
    {
      label: "List",
      scene: {
        type: "bullets",
        onScreenText: [
          { role: "headline", text: "Key points" },
          { role: "body", text: "First point" },
          { role: "body", text: "Second point" },
          { role: "body", text: "Third point" },
        ],
        ...none,
      },
    },
    {
      label: "Stat",
      scene: {
        type: "stat",
        onScreenText: [
          { role: "stat", text: "73%" },
          { role: "label", text: "A sample number" },
        ],
        ...none,
      },
    },
    {
      label: "Call to action",
      scene: {
        type: "cta",
        onScreenText: [
          { role: "headline", text: "Your call to action" },
          { role: "cta", text: "Follow for more" },
        ],
        ...none,
      },
    },
  ];
}

export function PreviewPanel() {
  const { state, measure, fontsVersion } = useBuilder();
  const d = state.draft;
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [index, setIndex] = useState(0);
  const samples = useMemo(() => sampleScenes(d), [d]);
  const sample = samples[index] ?? samples[0]!;

  const render = useMemo(() => {
    const layout = layoutScene(d, sample.scene);
    return { layout, texts: placeTexts(d, sample.scene, layout, measure) };
    // fontsVersion re-measures once real fonts arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, sample.scene, measure, fontsVersion]);

  return (
    <section className="panel preview" aria-labelledby="preview-title">
      <div className="panel-head">
        <h2 id="preview-title">Style preview</h2>
        <CheckboxField label="Safe zone" checked={showSafeZone} onChange={setShowSafeZone} />
      </div>
      <p className="hint">
        Sample frames with your canvas, safe zone, colours and fonts. Claude writes the real scenes.
      </p>
      <div className="sample-tabs" role="group" aria-label="Sample frame">
        {samples.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className="secondary"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ScenePreview
        draft={d}
        fit={render}
        showSafeZone={showSafeZone}
        {...(d.captions.enabled ? { caption: "Captions appear here" } : {})}
      />
    </section>
  );
}
