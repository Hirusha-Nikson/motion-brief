import { useBuilder } from "../../context.js";
import { CheckboxField, RadioCards, SelectField, TextField } from "../fields.js";

const LANGUAGES = [
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
  ["en-AU", "English (Australia)"],
  ["en-IN", "English (India)"],
  ["es-ES", "Spanish (Spain)"],
  ["es-MX", "Spanish (Mexico)"],
  ["fr-FR", "French"],
  ["de-DE", "German"],
  ["it-IT", "Italian"],
  ["pt-BR", "Portuguese (Brazil)"],
  ["nl-NL", "Dutch"],
  ["hi-IN", "Hindi"],
  ["si-LK", "Sinhala"],
  ["ta-IN", "Tamil"],
  ["ja-JP", "Japanese"],
  ["ko-KR", "Korean"],
  ["zh-CN", "Chinese (Mandarin)"],
  ["ar-SA", "Arabic"],
] as const;

export function AudioStep() {
  const { state, update } = useBuilder();
  const d = state.draft;
  const languages = LANGUAGES.some(([code]) => code === d.voiceover.language)
    ? LANGUAGES
    : ([...LANGUAGES, [d.voiceover.language, d.voiceover.language]] as const);

  return (
    <section aria-labelledby="audio-title" className="step">
      <h2 id="audio-title">Audio</h2>
      <p className="lede">
        Tick what you want. Claude writes the narration, times the scenes to it, and renders an MP4
        with a natural voice, captions (also as an SRT file) and music.
      </p>

      <fieldset className="group">
        <legend>Voice-over</legend>
        <CheckboxField
          label="Add a voice-over"
          hint={
            d.contentMode === "script"
              ? "Claude narrates your script."
              : "Claude writes the narration as part of the script."
          }
          checked={d.voiceover.enabled}
          onChange={(on) =>
            update((x) => {
              x.voiceover.enabled = on;
              if (on) x.captions.enabled = true;
            })
          }
        />
        {d.voiceover.enabled ? (
          <div className="row">
            <SelectField
              label="Language"
              value={d.voiceover.language}
              options={languages.map(([value, label]) => ({ value, label }))}
              onChange={(v) => update((x) => void (x.voiceover.language = v))}
            />
            <TextField
              label="Voice (optional)"
              placeholder="e.g. warm female, energetic male"
              value={d.voiceover.voice}
              maxLength={100}
              onChange={(v) => update((x) => void (x.voiceover.voice = v))}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="group">
        <legend>Captions</legend>
        <CheckboxField
          label="Show captions"
          hint="Recommended: most feeds autoplay muted."
          checked={d.captions.enabled}
          onChange={(on) => update((x) => void (x.captions.enabled = on))}
        />
        {d.captions.enabled ? (
          <RadioCards<"line" | "karaoke">
            legend="Caption style"
            name="caption-style"
            value={d.captions.style}
            options={[
              { value: "line", label: "Line", detail: "One phrase at a time" },
              { value: "karaoke", label: "Karaoke", detail: "Highlights each word as it's spoken" },
            ]}
            onChange={(s) => update((x) => void (x.captions.style = s))}
          />
        ) : null}
      </fieldset>

      <fieldset className="group">
        <legend>Music</legend>
        <CheckboxField
          label="Add background music"
          checked={d.music.enabled}
          onChange={(on) => update((x) => void (x.music.enabled = on))}
        />
        {d.music.enabled ? (
          <TextField
            label="Genre or mood (optional)"
            hint="Leave empty and Claude picks music that suits the video."
            placeholder="e.g. upbeat electronic, calm piano, lo-fi"
            value={d.music.genre}
            maxLength={100}
            onChange={(v) => update((x) => void (x.music.genre = v))}
          />
        ) : null}
      </fieldset>
    </section>
  );
}
