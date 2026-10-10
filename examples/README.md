# Examples

Each folder holds one example. Only `source.json` is hand-written; everything else is generated from it.

| File             | What it is                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| `source.json`    | A minimal brief plus one edit (JSON Patch ops). Edit this.                |
| `brief.json`     | The complete `motion-brief/v1` brief after defaults.                      |
| `prompt.md`      | The copy-paste prompt: trigger line, `motion-brief` block, compiled spec. |
| `edit.json`      | The `motion-edit/v1` block for the edit.                                  |
| `edit-prompt.md` | The copy-paste edit prompt.                                               |

| Example              | Platform     | Shows                                        | Edit affects        |
| -------------------- | ------------ | -------------------------------------------- | ------------------- |
| `youtube-promo`      | YouTube 16:9 | Product promo, 6 scene types                 | `s6` only           |
| `reels-explainer-vo` | Reels 9:16   | Voice-over, karaoke captions, pronunciations | `s3` only           |
| `linkedin-stat-post` | LinkedIn 1:1 | Stat + chart, light palette, calm motion     | every scene (theme) |
| `tech-stack-icons`   | Shorts 9:16  | Icon grids, custom scene ids                 | `frontend` only     |

Products and numbers in these examples are fictional sample data. Icon ids in `tech-stack-icons` are provisional until the icon library is integrated (Phase 6).

After changing a `source.json` or anything in `packages/brief`, regenerate:

```sh
pnpm --filter @motionbrief/brief generate
```

`pnpm test` fails if the generated files are out of date.
