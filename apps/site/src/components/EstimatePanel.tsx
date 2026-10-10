import { TIER_EXPLANATIONS, estimate, type Estimate } from "@motionbrief/brief";
import { useBuilder } from "../context.js";

export function EstimatePanel() {
  const { state, validation } = useBuilder();
  let est: Estimate | undefined = validation.brief?.estimate;
  if (!est) {
    try {
      est = estimate(state.draft);
    } catch {
      est = undefined;
    }
  }
  return (
    <section className="panel estimate" aria-labelledby="estimate-title">
      <h2 id="estimate-title">Usage estimate</h2>
      {est ? (
        <>
          <p>
            <span className={`tier tier-${est.tier}`}>{est.tier}</span> {est.scenes} scene
            {est.scenes === 1 ? "" : "s"} · {est.durationSec} s
            {est.voCharacters ? ` · ${est.voCharacters} voice-over characters` : ""}
          </p>
          <p className="hint">{TIER_EXPLANATIONS[est.tier]}</p>
          <ul className="notes">
            {est.complexityNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="hint">A rough guide from the brief&apos;s size, not a token count.</p>
        </>
      ) : (
        <p className="hint">Fix the errors to see an estimate.</p>
      )}
    </section>
  );
}
