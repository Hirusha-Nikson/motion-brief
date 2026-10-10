# MotionBrief Claude Code plugin

Placeholder. Built in Phase 5 (see `BUILD_PLAN.md`), following the current Claude Code plugin docs:

- `.claude-plugin/plugin.json`: plugin manifest
- `skills/motion-video/`: `SKILL.md` + `refs/`
- `commands/`: `/video`, `/video-edit`, `/video-estimate`, `/video-check`, `/video-render`, `/video-vo`
- `agents/video-reviewer.md`
- `hooks/hooks.json`
- `template/`: Remotion project template the plugin scaffolds from

The root `.claude-plugin/marketplace.json` (also Phase 5) lets users install with
`/plugin marketplace add Hirusha-Nikson/motion-brief`.
