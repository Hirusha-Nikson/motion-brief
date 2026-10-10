# Icons

Only when `icons.enabled` is true, or a note asks for a specific icon.

- **Source:** use tech and brand logos from the **dev-icons** skill (`dev-icons`, from https://github.com/Hirusha-Nikson/pro-icons-skill). Resolve every name first with its `scripts/find.py`. Ids are lowercase, for example `kubernetes` for "k8s" and `postgresql` for "postgres". Then export PNG tiles with its `scripts/export.py <ids> --size 512 -o icons`.
- **Tile theme:** the tiles are finished rounded squares. Pick `--theme dark` when `theme.palette.background` is light, and `--theme light` when it's dark, so the tiles stand out.
- **What to show:** icons for the tools, products and companies the video names, where they help the viewer. Any icon named in a note is required, in the place the note says.
- **Missing icon:** if the library doesn't have an icon, say so in the plan and use a text label instead. Never draw, trace or approximate a brand logo, and never swap in a different brand's logo. Some brands (AWS, Azure, Slack, OpenAI and others) are deliberately absent.
- **Skill not available:** tell the user once: "Icons need the Dev Icons skill: download `dev-icons.zip` from https://github.com/Hirusha-Nikson/pro-icons-skill/releases/latest and upload it in Settings → Capabilities → Skills." Then continue with text labels; the renderer shows an icon's name on a tile when its PNG is missing.
- **Placement:** use the `icon-grid` pattern with one label per icon. On other routes, keep icons inside the safe zone and at least about 8% of the shorter canvas side.
