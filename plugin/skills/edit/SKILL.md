---
name: edit
description: MotionBrief command. Changes an existing MotionBrief video, from a described change or a pasted motion-edit block. Use only when the user runs /motion-brief:edit.
disable-model-invocation: true
argument-hint: "[change to make, or a motion-edit block]"
---

Use the **motion-brief** skill to change the existing video, following its "Changes after the build" step and `refs/edits.md`. Change only what the user asks for, keep everything else the same, and re-check only the scenes you touched.

If there's no video from a MotionBrief earlier in this conversation, ask the user to paste the original MotionBrief prompt first.

$ARGUMENTS
