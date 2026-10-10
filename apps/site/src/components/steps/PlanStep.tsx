import { DEV_ICONS_URL, type SceneMode } from "@motionbrief/brief";
import { useBuilder } from "../../context.js";
import { addSceneIdea, moveItem } from "../../state/draft.js";
import { CheckboxField, OptionalNumberField, RadioCards, TextField } from "../fields.js";

const NOTE_EXAMPLES = [
  "Start with a quick intro to Cloudflare before talking about K2",
  "End with a keep-in-touch card with my name, Alex",
  "Use the Vercel icon at the top of the whole video",
];

export function PlanStep() {
  const { state, update } = useBuilder();
  const d = state.draft;

  return (
    <section aria-labelledby="plan-title" className="step">
      <h2 id="plan-title">Scenes and notes</h2>

      <RadioCards<SceneMode>
        legend="Who plans the scenes?"
        name="scene-mode"
        value={d.sceneMode}
        options={[
          {
            value: "auto",
            label: "Let Claude plan them (recommended)",
            detail:
              "Claude writes the hook, scenes and motion, then shows you the script to confirm.",
          },
          {
            value: "manual",
            label: "I'll outline the scenes",
            detail: "Describe each scene in your own words; Claude does the rest.",
          },
        ]}
        onChange={(m) =>
          update((x) => {
            x.sceneMode = m;
            if (m === "manual" && x.scenes.length === 0) addSceneIdea(x);
          })
        }
      />

      {d.sceneMode === "manual" ? (
        <fieldset className="group">
          <legend>Your scene outline</legend>
          <ol className="outline">
            {d.scenes.map((scene, i) => (
              <li key={scene.id}>
                <TextField
                  label={`Scene ${i + 1}`}
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Quick intro: what Cloudflare is, in one line"
                  value={scene.idea}
                  onChange={(v) =>
                    update((x) => {
                      const s = x.scenes[i];
                      if (s) s.idea = v;
                    })
                  }
                />
                <div className="row align-end">
                  <OptionalNumberField
                    label="Length (optional)"
                    suffix="s"
                    min={1}
                    max={120}
                    placeholder="auto"
                    value={scene.durationSec}
                    onChange={(v) =>
                      update((x) => {
                        const s = x.scenes[i];
                        if (!s) return;
                        if (v === undefined) delete s.durationSec;
                        else s.durationSec = v;
                      })
                    }
                  />
                  <span className="item-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move scene ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => update((x) => moveItem(x.scenes, i, i - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move scene ${i + 1} down`}
                      disabled={i === d.scenes.length - 1}
                      onClick={() => update((x) => moveItem(x.scenes, i, i + 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Remove scene ${i + 1}`}
                      onClick={() => update((x) => void x.scenes.splice(i, 1))}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="secondary" onClick={() => update(addSceneIdea)}>
            Add scene
          </button>
        </fieldset>
      ) : null}

      <fieldset className="group">
        <legend>Your expectations (optional)</legend>
        <p className="hint">Anything Claude must include, one note per line. For example:</p>
        <ul className="examples">
          {NOTE_EXAMPLES.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        {d.notes.map((note, i) => (
          <div key={i} className="row align-end note-row">
            <TextField
              label={`Note ${i + 1}`}
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(v) =>
                update((x) => {
                  x.notes[i] = v;
                })
              }
            />
            <button
              type="button"
              className="icon-btn danger"
              aria-label={`Remove note ${i + 1}`}
              onClick={() => update((x) => void x.notes.splice(i, 1))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => update((x) => void x.notes.push(""))}
        >
          Add note
        </button>
      </fieldset>

      <fieldset className="group">
        <legend>Icons</legend>
        <CheckboxField
          label="Use tech and brand icons"
          hint="Claude adds logos for the tools, products and companies the video mentions."
          checked={d.icons.enabled}
          onChange={(on) => update((x) => void (x.icons.enabled = on))}
        />
        <div className="callout">
          <p>
            Icons come from the <strong>Dev Icons</strong> skill. To use them, install it in Claude
            once: download <code>dev-icons.zip</code> from the{" "}
            <a href={`${DEV_ICONS_URL}/releases/latest`} target="_blank" rel="noreferrer">
              latest release
            </a>{" "}
            and upload it in Settings → Capabilities → Skills.{" "}
            <a href={DEV_ICONS_URL} target="_blank" rel="noreferrer">
              More about Dev Icons
            </a>
            .
          </p>
          <p>
            Need a specific icon? Add a note such as &ldquo;Use the Vercel icon at the top of the
            whole video&rdquo;.
          </p>
        </div>
      </fieldset>
    </section>
  );
}
