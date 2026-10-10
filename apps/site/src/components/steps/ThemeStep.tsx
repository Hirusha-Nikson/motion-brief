import {
  CONTRAST_PAIRS,
  FONT_FAMILIES,
  FONT_INFO,
  MOTION_STYLES,
  MOTION_STYLE_IDS,
  PALETTE_ROLES,
  contrastRatio,
  type FontFamily,
  type MotionStyle,
  type PaletteRole,
} from "@motionbrief/brief";
import { useBuilder } from "../../context.js";
import { PALETTE_PRESETS } from "../../palettes.js";
import { ColorField, NumberField, RadioCards, SelectField } from "../fields.js";

const ROLE_INFO: Record<PaletteRole, { label: string; hint: string }> = {
  background: { label: "Background", hint: "Behind everything" },
  surface: { label: "Surface", hint: "Cards and panels" },
  primary: { label: "Primary", hint: "Stats, bars and the call-to-action button" },
  accent: { label: "Accent", hint: "Highlights, dots and dividers" },
  text: { label: "Text", hint: "Headlines and body text" },
  mutedText: { label: "Muted text", hint: "Subheads, labels and attributions" },
};

const FONT_OPTIONS = FONT_FAMILIES.map((f) => ({
  value: f,
  label: f,
  group: { sans: "Sans serif", serif: "Serif", display: "Display", mono: "Monospace" }[
    FONT_INFO[f].category
  ],
}));

function safeRatio(a: string, b: string): number | null {
  try {
    return contrastRatio(a, b);
  } catch {
    return null;
  }
}

export function ThemeStep() {
  const { state, update } = useBuilder();
  const { theme, rules } = state.draft;

  return (
    <section aria-labelledby="theme-title" className="step">
      <h2 id="theme-title">Theme</h2>

      <fieldset className="group">
        <legend>Palette</legend>
        <div className="chips" role="group" aria-label="Palette presets">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="chip"
              onClick={() => update((x) => void (x.theme.palette = { ...p.palette }))}
            >
              <span className="swatches" aria-hidden="true">
                {PALETTE_ROLES.map((r) => (
                  <span key={r} style={{ background: p.palette[r] }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid-3">
          {PALETTE_ROLES.map((role) => (
            <ColorField
              key={role}
              label={ROLE_INFO[role].label}
              hint={ROLE_INFO[role].hint}
              value={theme.palette[role]}
              onChange={(v) => update((x) => void (x.theme.palette[role] = v))}
            />
          ))}
        </div>

        <table className="contrast">
          <caption>Contrast (needs {rules.minContrast}:1)</caption>
          <thead>
            <tr>
              <th scope="col">Sample</th>
              <th scope="col">Pair</th>
              <th scope="col">Ratio</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {CONTRAST_PAIRS.map((pair) => {
              const ratio = safeRatio(theme.palette[pair.fg], theme.palette[pair.bg]);
              const pass = ratio !== null && ratio >= rules.minContrast;
              return (
                <tr key={`${pair.fg}-${pair.bg}`}>
                  <td>
                    <span
                      className="sample"
                      style={{ color: theme.palette[pair.fg], background: theme.palette[pair.bg] }}
                    >
                      Aa
                    </span>
                  </td>
                  <td>
                    {ROLE_INFO[pair.fg].label} on {ROLE_INFO[pair.bg].label.toLowerCase()}
                    <span className="hint"> ({pair.usage})</span>
                  </td>
                  <td>{ratio === null ? "–" : `${ratio.toFixed(2)}:1`}</td>
                  <td className={pass ? "ok" : pair.severity === "error" ? "bad" : "warn"}>
                    {pass ? "Pass" : pair.severity === "error" ? "Too low" : "Low (decorative)"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>

      <fieldset className="group">
        <legend>Fonts</legend>
        <div className="row">
          {(["heading", "body"] as const).map((slot) => (
            <div key={slot} className="font-pick">
              <SelectField<FontFamily>
                label={slot === "heading" ? "Heading font" : "Body font"}
                value={theme.fonts[slot]}
                options={FONT_OPTIONS}
                onChange={(f) => update((x) => void (x.theme.fonts[slot] = f))}
              />
              <p
                className="font-sample"
                style={{ fontFamily: `"${theme.fonts[slot]}"` }}
                aria-hidden="true"
              >
                The quick brown fox, 1234567890
              </p>
            </div>
          ))}
        </div>
      </fieldset>

      <RadioCards<MotionStyle>
        legend="Motion style"
        name="motion-style"
        value={theme.motionStyle}
        options={MOTION_STYLE_IDS.map((id) => ({
          value: id,
          label: MOTION_STYLES[id].label,
          detail: MOTION_STYLES[id].description,
        }))}
        onChange={(m) => update((x) => void (x.theme.motionStyle = m))}
      />

      <NumberField
        label="Corner radius"
        suffix="px"
        min={0}
        max={200}
        value={theme.cornerRadius}
        onChange={(v) =>
          update((x) => void (x.theme.cornerRadius = Math.min(200, Math.max(0, Math.round(v)))))
        }
      />
    </section>
  );
}
