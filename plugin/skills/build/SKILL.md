---
name: build
description: MotionBrief command. Builds a motion video from a pasted MotionBrief prompt or brief.json. Use only when the user runs /motion-brief:build.
disable-model-invocation: true
argument-hint: "[pasted motion-brief prompt]"
---

Use the **motion-brief** skill to build a video from this MotionBrief prompt. Follow all of its steps: check the brief, show the script and scene plan, wait for the user's go, build in Claude Motion, and self-check before presenting.

If no `motion-brief` code block or `brief.json` was given, ask the user to paste the prompt they copied from https://hirusha-nikson.github.io/motion-brief/ and stop.

$ARGUMENTS
