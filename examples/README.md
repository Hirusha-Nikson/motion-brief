# Examples

Each folder holds one example. Only `source.json` is hand-written; everything else is generated from it.

| File             | What it is                                                                   |
| ---------------- | ---------------------------------------------------------------------------- |
| `source.json`    | A minimal brief plus one edit (JSON Patch ops). Edit this.                   |
| `brief.json`     | The complete `motion-brief/v1` brief after defaults.                         |
| `prompt.md`      | The copy-paste prompt: trigger line, `motion-brief` block, compiled request. |
| `edit.json`      | The `motion-edit/v1` block for the edit.                                     |
| `edit-prompt.md` | The copy-paste edit prompt.                                                  |

| Example              | Platform     | Shows                                                           |
| -------------------- | ------------ | --------------------------------------------------------------- |
| `youtube-promo`      | YouTube 16:9 | Idea → Claude plans scenes; notes; music with a genre           |
| `reels-explainer-vo` | Reels 9:16   | The user's own script, voice-over, karaoke captions             |
| `linkedin-stat-post` | LinkedIn 1:1 | A manual scene outline with lengths; the edit changes one scene |
| `tech-stack-icons`   | Shorts 9:16  | Dev Icons, an icon requested in a note, length left to Claude   |

Products and numbers in these examples are fictional sample data.

After changing a `source.json` or anything in `packages/brief`, regenerate:

```sh
pnpm --filter @motionbrief/brief generate
```

`pnpm test` fails if the generated files are out of date.
