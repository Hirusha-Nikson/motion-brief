# Styles

Generated from `packages/brief`. Do not edit by hand.

## Motion styles (`theme.motionStyle`)

| Style | Feel | Entrance easing | Entrance | Exit | Stagger |
| --- | --- | --- | --- | --- | --- |
| `calm` | Smooth, unhurried moves with soft fades and gentle drifts | `cubic-bezier(0.33, 1, 0.68, 1)` | 700 ms | 500 ms | 120 ms |
| `snappy` | Fast, confident moves that land precisely with no bounce | `cubic-bezier(0.22, 1, 0.36, 1)` | 400 ms | 300 ms | 60 ms |
| `playful` | Bouncy pops and overshoots with lively rhythm | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 550 ms | 350 ms | 90 ms |

## Text roles

Font is `theme.fonts.heading` or `theme.fonts.body`. Colours are palette roles; use them as CSS variables.

| Role | Font | Weight | Colour | Sits on |
| --- | --- | --- | --- | --- |
| `headline` | heading | bold | `text` | – |
| `subhead` | body | regular | `mutedText` | – |
| `body` | body | regular | `text` | – |
| `label` | body | bold | `mutedText` | – |
| `stat` | heading | bold | `primary` | – |
| `quote` | heading | regular | `text` | – |
| `attribution` | body | regular | `mutedText` | – |
| `cta` | heading | bold | `background` | `primary` |

Cards and panels use `surface`. Decorative shapes may use `primary` and `accent`.

## Contrast pairs (`rules.minContrast`)

| Pair | Used for | Requirement |
| --- | --- | --- |
| `text` on `background` | headlines, body and quotes | must pass |
| `mutedText` on `background` | subheads, labels and attributions | must pass |
| `primary` on `background` | stat numbers | must pass |
| `text` on `surface` | text on cards | must pass |
| `mutedText` on `surface` | labels on cards | must pass |
| `background` on `primary` | the call-to-action button | must pass |
| `accent` on `background` | highlights | should pass |

## Scene patterns

| Pattern | Name | Use it for |
| --- | --- | --- |
| `title` | Title | A bold opening or section title |
| `kinetic-text` | Kinetic text | One idea delivered with animated typography |
| `bullets` | Bullets | Key points revealed one by one |
| `stat` | Stat | One number that lands, with a counter |
| `chart` | Chart | A trend or comparison drawn from data |
| `icon-grid` | Icon grid | A set of tools, brands or features |
| `image-focus` | Image focus | An attached image in the spotlight |
| `quote` | Quote | A testimonial or quote with attribution |
| `comparison` | Comparison | Two options side by side |
| `cta` | Call to action | What viewers should do next |
