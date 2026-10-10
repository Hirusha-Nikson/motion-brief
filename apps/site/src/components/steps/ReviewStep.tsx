import { PLATFORM_PRESETS, aspectRatio, compileBriefPrompt } from "@motionbrief/brief";
import { useBuilder } from "../../context.js";
import { ExportPanel } from "../ExportPanel.js";

/** GitHub `owner/repo` users add as a plugin marketplace in Claude. */
const PLUGIN_MARKETPLACE = "Hirusha-Nikson/motion-brief";
import { IssuesPanel } from "../IssuesPanel.js";

export function ReviewStep() {
  const { state, validation } = useBuilder();
  const d = state.draft;
  const platform = d.platform === "custom" ? "Custom" : PLATFORM_PRESETS[d.platform].label;
  const on = (b: boolean) => (b ? "yes" : "no");

  return (
    <section aria-labelledby="review-title" className="step">
      <h2 id="review-title">Review and export</h2>
      <dl className="summary">
        <dt>About</dt>
        <dd>
          {d.contentMode === "script" ? "Your script" : "Your idea"},{" "}
          {d.topic.trim() ? `${d.topic.trim().split(/\s+/).length} words` : "not written yet"}
        </dd>
        <dt>Platform</dt>
        <dd>
          {platform}, {d.canvas.width}×{d.canvas.height} ({aspectRatio(d.canvas)}),{" "}
          {d.durationSec === null ? "length chosen by Claude" : `${d.durationSec} s`}
        </dd>
        <dt>Theme</dt>
        <dd>
          {d.theme.fonts.heading} / {d.theme.fonts.body}, {d.theme.motionStyle} motion
        </dd>
        <dt>Scenes</dt>
        <dd>
          {d.sceneMode === "manual"
            ? `Your outline, ${d.scenes.length} scene${d.scenes.length === 1 ? "" : "s"}`
            : "Planned by Claude"}
          , {d.notes.length} note{d.notes.length === 1 ? "" : "s"}, icons {on(d.icons.enabled)}
        </dd>
        <dt>Audio</dt>
        <dd>
          Voice-over {on(d.voiceover.enabled)}, captions {on(d.captions.enabled)}, music{" "}
          {d.music.enabled ? d.music.genre || "Claude's choice" : "no"}
        </dd>
      </dl>

      <IssuesPanel />
      <ExportPanel />

      <section className="panel next-steps" aria-labelledby="next-title">
        <h2 id="next-title">What happens next</h2>
        <ol>
          <li>
            Install the MotionBrief plugin once: in Claude, open{" "}
            <a href="https://claude.ai/customize/plugins" target="_blank" rel="noreferrer">
              Customize → Plugins
            </a>
            , choose <strong>Add → Add marketplace</strong>, enter <code>{PLUGIN_MARKETPLACE}</code>
            , then add <strong>MotionBrief</strong>.
          </li>
          <li>Copy or download the prompt and paste it into a new chat.</li>
          <li>Claude writes the script and scene plan and asks you to confirm or change it.</li>
          <li>
            Claude builds the video in Claude Motion (Team and Enterprise plans) and checks it
            before showing you. On other plans it builds an HTML animation instead.
          </li>
        </ol>
      </section>

      {validation.brief ? (
        <details className="prompt-preview">
          <summary>Show the prompt</summary>
          <pre tabIndex={0}>{compileBriefPrompt(validation.brief)}</pre>
        </details>
      ) : null}
    </section>
  );
}
