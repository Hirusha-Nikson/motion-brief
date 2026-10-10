# Build rules

Apply these on top of the Claude Motion template's own conventions. Values come from the brief.

## Canvas and safe zone

- **Stage size:** exactly `canvas.width × canvas.height` px at `canvas.fps`. If Motion only offers presets, pick the one with the same aspect ratio and size, and say so if they differ.
- **Safe-zone wrapper:** one wrapper fills the stage, with padding equal to `safeZone` (`top right bottom left`, px). Every scene renders inside it. Don't add per-element margins to fake the safe zone.
- **Edges:** only background colour, gradients and decorative motion may extend to the frame edge.

## Colours

Define the palette once and use only these variables:

```css
:root {
  --background: <theme.palette.background>;
  --surface: <theme.palette.surface>;
  --primary: <theme.palette.primary>;
  --accent: <theme.palette.accent>;
  --text: <theme.palette.text>;
  --muted-text: <theme.palette.mutedText>;
}
```

- **Allowed colours:** no other colours. Transparency is allowed only on these variables, such as a shadow from `--background`.
- **Text colours:** follow the roles in [styles.md](styles.md). Text over an image needs a `--background` or `--surface` scrim that keeps contrast at `rules.minContrast` or better.

## Fonts

- **Families:** load `theme.fonts.heading` and `theme.fonts.body` from Google Fonts, in the weights the text roles use (400 and 700 when the family has them).
- **Loading:** block the first frame until they've loaded, for example by awaiting `document.fonts.load('700 64px "<heading>"')` and `document.fonts.ready`. Never let the animation start on a fallback font.
- **Fallback:** if a font can't load, stop and tell the user. Don't silently use another font.

## Text fit

For every text block:

1. **Size limits:** start at the role's natural size and never go below `minPx = ceil(canvas.height × rules.minFontPctOfHeight / 100)`.
2. **Shrink, then wrap:** shrink until the text fits on as few lines as possible within its box. Wrap only between words, never inside a word.
3. **Line limit:** at most `rules.maxTextLinesPerBlock` lines. If it still doesn't fit at `minPx`, shorten the text. Never let it overflow, and never shrink below `minPx`.
4. **Measure:** check real rendered sizes (`scrollWidth`/`scrollHeight` against the box) after fonts load, not character counts.

## Timing

- **Scene timings:** use the plan's timings exactly. Convert seconds to frames with `canvas.fps`.
- **Reading time:** each text block stays fully visible for at least `words ÷ rules.readingWordsPerSec` seconds, not counting its entrance and exit.
- **Hook:** something moves by 0.5 s, and the hook is readable by 1.5 s.

## Motion

- **Easing and durations:** use the motion style's easing and durations from [styles.md](styles.md). Stagger items that enter together.
- **Entrances and exits:** every element has a deliberate entrance and exit. Nothing pops in or out without one, except on purpose on a beat.
- **Real motion:** a slow zoom or fade on a static card doesn't count as motion. Each scene needs at least one element that moves meaningfully.
- **Transitions:** keep text from different scenes from overlapping during transitions. Exit first, or cross-fade non-text elements only.

## Images

- **Attachments:** use only images the user attached. Place each one where the plan says.
- **Text in images:** if an image already contains text, don't repeat that text on screen.
