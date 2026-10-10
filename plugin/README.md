# MotionBrief Claude plugin

Placeholder. Built in Phase 4 of `CLAUDE_CODE_PROMPT.md`, following the current official Claude plugin and skill docs:

- `.claude-plugin/plugin.json`: plugin manifest
- `skills/motion-brief/`: `SKILL.md`, `refs/` (generated `motion-brief.schema.json`, `platforms.md`, `checklist.md`, `motion-styles.md`, `scene-patterns.md`, `voiceover.md`) and `scripts/` (`check_frames`, `merge_audio`)
- commands: `/motion-build`, `/motion-edit`, `/motion-estimate`, `/motion-check`

The root `.claude-plugin/marketplace.json` lets users add `Hirusha-Nikson/motion-brief` as a plugin marketplace. A build script also packages the skill alone as `dist/motion-brief-skill.zip` for upload.
