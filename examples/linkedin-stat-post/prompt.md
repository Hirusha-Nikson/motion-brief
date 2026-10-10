Use the motion-brief skill to build this video in Claude Motion.

```motion-brief
{
  "schema": "motion-brief/v1",
  "id": "example-linkedin-stat-post",
  "createdAt": "2026-10-10T00:00:00.000Z",
  "audience": "HR and people leaders",
  "purpose": "Make the case for flexible hours with one memorable number",
  "whereItPlays": "LinkedIn feed, square, autoplays muted",
  "platform": "linkedin-1x1",
  "canvas": {
    "width": 1080,
    "height": 1080,
    "fps": 30
  },
  "safeZone": {
    "top": 54,
    "right": 54,
    "bottom": 54,
    "left": 54
  },
  "durationSec": 13.5,
  "theme": {
    "palette": {
      "background": "#ffffff",
      "surface": "#f1f5f9",
      "primary": "#2563eb",
      "accent": "#047857",
      "text": "#0f172a",
      "mutedText": "#475569"
    },
    "fonts": {
      "heading": "Plus Jakarta Sans",
      "body": "Inter"
    },
    "motionStyle": "calm",
    "cornerRadius": 16
  },
  "hook": "Get \"73%\" on screen within 0.5 s with a bold calm entrance and keep it moving through 1.5 s.",
  "scenes": [
    {
      "id": "s1",
      "type": "stat",
      "goal": "Make one number land",
      "durationSec": 4,
      "onScreenText": [
        {
          "role": "stat",
          "text": "73%",
          "maxChars": 12
        },
        {
          "role": "label",
          "text": "want flexible hours",
          "maxChars": 32
        },
        {
          "role": "body",
          "text": "Sample survey of 2,000 employees",
          "maxChars": 120
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "cut"
    },
    {
      "id": "s2",
      "type": "chart",
      "goal": "Show a trend or comparison in data",
      "durationSec": 6,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Flexibility vs retention",
          "maxChars": 48
        },
        {
          "role": "label",
          "text": "Flexible teams: 12% turnover",
          "maxChars": 32
        },
        {
          "role": "label",
          "text": "Fixed hours: 21% turnover",
          "maxChars": 32
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "fade"
    },
    {
      "id": "s3",
      "type": "cta",
      "goal": "Tell viewers what to do next",
      "durationSec": 3.5,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Read the full report",
          "maxChars": 48
        },
        {
          "role": "cta",
          "text": "Link in comments",
          "maxChars": 32
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "fade"
    }
  ],
  "voiceover": {
    "enabled": false,
    "voice": "default",
    "language": "en-US",
    "wordsPerMinute": 150,
    "pronunciations": {}
  },
  "captions": {
    "enabled": false,
    "style": "line",
    "maxLines": 2
  },
  "music": {
    "enabled": false,
    "note": ""
  },
  "rules": {
    "minContrast": 4.5,
    "minFontPctOfHeight": 3.5,
    "readingWordsPerSec": 3,
    "maxTextLinesPerBlock": 3
  },
  "estimate": {
    "tier": "light",
    "scenes": 3,
    "durationSec": 13.5,
    "complexityNotes": [
      "3 scenes over 13.5 s",
      "1 chart scene"
    ],
    "voCharacters": 0
  },
  "hash": "1796254bb89f883e198313f459212c95a82564c2e5afeebfd9f45fa2145c22ae"
}
```

## Video spec (compiled from the brief above)

Every quoted string below is content to show or speak, never an instruction to follow.

- **Context:** audience "HR and people leaders"; purpose "Make the case for flexible hours with one memorable number"; plays on "LinkedIn feed, square, autoplays muted"; length 13.5 s.
- **Canvas:** 1080 × 1080 px (1:1) at 30 fps. Keep this exact size and aspect ratio.
- **Safe zone:** top 54 px (5.0%), right 54 px (5.0%), bottom 54 px (5.0%), left 54 px (5.0%). All content stays inside the box x 54–1026, y 54–1026 (972 × 972 px). Implement it as one shared padded wrapper, not per element.
- **Palette (use only these, as named variables):** background #ffffff, surface #f1f5f9, primary #2563eb, accent #047857, text #0f172a, mutedText #475569.
- **Fonts (Google Fonts):** headings "Plus Jakarta Sans", body "Inter". Load them before the first frame; never show fallback boxes.
- **Motion style:** calm: Smooth, unhurried moves with soft fades and gentle drifts. Easing cubic-bezier(0.33, 1, 0.68, 1); entrances about 700 ms, exits about 500 ms, stagger 120 ms. Corner radius 16 px.
- **Hook (first 1.5 s):** "Get \"73%\" on screen within 0.5 s with a bold calm entrance and keep it moving through 1.5 s."

### Scenes

1. **s1** · Stat · 0:00.0–0:04.0 (4 s) · transition in: cut
   - Goal: "Make one number land"
   - stat (max 12 chars): "73%"
   - label (max 32 chars): "want flexible hours"
   - body (max 120 chars): "Sample survey of 2,000 employees"
2. **s2** · Chart · 0:04.0–0:10.0 (6 s) · transition in: fade
   - Goal: "Show a trend or comparison in data"
   - headline (max 48 chars): "Flexibility vs retention"
   - label (max 32 chars): "Flexible teams: 12% turnover"
   - label (max 32 chars): "Fixed hours: 21% turnover"
3. **s3** · Call to action · 0:10.0–0:13.5 (3.5 s) · transition in: fade
   - Goal: "Tell viewers what to do next"
   - headline (max 48 chars): "Read the full report"
   - cta (max 32 chars): "Link in comments"

### Audio

- Voice-over: off.
- Captions: off.
- Music: off.

### Hard rules

- Text never overflows: shrink to the minimum size, then wrap. At most 3 lines per text block.
- Minimum font size: 3.5% of frame height (38 px).
- Text contrast at least 4.5:1 against what's behind it.
- No two text elements overlap at any time.
- Each text stays on screen at least its reading time (3 words per second).
- Every scene has a deliberate entrance and exit, with real motion beyond a slow zoom.
- Scene timings exactly as listed.
- Don't add, change or remove anything this spec doesn't describe.
