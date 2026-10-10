import { PLATFORM_PRESETS, checkBrief } from "@motionbrief/brief";
import { describe, expect, it } from "vitest";
import { PALETTE_PRESETS } from "../palettes.js";
import { validateDraft } from "../validate.js";
import {
  addSceneIdea,
  initialState,
  moveItem,
  newDraft,
  reducer,
  setPlatform,
  toDraft,
} from "./draft.js";
import { decodeShareHash, encodeShareHash } from "./share.js";
import { loadSaved, save } from "./storage.js";

describe("newDraft", () => {
  it("starts empty and asks only for the topic", () => {
    const v = validateDraft(newDraft());
    expect(v.errors.map((e) => e.path)).toEqual(["/topic"]);
    expect(v.warnings).toEqual([]);
  });

  it("is ready to copy once a topic is written", () => {
    const d = newDraft();
    d.topic = "Cloudflare K2 new event tool";
    const v = validateDraft(d);
    expect(v.issues).toEqual([]);
    expect(v.brief?.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("reducer", () => {
  it("applies a suggestion at its JSON Pointer", () => {
    const s = reducer(initialState(), {
      type: "suggest",
      suggestion: { label: "x", path: "/durationSec", value: 42 },
    });
    expect(s.draft.durationSec).toBe(42);
  });

  it("does not mutate the previous state", () => {
    const before = initialState();
    const snapshot = structuredClone(before.draft);
    reducer(before, { type: "update", recipe: (d) => void (d.audience = "Changed") });
    expect(before.draft).toEqual(snapshot);
  });

  it("tracks acknowledged warnings", () => {
    let s = reducer(initialState(), { type: "acknowledge", id: "w1", on: true });
    expect(s.acknowledged).toEqual(["w1"]);
    s = reducer(s, { type: "acknowledge", id: "w1", on: false });
    expect(s.acknowledged).toEqual([]);
  });
});

describe("draft edits", () => {
  it("switches platform presets", () => {
    const d = newDraft();
    setPlatform(d, "youtube");
    expect(d.canvas).toEqual(PLATFORM_PRESETS.youtube.canvas);
    expect(d.safeZone).toEqual(PLATFORM_PRESETS.youtube.safeZone);
  });

  it("adds and reorders outline scenes with fresh ids", () => {
    const d = newDraft();
    addSceneIdea(d);
    addSceneIdea(d);
    expect(d.scenes.map((s) => s.id)).toEqual(["s1", "s2"]);
    moveItem(d.scenes, 1, 0);
    expect(d.scenes.map((s) => s.id)).toEqual(["s2", "s1"]);
    addSceneIdea(d);
    expect(d.scenes[2]?.id).toBe("s3");
  });

  it("accepts complete briefs, unfinished drafts and minimal briefs", () => {
    const d = newDraft();
    d.notes = ["", "half a note"];
    d.sceneMode = "manual";
    expect(toDraft(d)).toEqual(d);
    expect(toDraft({ platform: "square", topic: "Hi" })?.platform).toBe("square");
    expect(toDraft({ nonsense: true })).toBeNull();
  });
});

describe("share links", () => {
  it("round-trips a draft through the URL hash", async () => {
    const d = newDraft();
    d.topic = "Cloudflare K2 new event tool";
    const hash = await encodeShareHash(d);
    expect(hash).toMatch(/^brief=[A-Za-z0-9_-]+$/);
    expect(await decodeShareHash(`#${hash}`)).toEqual(d);
  });

  it("returns null for missing or corrupt data", async () => {
    expect(await decodeShareHash("#other=1")).toBeNull();
    expect(await decodeShareHash("#brief=not-deflate")).toBeNull();
  });
});

describe("storage", () => {
  it("saves and loads the draft, and survives missing storage", () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const g = globalThis as { localStorage?: unknown };
    const original = g.localStorage;
    try {
      g.localStorage = undefined;
      expect(loadSaved()).toBeNull();
      save(newDraft());

      g.localStorage = fake;
      const d = newDraft();
      save(d);
      expect(loadSaved()).toEqual(d);

      g.localStorage = {
        getItem: () => {
          throw new Error("blocked");
        },
      };
      expect(loadSaved()).toBeNull();
    } finally {
      g.localStorage = original;
    }
  });
});

describe("palette presets", () => {
  it.each(PALETTE_PRESETS.map((p) => [p.name, p.palette] as const))(
    "%s passes contrast",
    (_, palette) => {
      const d = newDraft();
      d.theme.palette = { ...palette };
      expect(checkBrief(d).filter((i) => i.check === "contrast")).toEqual([]);
    },
  );
});

describe("validateDraft", () => {
  it("maps schema errors to JSON Pointers and scenes", () => {
    const d = newDraft();
    d.topic = "A video";
    d.sceneMode = "manual";
    addSceneIdea(d);
    const v = validateDraft(d);
    expect(v.brief).toBeUndefined();
    expect(v.errors).toContainEqual(
      expect.objectContaining({ check: "schema", sceneId: "s1", path: "/scenes/0/idea" }),
    );
  });

  it("warns about fonts that failed to load", () => {
    expect(validateDraft(newDraft(), ["Inter"]).warnings[0]?.id).toBe("font:Inter");
  });
});
