# MP4 route

Render the confirmed plan to a real video file in the code sandbox with `scripts/render_video.py`. The renderer applies the safe zone, text fit, palette, fonts, motion style, captions and audio in code, so don't hand-write a renderer.

## 1. Set up (once per chat)

```bash
pip install pillow numpy imageio-ffmpeg edge-tts gTTS
```

- **Network approvals:** the sandbox may ask the user to approve websites. PyPI is needed for the install. The voice-over needs `speech.platform.bing.com` (edge-tts, natural neural voices) or `translate.google.com` (gTTS). Tell the user in one line which approvals to accept and why.
- **Fonts:** all brief fonts are bundled in `assets/fonts/`, so no font download is needed.

## 2. Write the files

- `brief.json`: the brief exactly as pasted.
- `plan.json`: the confirmed plan, matching [motion-plan.schema.json](motion-plan.schema.json):

```json
{
  "schema": "motion-plan/v1",
  "briefHash": "<brief.hash>",
  "title": "Docker + Kubernetes, together",
  "scenes": [
    {
      "id": "s1",
      "pattern": "kinetic-text",
      "durationSec": 3,
      "text": [
        { "role": "headline", "text": "Docker + Kubernetes" },
        { "role": "body", "text": "How they work together" }
      ],
      "voiceover": "Docker and Kubernetes. Here's how they team up.",
      "transition": "slide-up"
    }
  ]
}
```

### Text slots per pattern

`text` items fill the pattern's slots in order:

| Pattern        | `text` items                                    | Extra fields                                                    |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `title`        | headline, subhead                               |                                                                 |
| `kinetic-text` | headline (revealed word by word), body          |                                                                 |
| `bullets`      | headline, then 2–4 body items                   |                                                                 |
| `stat`         | stat, label, body                               | `stat: { value, prefix, suffix, decimals }` counts up           |
| `chart`        | headline, then one label per bar                | `chart: { values, labels, prefix, suffix }`; bars grow to scale |
| `icon-grid`    | headline, then one label per icon               | `icons: [dev-icons ids]`                                        |
| `image-focus`  | headline, body                                  | `image: "<attached file name>"`                                 |
| `quote`        | quote, attribution                              |                                                                 |
| `comparison`   | headline, left item, right item, left item, ... |                                                                 |
| `cta`          | headline, cta (on the button), body             |                                                                 |

- **`transition`:** one of `fade`, `slide-up`, `slide-left`, `wipe`, `zoom`, `pop` or `cut`. Vary it between scenes; prefer `pop` for the playful style and `fade` or `slide-up` for calm.
- **`durationSec`:** the planned length. Scenes stretch automatically to fit their spoken narration.
- **Characters:** keep on-screen text short, and don't use emoji (the fonts have none).

## 3. Icons (when the plan has any)

Resolve each name with the dev-icons skill and export PNG tiles into `icons/`:

```bash
python3 <dev-icons skill folder>/scripts/find.py docker k8s
python3 <dev-icons skill folder>/scripts/export.py docker kubernetes --theme dark --size 512 -o icons
```

Use the resolved ids (`kubernetes`, not `k8s`) in `plan.json`. Pick `--theme dark` when `theme.palette.background` is light, and `--theme light` when it's dark. Without the dev-icons skill, follow [icons.md](icons.md).

## 4. Preview, then render

```bash
python3 scripts/render_video.py --brief brief.json --plan plan.json --out out --icons icons --stills-only
python3 scripts/render_video.py --brief brief.json --plan plan.json --out out --icons icons
```

- **Preview:** the first command takes seconds and saves one frame per scene in `out/stills/`. Look at every still. Reading time is checked only in the full render, because scenes stretch to fit their narration there.
- **Full render:** writes `out/video.mp4`, `out/captions.srt`, `out/narration.txt`, `out/report.json` and fresh stills. A 15 s video renders in well under a minute; longer videos take roughly 1–3× their length.
- **Options:** `--images DIR` for attached images, `--music FILE` for the user's own music, `--tts edge|gtts|espeak|none` to force a voice engine, and `--scale 0.5` for a quick low-resolution draft of a long video.
- **Exit codes:** `0` all checks pass, `1` rendered but the report lists failures, `2` the brief or plan is invalid.

## 5. Fix what the report flags

Read the `failures` in the printed report, then:

- **Doesn't fit:** shorten that text. Don't make the font smaller.
- **Needs more time to read:** lengthen the scene's `durationSec` or cut words.
- **Contrast:** this can only come from the palette. Tell the user, and suggest a palette change on the website.

Render again, up to 3 times in total.

## 6. Present

- **Report line:** one line from the report, for example `Checked: ✓ safe zone ✓ text fit ✓ contrast ✓ no overlaps ✓ timing`.
- **Files:** give `out/video.mp4` and `out/captions.srt` as downloads, and mention `narration.txt`.
- **Voice:** name the engine and voice used (`voiceover` in the report). If it fell back to `espeak` or `none`, say why and what approval would give a natural voice.
- **Warnings:** list them, for example scenes stretched to fit narration, or a length more than 10% off the brief.
- **Music:** if the user didn't attach music, say it's an original background bed generated for this video.
