# Self-check

On the MP4 route, `scripts/render_video.py` measures safe zone, fit, font size, overlap, contrast and reading time itself and writes `report.json`. Fix its failures, look at every still, and check the whole-video items below by hand.

On the other routes, run this whole list before presenting the video. For each scene, check three moments: after the entrance settles, the middle, and just before the exit. Fix any failure, then check that scene again, up to 3 passes in total.

## Every scene

- [ ] **Safe zone:** no text, icon, image or caption is outside the safe-zone wrapper.
- [ ] **Fit:** no text block overflows its box (`scrollWidth`/`scrollHeight` at most `clientWidth`/`clientHeight`), and none has more than `rules.maxTextLinesPerBlock` lines.
- [ ] **Font size:** every text block is at least `ceil(canvas.height × rules.minFontPctOfHeight / 100)` px.
- [ ] **Fonts:** the brief's fonts are loaded and rendering; no fallback font, no boxes.
- [ ] **Overlap:** no two text boxes overlap at any of the three moments, including during transitions.
- [ ] **Contrast:** every text colour against what's behind it meets `rules.minContrast` (see the pairs in [styles.md](styles.md)).
- [ ] **Palette:** no colour outside `theme.palette`.
- [ ] **Reading time:** each text block is fully visible for at least `words ÷ rules.readingWordsPerSec` s.
- [ ] **Motion:** a deliberate entrance and exit, with real motion beyond a zoom.
- [ ] **Plan:** on-screen text and timing match the confirmed plan word for word.

## Whole video

- [ ] **Hook:** something moves by 0.5 s; the hook lands by 1.5 s.
- [ ] **Length:** the total length matches the plan.
- [ ] **Notes:** every note in the brief is visibly covered.
- [ ] **Voice-over:** each line fits inside its scene (see [audio.md](audio.md)).
- [ ] **Captions:** at most `captions.maxLines` lines, inside the safe zone, never covering other text.
- [ ] **Icons:** only real icons from the dev-icons skill; no drawn imitations (see [icons.md](icons.md)).

## Report

Present the result with one line, then any open items:

```
Checked: ✓ safe zone ✓ text fit ✓ contrast ✓ timing
Still open: <item, scene, why>   (or "nothing")
```

Use ✗ instead of ✓ for any check that still fails, and explain why under "Still open".
