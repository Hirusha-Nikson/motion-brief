---
name: estimate
description: MotionBrief command. Reports the usage estimate for a MotionBrief prompt without building anything. Use only when the user runs /motion-brief:estimate.
disable-model-invocation: true
argument-hint: "[pasted motion-brief prompt]"
---

Use the **motion-brief** skill's step 1 to check the MotionBrief prompt (from the arguments, or the most recent one in this conversation). Then report, without planning or building anything:

- the estimate tier and what it means (light: a quick build; medium: a noticeable share of a session's usage; heavy: a big build, consider a shorter cut),
- each line of `estimate.complexityNotes`,
- the platform, length (or "Claude's choice"), number of scenes, and whether voice-over, captions, music and icons are on.

The estimate is a rough guide from the brief's size, not a token count. Say so in one line.

$ARGUMENTS
