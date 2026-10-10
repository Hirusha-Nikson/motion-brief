---
name: check
description: MotionBrief command. Runs the MotionBrief self-check on the current video and reports what passes and fails. Use only when the user runs /motion-brief:check.
disable-model-invocation: true
argument-hint: "[scene ids to check, or blank for all]"
---

Use the **motion-brief** skill's self-check (`refs/checklist.md`) on the MotionBrief video in this conversation, for the scenes given in the arguments or for all scenes.

Report the checklist result line, for example `Checked: ✓ safe zone ✓ text fit ✗ contrast ✓ timing`, and list each failure with its scene, what's wrong and the fix you suggest. Don't change the video unless the user asks.

$ARGUMENTS
