// @vitest-environment jsdom
import { parseBriefBlock } from "@motionbrief/brief";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App.js";
import type { Measure } from "./layout/measure.js";
import { STEPS } from "./state/draft.js";

const measure: Measure = (text, font) => text.length * font.size * 0.5;

function sidebar() {
  return screen.getByRole("complementary", { name: "Preview and export" });
}

function goTo(label: string) {
  const nav = screen.getByRole("navigation", { name: "Builder steps" });
  fireEvent.click(within(nav).getByRole("button", { name: new RegExp(label) }));
}

describe("App", () => {
  let copied = "";

  beforeEach(() => {
    localStorage.clear();
    copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (text: string) => ((copied = text), Promise.resolve()) },
    });
  });
  afterEach(cleanup);

  it("renders every step without crashing", () => {
    render(<App measure={measure} />);
    for (const step of STEPS) {
      goTo(step.label);
      const nav = screen.getByRole("navigation", { name: "Builder steps" });
      expect(
        within(nav)
          .getByRole("button", { name: new RegExp(step.label) })
          .getAttribute("aria-current"),
      ).toBe("step");
    }
  });

  it("needs only a topic before the prompt can be copied", async () => {
    render(<App measure={measure} />);
    const copy = within(sidebar()).getByRole("button", { name: "Copy prompt" });
    expect(copy).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Topic or prompt"), {
      target: { value: "Cloudflare K2 new event tool" },
    });
    expect(copy).toHaveProperty("disabled", false);
    await act(async () => {
      fireEvent.click(copy);
    });
    expect(copied.startsWith("Use the motion-brief skill")).toBe(true);
    const parsed = parseBriefBlock(copied);
    expect(parsed.ok && parsed.value.topic).toBe("Cloudflare K2 new event tool");
    expect(parsed.warnings).toEqual([]);
  });

  it("collects an outline, notes and audio ticks into the prompt", async () => {
    render(<App measure={measure} />);
    fireEvent.change(screen.getByLabelText("Topic or prompt"), {
      target: { value: "Cloudflare K2 new event tool" },
    });

    goTo("Scenes & notes");
    fireEvent.click(screen.getByLabelText(/I'll outline the scenes/));
    fireEvent.change(screen.getByLabelText("Scene 1"), {
      target: { value: "Quick intro: what is Cloudflare" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByLabelText("Note 1"), {
      target: { value: "Add a keep-in-touch card with my name at the end" },
    });
    fireEvent.click(screen.getByLabelText("Use tech and brand icons"));

    goTo("Audio");
    fireEvent.click(screen.getByLabelText("Add a voice-over"));
    fireEvent.click(screen.getByLabelText("Add background music"));

    await act(async () => {
      fireEvent.click(within(sidebar()).getByRole("button", { name: "Copy prompt" }));
    });
    const parsed = parseBriefBlock(copied);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({
      sceneMode: "manual",
      scenes: [{ id: "s1", idea: "Quick intro: what is Cloudflare" }],
      notes: ["Add a keep-in-touch card with my name at the end"],
      icons: { enabled: true },
      voiceover: { enabled: true },
      captions: { enabled: true },
      music: { enabled: true, genre: "" },
    });
    expect(copied).toContain("pick background music that suits the video's mood");
  });

  it("blocks copying while an outline scene is empty", () => {
    render(<App measure={measure} />);
    fireEvent.change(screen.getByLabelText("Topic or prompt"), { target: { value: "A video" } });
    goTo("Scenes & notes");
    fireEvent.click(screen.getByLabelText(/I'll outline the scenes/));
    expect(within(sidebar()).getByRole("button", { name: "Copy prompt" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(within(sidebar()).getByText(/Describe the scene or remove it/)).toBeTruthy();
  });
});
