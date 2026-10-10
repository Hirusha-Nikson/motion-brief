# MotionBrief

Make Claude produce motion videos without the usual problems: overflowing text, off-brand colours, content under platform UI, missing specs, endless questions, overlapping layers, weak hooks, loose timing, no self-check, and edits that touch more than was asked.

1. **Website** (GitHub Pages): describe the video in your own words (or paste a script), pick the platform and look, add any must-haves, tick the audio you want, and copy a ready-made prompt. The prompt contains a `motion-brief` block plus compiled plain-English instructions.
2. **Claude skill/plugin** (`motion-brief`): paste the prompt into Claude. Claude writes the script and scene plan (hook, on-screen text, narration, motion graphics), asks you to confirm it, then builds the video in **Claude Motion** with strict layout, colour and timing rules and a self-check.

Claude Motion requires a Team or Enterprise plan. Without it, the skill falls back to an HTML animation artifact, or to an optional Remotion route in Claude Code.

> Status: the website and the Claude plugin both work. Manual test results in Claude are recorded in [`docs/test-log.md`](docs/test-log.md).

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

## Installing the plugin

**In claude.ai or the Claude desktop app** (once per account):

1. Open [Customize → Plugins](https://claude.ai/customize/plugins).
2. Choose **Add → Add marketplace** and enter `Hirusha-Nikson/motion-brief`. This makes the plugin available but doesn't install it.
3. Open the **Discover** tab, find **MotionBrief** and select **Add**. It then appears under **Yours**.
4. In **Settings → Capabilities**, turn on **Code execution and file creation**. Claude renders the MP4 there.

The plugin is saved to your account, so it also appears in Cowork and Claude Code. After an update, use the marketplace's **⋮ → Check for updates**.

**In Claude Code:**

```
/plugin marketplace add Hirusha-Nikson/motion-brief
/plugin install motion-brief@motion-brief
```

**Without the marketplace:** run `pnpm package`. Then upload `dist/motion-brief-plugin.zip` with **Customize → Plugins → Add → Upload plugin**, or upload only the skill, `dist/motion-brief-skill.zip`, with **Customize → Skills**. The skill alone has no slash commands.

### What works where

| Part                                                          | Chat (web, desktop, mobile)               | Cowork                    | Claude Code |
| ------------------------------------------------------------- | ----------------------------------------- | ------------------------- | ----------- |
| `motion-brief` skill: reads the prompt, plans, builds, checks | ✓                                         | ✓                         | ✓           |
| `/motion-brief:build`, `:edit`, `:estimate`, `:check`         | ✓ (loaded as skills, from the `/` menu)   | ✓                         | ✓           |
| MP4 with voice-over, captions (SRT) and music                 | ✓ with code execution turned on, any plan | ✓                         | ✓           |
| `scripts/brief_tool.py` brief checker                         | ✓ with code execution turned on           | ✓                         | ✓           |
| Claude Motion animation (no audio)                            | Team and Enterprise plans                 | Team and Enterprise plans | –           |

Sources: [Plugins](https://claude.com/docs/plugins/overview), [Plugin feature support](https://claude.com/docs/plugins/platform-support), [Get started with Claude Motion](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion).

### Using it

Paste the prompt from the website into a new chat. Claude checks the brief, shows a script and scene plan with timings, on-screen text, narration and motion, and waits for **go**. Then:

1. **Render:** it renders the video with the bundled renderer (`scripts/render_video.py`). The renderer draws every scene in your fonts and colours inside the safe zone, generates the voice-over, and times each scene to the speech.
2. **Approve websites:** when Claude asks to reach a website, approve it. PyPI installs the renderer's packages, and `speech.platform.bing.com` provides the natural voice. Fonts are bundled.
3. **Download:** you get `video.mp4`, `captions.srt` and `narration.txt`, plus a `Checked: ✓ safe zone ✓ text fit ✓ contrast ✓ no overlaps ✓ timing` line from the renderer's own measurements.
4. **Change it:** to change something, ask in the same chat. Claude edits only that scene and renders again, reusing the narration that didn't change.

A 15–30 s video renders in about a minute; longer videos take roughly 1–3× their length.

Claude Motion (Team and Enterprise) is used only for silent videos. Without code execution, Claude builds an HTML animation and tells you how to get the MP4.

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
