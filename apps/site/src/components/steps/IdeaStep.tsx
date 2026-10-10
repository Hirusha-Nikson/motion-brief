import { countWords, round1, voDurationSec, type ContentMode } from "@motionbrief/brief";
import { useBuilder } from "../../context.js";
import { RadioCards, TextField } from "../fields.js";

const PLACEHOLDER: Record<ContentMode, string> = {
  idea: "e.g. Cloudflare K2 new event tool: what it does and why event organisers should care.\n\nA one-liner is fine. You can also paste a long prompt with all the details.",
  script: "Paste your script here. Claude splits it into scenes and keeps your wording.",
};

export function IdeaStep() {
  const { state, update } = useBuilder();
  const d = state.draft;
  const words = countWords(d.topic);
  const readAloud = round1(voDurationSec(d.topic, d.voiceover));

  return (
    <section aria-labelledby="idea-title" className="step">
      <h2 id="idea-title">What&apos;s the video about?</h2>
      <p className="lede">
        Describe it in your own words. Claude writes the script, hooks and motion, and shows you the
        script to confirm before it builds anything.
      </p>
      <RadioCards<ContentMode>
        legend="What are you giving Claude?"
        name="content-mode"
        value={d.contentMode}
        options={[
          { value: "idea", label: "An idea or brief", detail: "Claude writes the script" },
          { value: "script", label: "My own script", detail: "Claude keeps my wording" },
        ]}
        onChange={(m) => update((x) => void (x.contentMode = m))}
      />
      <TextField
        label={d.contentMode === "script" ? "Your script" : "Topic or prompt"}
        rows={9}
        maxLength={20000}
        placeholder={PLACEHOLDER[d.contentMode]}
        value={d.topic}
        hint={
          d.contentMode === "script" && words
            ? `${words} words, about ${readAloud} s read aloud.`
            : `${d.topic.length.toLocaleString()} / 20,000 characters`
        }
        onChange={(v) => update((x) => void (x.topic = v))}
      />
      <TextField
        label="Who is it for? (optional)"
        placeholder="e.g. event organisers and developer advocates"
        value={d.audience}
        maxLength={200}
        onChange={(v) => update((x) => void (x.audience = v))}
      />
    </section>
  );
}
