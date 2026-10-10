import type { BriefContent } from "@motionbrief/brief";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { EstimatePanel } from "./components/EstimatePanel.js";
import { ExportPanel } from "./components/ExportPanel.js";
import { IssuesPanel } from "./components/IssuesPanel.js";
import { PreviewPanel } from "./components/PreviewPanel.js";
import { StepNav, Stepper } from "./components/Stepper.js";
import { AudioStep } from "./components/steps/AudioStep.js";
import { IdeaStep } from "./components/steps/IdeaStep.js";
import { PlanStep } from "./components/steps/PlanStep.js";
import { PlatformStep } from "./components/steps/PlatformStep.js";
import { ReviewStep } from "./components/steps/ReviewStep.js";
import { ThemeStep } from "./components/steps/ThemeStep.js";
import { BuilderContext, type Builder } from "./context.js";
import { useFonts } from "./fonts.js";
import { createCanvasMeasure, type Measure } from "./layout/measure.js";
import { initialState, newDraft, reducer, toDraft, type AppState } from "./state/draft.js";
import { decodeShareHash } from "./state/share.js";
import { clearSaved, loadSaved, save } from "./state/storage.js";
import { validateDraft } from "./validate.js";

const STEP_VIEWS = {
  idea: IdeaStep,
  platform: PlatformStep,
  theme: ThemeStep,
  plan: PlanStep,
  audio: AudioStep,
  review: ReviewStep,
} as const;

function startState(): AppState {
  const saved = loadSaved();
  return saved ? initialState(saved) : initialState();
}

export function App({ measure: measureOverride }: { measure?: Measure } = {}) {
  const [state, dispatch] = useReducer(reducer, undefined, startState);
  const [notice, setNotice] = useState("");
  const measure = useMemo(() => measureOverride ?? createCanvasMeasure(), [measureOverride]);
  const fonts = useFonts([state.draft.theme.fonts.heading, state.draft.theme.fonts.body]);

  // Open a brief from a share link (#brief=...), then clean the URL.
  useEffect(() => {
    if (!window.location.hash) return;
    let cancelled = false;
    decodeShareHash(window.location.hash).then((value) => {
      if (cancelled || value === null) return;
      const draft = toDraft(value);
      if (draft) {
        dispatch({ type: "load", draft });
        setNotice("Opened the brief from the share link.");
      } else {
        setNotice("The share link doesn't contain a valid brief.");
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the draft locally.
  useEffect(() => {
    const timer = setTimeout(() => save(state.draft), 400);
    return () => clearTimeout(timer);
  }, [state.draft]);

  const validation = useMemo(
    () => validateDraft(state.draft, fonts.failed),
    [state.draft, fonts.failed],
  );

  const update = useCallback(
    (recipe: (draft: BriefContent) => void) => dispatch({ type: "update", recipe }),
    [],
  );
  const builder: Builder = {
    state,
    dispatch,
    validation,
    update,
    measure,
    fontsVersion: fonts.version,
  };
  const StepView = STEP_VIEWS[state.step];

  return (
    <BuilderContext.Provider value={builder}>
      <a className="skip" href="#step">
        Skip to the form
      </a>
      <header className="app-header">
        <div>
          <h1>MotionBrief</h1>
          <p className="tagline">
            Describe your video, pick a look, and get a prompt Claude turns into a motion video.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!window.confirm("Start a new brief? Your current draft will be replaced.")) return;
            clearSaved();
            dispatch({ type: "load", draft: newDraft() });
            dispatch({ type: "step", step: "idea" });
            setNotice("Started a new brief.");
          }}
        >
          New brief
        </button>
      </header>
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      <main className="layout">
        <div className="builder">
          <Stepper />
          <div id="step" tabIndex={-1}>
            <StepView />
          </div>
          <StepNav />
        </div>
        <aside className="sidebar" aria-label="Preview and export">
          <PreviewPanel />
          <EstimatePanel />
          {state.step !== "review" ? (
            <>
              <IssuesPanel compact />
              <ExportPanel />
            </>
          ) : null}
        </aside>
      </main>
      <footer className="app-footer">
        <p>
          Your brief stays in this browser: drafts save locally and share links carry the brief in
          the URL. No API keys are ever needed here. Fonts load from Google Fonts.
        </p>
      </footer>
    </BuilderContext.Provider>
  );
}
