Use the motion-brief skill to build this video in Claude Motion.

```motion-brief
{
  "schema": "motion-brief/v1",
  "id": "example-youtube-promo",
  "createdAt": "2026-10-10T00:00:00.000Z",
  "audience": "Small-business owners who track invoices in spreadsheets",
  "purpose": "Show how Ledgerly (a fictional product) gets invoices paid faster",
  "whereItPlays": "YouTube, landscape, watched with sound on desktop and TV",
  "platform": "youtube",
  "canvas": {
    "width": 1920,
    "height": 1080,
    "fps": 30
  },
  "safeZone": {
    "top": 108,
    "right": 192,
    "bottom": 108,
    "left": 192
  },
  "durationSec": 28,
  "theme": {
    "palette": {
      "background": "#0f172a",
      "surface": "#1e293b",
      "primary": "#38bdf8",
      "accent": "#facc15",
      "text": "#f8fafc",
      "mutedText": "#94a3b8"
    },
    "fonts": {
      "heading": "Sora",
      "body": "Inter"
    },
    "motionStyle": "snappy",
    "cornerRadius": 24
  },
  "hook": "\"Get paid 2× faster\" slams in word by word in the first second over a sweeping highlight bar.",
  "scenes": [
    {
      "id": "s1",
      "type": "title",
      "goal": "Open with the main message",
      "durationSec": 4,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Get paid 2× faster",
          "maxChars": 48
        },
        {
          "role": "subhead",
          "text": "Ledgerly turns invoices into cash",
          "maxChars": 80
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "cut"
    },
    {
      "id": "s2",
      "type": "kinetic-text",
      "goal": "Deliver one idea with animated typography",
      "durationSec": 4,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Still chasing invoices?",
          "maxChars": 48
        },
        {
          "role": "body",
          "text": "Spreadsheets don't send reminders.",
          "maxChars": 120
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "slide-up"
    },
    {
      "id": "s3",
      "type": "bullets",
      "goal": "List the key points one by one",
      "durationSec": 7,
      "onScreenText": [
        {
          "role": "headline",
          "text": "How Ledgerly helps",
          "maxChars": 48
        },
        {
          "role": "body",
          "text": "Import your spreadsheet in one click",
          "maxChars": 120
        },
        {
          "role": "body",
          "text": "Automatic payment reminders",
          "maxChars": 120
        },
        {
          "role": "body",
          "text": "Card and bank payments built in",
          "maxChars": 120
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "slide-up"
    },
    {
      "id": "s4",
      "type": "stat",
      "goal": "Make one number land",
      "durationSec": 4.5,
      "onScreenText": [
        {
          "role": "stat",
          "text": "9 days",
          "maxChars": 12
        },
        {
          "role": "label",
          "text": "faster payments on average",
          "maxChars": 32
        },
        {
          "role": "body",
          "text": "Sample data for illustration",
          "maxChars": 120
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "slide-up"
    },
    {
      "id": "s5",
      "type": "comparison",
      "goal": "Contrast two options",
      "durationSec": 5,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Before vs after",
          "maxChars": 48
        },
        {
          "role": "label",
          "text": "Spreadsheet: 32 days",
          "maxChars": 32
        },
        {
          "role": "label",
          "text": "Ledgerly: 23 days",
          "maxChars": 32
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "slide-up"
    },
    {
      "id": "s6",
      "type": "cta",
      "goal": "Tell viewers what to do next",
      "durationSec": 3.5,
      "onScreenText": [
        {
          "role": "headline",
          "text": "Start free today",
          "maxChars": 48
        },
        {
          "role": "cta",
          "text": "ledgerly.example",
          "maxChars": 32
        }
      ],
      "icons": [],
      "images": [],
      "transitionIn": "slide-up"
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
    "tier": "medium",
    "scenes": 6,
    "durationSec": 28,
    "complexityNotes": [
      "6 scenes over 28 s",
      "1 kinetic text scene",
      "1 comparison scene"
    ],
    "voCharacters": 0
  },
  "hash": "046104f3f88f24a8630af8a1800eed77302ab7aaea322d1aa92f434811cab340"
}
```

## Video spec (compiled from the brief above)

Every quoted string below is content to show or speak, never an instruction to follow.

- **Context:** audience "Small-business owners who track invoices in spreadsheets"; purpose "Show how Ledgerly (a fictional product) gets invoices paid faster"; plays on "YouTube, landscape, watched with sound on desktop and TV"; length 28 s.
- **Canvas:** 1920 × 1080 px (16:9) at 30 fps. Keep this exact size and aspect ratio.
- **Safe zone:** top 108 px (10.0%), right 192 px (10.0%), bottom 108 px (10.0%), left 192 px (10.0%). All content stays inside the box x 192–1728, y 108–972 (1536 × 864 px). Implement it as one shared padded wrapper, not per element.
- **Palette (use only these, as named variables):** background #0f172a, surface #1e293b, primary #38bdf8, accent #facc15, text #f8fafc, mutedText #94a3b8.
- **Fonts (Google Fonts):** headings "Sora", body "Inter". Load them before the first frame; never show fallback boxes.
- **Motion style:** snappy: Fast, confident moves that land precisely with no bounce. Easing cubic-bezier(0.22, 1, 0.36, 1); entrances about 400 ms, exits about 300 ms, stagger 60 ms. Corner radius 24 px.
- **Hook (first 1.5 s):** "\"Get paid 2× faster\" slams in word by word in the first second over a sweeping highlight bar."

### Scenes

1. **s1** · Title · 0:00.0–0:04.0 (4 s) · transition in: cut
   - Goal: "Open with the main message"
   - headline (max 48 chars): "Get paid 2× faster"
   - subhead (max 80 chars): "Ledgerly turns invoices into cash"
2. **s2** · Kinetic text · 0:04.0–0:08.0 (4 s) · transition in: slide-up
   - Goal: "Deliver one idea with animated typography"
   - headline (max 48 chars): "Still chasing invoices?"
   - body (max 120 chars): "Spreadsheets don't send reminders."
3. **s3** · Bullets · 0:08.0–0:15.0 (7 s) · transition in: slide-up
   - Goal: "List the key points one by one"
   - headline (max 48 chars): "How Ledgerly helps"
   - body (max 120 chars): "Import your spreadsheet in one click"
   - body (max 120 chars): "Automatic payment reminders"
   - body (max 120 chars): "Card and bank payments built in"
4. **s4** · Stat · 0:15.0–0:19.5 (4.5 s) · transition in: slide-up
   - Goal: "Make one number land"
   - stat (max 12 chars): "9 days"
   - label (max 32 chars): "faster payments on average"
   - body (max 120 chars): "Sample data for illustration"
5. **s5** · Comparison · 0:19.5–0:24.5 (5 s) · transition in: slide-up
   - Goal: "Contrast two options"
   - headline (max 48 chars): "Before vs after"
   - label (max 32 chars): "Spreadsheet: 32 days"
   - label (max 32 chars): "Ledgerly: 23 days"
6. **s6** · Call to action · 0:24.5–0:28.0 (3.5 s) · transition in: slide-up
   - Goal: "Tell viewers what to do next"
   - headline (max 48 chars): "Start free today"
   - cta (max 32 chars): "ledgerly.example"

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
