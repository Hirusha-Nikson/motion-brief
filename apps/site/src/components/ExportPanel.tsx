import { compileBriefPrompt } from "@motionbrief/brief";
import { useId, useState } from "react";
import { useBuilder } from "../context.js";
import { shareUrl } from "../state/share.js";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without async clipboard access.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportPanel() {
  const id = useId();
  const { state, validation } = useBuilder();
  const [status, setStatus] = useState("");
  const { brief, errors, warnings } = validation;
  const unacked = warnings.filter((w) => !state.acknowledged.includes(w.id));
  const ready = Boolean(brief) && errors.length === 0 && unacked.length === 0;

  const blocker = errors.length
    ? `Fix ${errors.length} error${errors.length === 1 ? "" : "s"} first.`
    : unacked.length
      ? `Review and accept ${unacked.length} warning${unacked.length === 1 ? "" : "s"} first.`
      : "";

  return (
    <section className="panel export" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Export</h2>
      <button
        type="button"
        className="primary"
        disabled={!ready}
        aria-describedby={`${id}-blocker`}
        onClick={async () => {
          if (!brief) return;
          const ok = await copyText(compileBriefPrompt(brief));
          setStatus(
            ok
              ? "Prompt copied. Paste it into Claude."
              : "Couldn't copy; use Show the prompt on the Review step.",
          );
        }}
      >
        Copy prompt
      </button>
      <p id={`${id}-blocker`} className="hint">
        {blocker || "Paste it into Claude with the MotionBrief plugin installed."}
      </p>
      <div className="row">
        <button
          type="button"
          className="secondary"
          disabled={!ready}
          onClick={() => {
            if (!brief) return;
            download("motion-brief-prompt.md", compileBriefPrompt(brief), "text/markdown");
            setStatus("Downloaded the prompt. Attach or paste it in Claude.");
          }}
        >
          Download prompt
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!brief}
          onClick={() => {
            if (!brief) return;
            download(
              `${brief.id}.brief.json`,
              `${JSON.stringify(brief, null, 2)}\n`,
              "application/json",
            );
            setStatus("Downloaded brief.json.");
          }}
        >
          Download brief.json
        </button>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            const url = await shareUrl(brief ?? state.draft, window.location);
            const ok = await copyText(url);
            setStatus(
              ok
                ? "Share link copied. The brief travels in the link; nothing is uploaded."
                : "Couldn't copy the link.",
            );
          }}
        >
          Copy share link
        </button>
      </div>
      <p role="status" className="status">
        {status}
      </p>
    </section>
  );
}
