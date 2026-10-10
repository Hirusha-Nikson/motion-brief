import { stepForIssue, useBuilder } from "../context.js";
import { STEPS } from "../state/draft.js";

export function Stepper() {
  const { state, dispatch, validation } = useBuilder();
  return (
    <nav aria-label="Builder steps" className="stepper">
      <ol>
        {STEPS.map((step, i) => {
          const errors = validation.errors.filter((e) => stepForIssue(e) === step.id).length;
          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={state.step === step.id ? "step" : undefined}
                onClick={() => dispatch({ type: "step", step: step.id })}
              >
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                {step.label}
                {errors ? (
                  <span className="badge" aria-label={`${errors} error${errors === 1 ? "" : "s"}`}>
                    {errors}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StepNav() {
  const { state, dispatch } = useBuilder();
  const i = STEPS.findIndex((s) => s.id === state.step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  return (
    <div className="step-nav">
      {prev ? (
        <button
          type="button"
          className="secondary"
          onClick={() => dispatch({ type: "step", step: prev.id })}
        >
          ← {prev.label}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button type="button" onClick={() => dispatch({ type: "step", step: next.id })}>
          {next.label} →
        </button>
      ) : null}
    </div>
  );
}
