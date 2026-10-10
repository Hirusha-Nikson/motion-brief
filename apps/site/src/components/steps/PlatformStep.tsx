import {
  PLATFORMS,
  PLATFORM_PRESETS,
  TYPICAL_LENGTH_SEC,
  aspectRatio,
  contentBox,
  type Platform,
  type SafeZone,
} from "@motionbrief/brief";
import { useBuilder } from "../../context.js";
import { clamp, resetSafeZone, setPlatform } from "../../state/draft.js";
import { NumberField, RadioCards, SelectField } from "../fields.js";

const FPS = ["24", "25", "30", "50", "60"] as const;
const SIDES: (keyof SafeZone)[] = ["top", "right", "bottom", "left"];
const LENGTHS = [15, 30, 45, 60, 90, 120, 180] as const;
type LengthChoice = "auto" | "custom" | `${(typeof LENGTHS)[number]}`;

export function PlatformStep() {
  const { state, update } = useBuilder();
  const d = state.draft;
  const box = contentBox(d.canvas, d.safeZone);
  const [min, max] = TYPICAL_LENGTH_SEC[d.platform];

  const lengthChoice: LengthChoice =
    d.durationSec === null
      ? "auto"
      : (LENGTHS as readonly number[]).includes(d.durationSec)
        ? (`${d.durationSec}` as LengthChoice)
        : "custom";

  const options = PLATFORMS.map((id) => {
    if (id === "custom") return { value: id, label: "Custom", detail: "Any size" };
    const p = PLATFORM_PRESETS[id];
    return {
      value: id,
      label: p.label,
      detail: `${p.canvas.width}×${p.canvas.height} · ${aspectRatio(p.canvas)}`,
    };
  });

  return (
    <section aria-labelledby="platform-title" className="step">
      <h2 id="platform-title">Platform and length</h2>
      <RadioCards<Platform>
        legend="Where will the video be posted?"
        name="platform"
        value={d.platform}
        options={options}
        onChange={(p) => update((x) => setPlatform(x, p))}
      />

      {d.platform === "custom" ? (
        <div className="row">
          <NumberField
            label="Width"
            suffix="px"
            min={240}
            max={7680}
            value={d.canvas.width}
            onChange={(v) => update((x) => void (x.canvas.width = clamp(Math.round(v), 240, 7680)))}
          />
          <NumberField
            label="Height"
            suffix="px"
            min={240}
            max={7680}
            value={d.canvas.height}
            onChange={(v) =>
              update((x) => void (x.canvas.height = clamp(Math.round(v), 240, 7680)))
            }
          />
        </div>
      ) : null}

      <div className="row align-end">
        <SelectField<LengthChoice>
          label="Length"
          value={lengthChoice}
          options={[
            { value: "auto", label: `Let Claude decide (usually ${min}–${max} s)` },
            ...LENGTHS.map((s) => ({ value: `${s}` as LengthChoice, label: `${s} seconds` })),
            { value: "custom", label: "Custom" },
          ]}
          onChange={(v) =>
            update((x) => {
              if (v === "auto") x.durationSec = null;
              else if (v === "custom") x.durationSec = x.durationSec ?? 40;
              else x.durationSec = Number(v);
            })
          }
        />
        {lengthChoice === "custom" && d.durationSec !== null ? (
          <NumberField
            label="Seconds"
            suffix="s"
            min={5}
            max={600}
            value={d.durationSec}
            onChange={(v) => update((x) => void (x.durationSec = clamp(Math.round(v), 5, 600)))}
          />
        ) : null}
        <SelectField
          label="Frame rate"
          value={String(d.canvas.fps) as (typeof FPS)[number]}
          options={FPS.map((f) => ({ value: f, label: `${f} fps` }))}
          onChange={(v) => update((x) => void (x.canvas.fps = Number(v)))}
        />
      </div>

      <details className="group advanced">
        <summary>Safe zone (advanced)</summary>
        <p className="hint">
          Everything stays inside the safe zone, clear of the app&apos;s buttons and captions. These
          are starting values: check them against the current platform UI.
        </p>
        <div className="row four">
          {SIDES.map((side) => (
            <NumberField
              key={side}
              label={side[0]!.toUpperCase() + side.slice(1)}
              suffix="px"
              min={0}
              max={4000}
              value={d.safeZone[side]}
              onChange={(v) =>
                update((x) => void (x.safeZone[side] = clamp(Math.round(v), 0, 4000)))
              }
            />
          ))}
        </div>
        <p className="hint">
          Content area: {box.width} × {box.height} px of {d.canvas.width} × {d.canvas.height} px.
        </p>
        <button type="button" className="secondary" onClick={() => update(resetSafeZone)}>
          Reset to platform default
        </button>
      </details>
    </section>
  );
}
