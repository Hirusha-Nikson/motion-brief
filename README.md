# MotionBrief

Make Claude produce motion videos without the usual problems: overflowing text, off-brand colours, content under platform UI, missing specs, endless questions, overlapping layers, weak hooks, loose timing, no self-check, and edits that touch more than was asked.

1. **Website** (GitHub Pages): configure the whole video, check the layout preview and usage estimate, then copy a validated prompt. The prompt contains a `motion-brief` block plus compiled plain-English instructions.
2. **Claude skill/plugin** (`motion-brief`): paste the prompt into Claude. The skill builds the video in **Claude Motion**, applies strict layout, colour and timing rules, and self-checks before presenting. Edits go through a `motion-edit` prompt and change only the scenes listed.

Claude Motion requires a Team or Enterprise plan. Without it, the skill falls back to an HTML animation artifact, or to an optional Remotion route in Claude Code.

> Status: early scaffold (Phase 0 of [`CLAUDE_CODE_PROMPT.md`](CLAUDE_CODE_PROMPT.md)). Nothing is usable yet.

## Quick start

_Coming in Phase 9: site → copy prompt → install plugin → paste._

## Installing the skill

_Coming in Phase 4: add this repo as a plugin marketplace, or upload `motion-brief-skill.zip` as a skill. Includes which plugin parts work in chat vs Claude Code._

## Development

Requires Node >= 22.12 and pnpm 10.

```sh
pnpm i
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

See [`CLAUDE.md`](CLAUDE.md) for the repo layout and conventions.

## Optional Remotion route: licence

The optional Remotion route (Phase 8) renders with [Remotion](https://www.remotion.dev), which is **not** MIT-licensed. Terms as checked on 2026-10-10 (Remotion 4.x, [LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)):

- **Free licence** applies to individuals, for-profit organisations with **up to 3 employees**, non-profits and not-for-profits, and anyone evaluating Remotion before commercial use. It allows commercial and non-commercial video creation and modifying Remotion for your own use.
- **Company licence** is required for everyone else (for example, a company with 4 or more employees). Pricing: [remotion.pro/license](https://remotion.pro/license). Edge cases: [remotion.pro/faq](https://remotion.pro/faq).
- Under either licence you may not sell, rent or relicense a modified copy of Remotion itself.
- Remotion has announced that the licence will change slightly in Remotion 5.0.

The main Claude Motion route doesn't use Remotion. Anyone who uses the Remotion route must hold the Remotion licence that fits them. Re-check these terms in Phase 8.
