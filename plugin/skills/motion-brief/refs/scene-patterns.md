# Scene patterns

How each pattern should look and move. Text roles and colours come from [styles.md](styles.md). Every scene sits inside the safe-zone wrapper.

| Pattern        | Layout                                                          | Motion that works                                                                | Avoid                                                              |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Title          | Headline centred, optional subhead below                        | Headline in word by word or with a mask wipe; subhead fades up after one stagger | A static card with a slow zoom                                     |
| Kinetic text   | One idea, 1–6 words per beat, large                             | Words snap in on the beat, key word in `accent`, beats replace each other        | Paragraphs; more than 3 lines at once                              |
| Bullets        | Headline, then 2–4 items on `surface` cards                     | Items enter one by one with the stagger; the current item is highlighted         | Showing all items at once; more than 4 items                       |
| Stat           | One big number in `primary`, a label under it                   | Count up from 0 with the entrance easing; label follows                          | Decimals that tick unreadably fast; several stats at once          |
| Chart          | Headline, bars or a line, short labels                          | Bars grow from the baseline, values appear as they land                          | Gridlines and axis clutter; more than 6 bars                       |
| Icon grid      | Headline, a grid of icon tiles with labels                      | Tiles pop in with the stagger, in reading order                                  | Tiny icons; drawn imitation logos                                  |
| Image focus    | The attached image large, short text beside or below            | Gentle push or pan on the image, text in after it settles                        | Text over busy parts of the image; repeating text inside the image |
| Quote          | Large quote mark in `accent`, quote text, attribution           | Quote reveals line by line, attribution last                                     | Inventing quotes or attributions                                   |
| Comparison     | Two `surface` cards side by side (stacked on vertical canvases) | Left then right, then the winning side is highlighted                            | Long sentences in the cards                                        |
| Call to action | Headline, a `primary` button with `background` text             | Button pops with the motion style's overshoot (or a crisp scale for calm/snappy) | A CTA that is only on screen for under 2 s                         |

## Rhythm

- Change something every 1.5–3 s: a new beat, word, item or camera move.
- Hold the final frame of each scene long enough to read, then exit before the next scene enters. No two text elements overlap during transitions.
- In vertical formats, keep text in the upper two-thirds of the safe zone when captions are on.
