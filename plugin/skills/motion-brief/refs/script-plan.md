# Script and scene plan

Show the plan in this shape before building. Keep it scannable: the user should be able to approve it in under a minute.

## Message template

```
Estimate: <tier> · <estimate.complexityNotes joined with " · ">
Output: <route, e.g. "MP4 with voice-over, captions (SRT) and music, rendered here">

**<Working title>** · <platform label> <width>×<height> · <total length> s · <motion style>

Assumptions (5 lines or fewer, only what the brief left open):
- <e.g. Length: 30 s, middle of the Reels range>
- <e.g. Narration voice: warm, neutral accent>

| # | Time | Scene | On screen | Voice-over | Visuals and motion |
| - | ---- | ----- | --------- | ---------- | ------------------ |
| 1 | 0:00–0:03 | Hook | "K2 is here" | "Running events just got simpler." | Logo tile pops in at 0.2 s, headline slides up word by word |
| 2 | ... | ... | ... | ... | ... |

Notes covered:
- "Start with a quick intro to Cloudflare" → scene 2
- "End with a keep-in-touch card with my name" → scene 7

Needs your confirmation: <facts or figures not in the brief, or "nothing">

Reply **go** to build, or tell me what to change.
```

## Rules for the plan

- **Time:** start–end for each scene, adding up to the total length. Times are `m:ss`.
- **On screen:** the exact words, quoted, as they will appear. Keep them short. Each block must fit in `rules.maxTextLinesPerBlock` lines at the minimum font size and stay on screen for its reading time.
- **Voice-over:** the exact narration line, or "–" when there's no voice-over. At `voiceover.wordsPerMinute`, the line must fit inside the scene with about 0.5 s to spare.
- **Visuals and motion:** the pattern (see [styles.md](styles.md)), what moves and how, and the transition into the next scene. Name icons by id. On the MP4 route, use only the patterns, text slots and transitions in [mp4-route.md](mp4-route.md), so the confirmed plan maps straight to `plan.json`.
- **Hook:** scene 1 shows something moving within 0.5 s, and the hook lands within 1.5 s.
- **Variety:** don't use the same pattern twice in a row unless the outline asks for it. Avoid a run of title cards.
- **Script mode:** quote the user's script verbatim across the scenes. If you had to trim, list each trim under Assumptions.
- **Manual outline:** one row per outline scene, in order, labelled with its id (s1, s2, ...). Add no extra scenes, except a 1–2 s hook when the outline has none; say so under Assumptions.
