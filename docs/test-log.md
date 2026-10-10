# Skill test log

Manual tests of the `motion-brief` skill in Claude, one row per example prompt. These can't run in CI: they need a Claude account, and Claude Motion needs a Team or Enterprise plan.

## How to test

1. **Install the plugin:** in claude.ai, open **Customize → Plugins → Add → Add marketplace**, enter `Hirusha-Nikson/motion-brief`, then add **MotionBrief** from the **Discover** tab. Alternatively, run `pnpm package` and upload `dist/motion-brief-plugin.zip` with **Add → Upload plugin**. Turn on **Settings → Capabilities → Code execution and file creation**.
2. **Paste an example:** in a new chat, paste the whole `prompt.md` of one example from [`examples/`](../examples).
3. **Check the plan, then the build:** check each column below, reply **go**, and check again after the build.
4. **Try an edit:** paste the example's `edit-prompt.md`, or ask for a small change in chat, and confirm that only that part changed.
5. **Record it:** add a row with the date, plan, Claude model and notes.

| Column          | Pass when                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Loads           | Claude says it's using the motion-brief skill and reports no schema errors                                                          |
| Plan            | A script and scene plan in the `refs/script-plan.md` format, covering every note, ending with "Reply **go**" and no other questions |
| Output          | An MP4 to download plus captions.srt; voice-over audible when on (the report names the voice engine)                                |
| Canvas          | Exact size and aspect ratio from the brief                                                                                          |
| Safe zone       | Nothing outside the safe zone at any moment                                                                                         |
| Fit             | No overflow; text at or above the minimum size                                                                                      |
| Colours / fonts | Only palette colours; brief fonts loaded, no fallback boxes                                                                         |
| Timing          | Scene times match the plan; text readable in time; hook within 1.5 s                                                                |
| Self-check      | A "Checked: ..." line and an honest list of open items                                                                              |
| Edit            | Only the requested part changed                                                                                                     |

## Results

| Date | Example            | Plan / model | Loads | Plan | Output | Canvas | Safe zone | Fit | Colours / fonts | Timing | Self-check | Edit | Notes |
| ---- | ------------------ | ------------ | ----- | ---- | ------ | ------ | --------- | --- | --------------- | ------ | ---------- | ---- | ----- |
|      | youtube-promo      |              |       |      |        |        |           |     |                 |        |            |      |       |
|      | reels-explainer-vo |              |       |      |        |        |           |     |                 |        |            |      |       |
|      | linkedin-stat-post |              |       |      |        |        |           |     |                 |        |            |      |       |
|      | tech-stack-icons   |              |       |      |        |        |           |     |                 |        |            |      |       |
