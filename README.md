# MotionBrief

Make Claude produce motion videos without the usual problems: overflowing text, off-brand colours, content under platform UI, missing specs, endless questions, overlapping layers, weak hooks, loose timing, no self-check, and edits that touch more than was asked.

1. **Website** (GitHub Pages): describe the video in your own words (or paste a script), pick the platform and look, add any must-haves, tick the audio you want, and copy a ready-made prompt. The prompt contains a `motion-brief` block plus compiled plain-English instructions.
2. **Claude skill/plugin** (`motion-brief`): paste the prompt into Claude. Claude writes the script and scene plan (hook, on-screen text, narration, motion graphics), asks you to confirm it, then builds the video in **Claude Motion** with strict layout, colour and timing rules and a self-check.

Claude Motion requires a Team or Enterprise plan. Without it, the skill falls back to an HTML animation artifact, or to an optional Remotion route in Claude Code.

> Status: the website builder works (Phase 2 of [`CLAUDE_CODE_PROMPT.md`](CLAUDE_CODE_PROMPT.md)). The Claude skill that reads the prompt arrives in Phase 4.

## Quick start

_Coming in Phase 9: site → copy prompt → install plugin → paste._

## The website

**https://hirusha-nikson.github.io/motion-brief/** (deployed from `main` by GitHub Actions)

1. **Idea:** what the video is about. A one-liner like "Cloudflare K2 new event tool" works; so does a long prompt or your own script.
2. **Platform:** where it's posted, and a length (or let Claude decide).
3. **Theme:** palette, fonts and motion style, with live contrast checks.
4. **Scenes & notes:** let Claude plan the scenes (recommended) or outline them in plain text. Add notes such as "start with a quick intro to Cloudflare" or "end with a keep-in-touch card with my name". Tick icons to use tech and brand logos from the [Dev Icons skill](https://github.com/Hirusha-Nikson/pro-icons-skill); ask for specific icons in a note.
5. **Audio:** tick voice-over, captions and music. Leave the music genre empty and Claude picks.
6. **Review & export:** copy or download the prompt, then paste it into Claude.

The **style preview** shows sample frames at the real size with your safe zone, colours and fonts. Claude writes the real scenes.

Everything stays in your browser. Drafts autosave locally, share links carry the brief in the URL, and the site never asks for API keys. Fonts load from Google Fonts.

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
pnpm --filter @motionbrief/site dev   # site at http://localhost:5173
```

See [`CLAUDE.md`](CLAUDE.md) for the repo layout and conventions.

**Deploying the site:** in the GitHub repo, open Settings → Pages and set Source to **GitHub Actions** (once). After that, every push to `main` runs [`pages.yml`](.github/workflows/pages.yml) and publishes `apps/site`. The site is built for the `/motion-brief/` path; set `BASE_PATH` when building for another host.

## Optional Remotion route: licence

The optional Remotion route (Phase 8) renders with [Remotion](https://www.remotion.dev), which is **not** MIT-licensed. Terms as checked on 2026-10-10 (Remotion 4.x, [LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)):

- **Free licence** applies to individuals, for-profit organisations with **up to 3 employees**, non-profits and not-for-profits, and anyone evaluating Remotion before commercial use. It allows commercial and non-commercial video creation and modifying Remotion for your own use.
- **Company licence** is required for everyone else (for example, a company with 4 or more employees). Pricing: [remotion.pro/license](https://remotion.pro/license). Edge cases: [remotion.pro/faq](https://remotion.pro/faq).
- Under either licence you may not sell, rent or relicense a modified copy of Remotion itself.
- Remotion has announced that the licence will change slightly in Remotion 5.0.

The main Claude Motion route doesn't use Remotion. Anyone who uses the Remotion route must hold the Remotion licence that fits them. Re-check these terms in Phase 8.
