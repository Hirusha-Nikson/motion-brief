# MotionBrief

Make Claude produce motion videos that respect platform specs: no text overflow, no colour drift, safe zones honoured, and every build self-checked.

1. **Website** (GitHub Pages): configure a video, watch a live preview, see a usage estimate, then copy a `motion-brief` block.
2. **Claude Code plugin**: paste the block into `/video`. The plugin validates it, generates scenes, runs QA, adds voice-over and captions, and renders the video. Edits go through `/video-edit` with a `motion-edit` block, which regenerates only the scenes that changed.

> Status: early scaffold (Phase 0 of [`BUILD_PLAN.md`](BUILD_PLAN.md)). Nothing is usable yet.

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

## Remotion licence

Videos are rendered with [Remotion](https://www.remotion.dev), which is **not** MIT-licensed. Terms as checked on 2026-10-10 (Remotion 4.x, [LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)):

- **Free licence** applies to individuals, for-profit organisations with **up to 3 employees**, non-profits and not-for-profits, and anyone evaluating Remotion before commercial use. It allows commercial and non-commercial video creation and modifying Remotion for your own use.
- **Company licence** is required for everyone else (for example, a company with 4 or more employees). Pricing: [remotion.pro/license](https://remotion.pro/license). Edge cases: [remotion.pro/faq](https://remotion.pro/faq).
- Under either licence you may not sell, rent or relicense a modified copy of Remotion itself.
- Remotion has announced that the licence will change slightly in Remotion 5.0.

MotionBrief depends on Remotion but does not change its licence. **Each user who renders videos must hold the Remotion licence that fits them.** Check the current terms before relying on this summary.
