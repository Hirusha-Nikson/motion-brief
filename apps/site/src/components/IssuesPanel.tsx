import { useId } from "react";
import { stepForIssue, useBuilder } from "../context.js";
import { STEPS } from "../state/draft.js";

export function IssuesPanel({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const { state, dispatch, validation } = useBuilder();
  const { errors, warnings } = validation;
  const unacked = warnings.filter((w) => !state.acknowledged.includes(w.id));

  const summary =
    errors.length || warnings.length
      ? `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}${unacked.length ? ` (${unacked.length} to review)` : ""}`
      : "All checks pass.";

  const list = compact ? [...errors, ...unacked] : [...errors, ...warnings];

  return (
    <section className="panel issues" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Checks</h2>
      <p role="status" className={errors.length ? "bad" : unacked.length ? "warn" : "ok"}>
        {summary}
      </p>
      {list.length ? (
        <ul>
          {list.map((issue) => {
            const step = stepForIssue(issue);
            const acked = state.acknowledged.includes(issue.id);
            return (
              <li key={issue.id} className={issue.severity}>
                <span className="sev">{issue.severity === "error" ? "Error" : "Warning"}</span>
                <span className="msg">{issue.message}</span>
                <span className="issue-actions">
                  {step !== state.step ? (
                    <button
                      type="button"
                      className="link"
                      onClick={() => dispatch({ type: "step", step })}
                    >
                      Go to {STEPS.find((s) => s.id === step)?.label}
                    </button>
                  ) : null}
                  {issue.suggestion ? (
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        issue.suggestion &&
                        dispatch({ type: "suggest", suggestion: issue.suggestion })
                      }
                    >
                      {issue.suggestion.label}
                    </button>
                  ) : null}
                  {issue.severity === "warning" ? (
                    <label className="ack">
                      <input
                        type="checkbox"
                        checked={acked}
                        onChange={(e) =>
                          dispatch({ type: "acknowledge", id: issue.id, on: e.target.checked })
                        }
                      />
                      Accept
                    </label>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
