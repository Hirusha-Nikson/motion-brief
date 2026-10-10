# Platforms: canvas and safe zones

Generated from `packages/brief/src/presets.ts`. Do not edit by hand.

> These are starting values. **Verify them against the current platform UI**; platforms move their overlays without notice. A brief may override `safeZone`; the brief always wins.

Safe zone values are margins in px from each edge: top / right / bottom / left. All content (text, icons, images, captions) stays inside the safe zone. Only background and decorative motion may extend to the action-safe area or the frame edge.

| Platform id | Name | Canvas | fps | Safe zone (px) | Action-safe (px) | Basis |
| --- | --- | --- | --- | --- | --- | --- |
| `reels` | Instagram Reels | 1080×1920 (9:16) | 30 | 220 / 140 / 420 / 60 | same | Clears caption, buttons and profile overlays |
| `tiktok` | TikTok | 1080×1920 (9:16) | 30 | 220 / 140 / 420 / 60 | same | Clears caption, buttons and profile overlays |
| `shorts` | YouTube Shorts | 1080×1920 (9:16) | 30 | 220 / 140 / 420 / 60 | same | Clears caption, buttons and channel overlays |
| `youtube` | YouTube (16:9) | 1920×1080 (16:9) | 30 | 108 / 192 / 108 / 192 | 54 / 96 / 54 / 96 | 10% title-safe for content; 5% action-safe for edge motion |
| `presentation-16x9` | Presentation (16:9) | 1920×1080 (16:9) | 30 | 108 / 192 / 108 / 192 | 54 / 96 / 54 / 96 | 10% title-safe for content; 5% action-safe for edge motion |
| `linkedin-16x9` | LinkedIn (16:9) | 1920×1080 (16:9) | 30 | 54 / 96 / 54 / 96 | same | 5% per side |
| `linkedin-1x1` | LinkedIn (1:1) | 1080×1080 (1:1) | 30 | 54 / 54 / 54 / 54 | same | 5% per side |
| `linkedin-4x5` | LinkedIn (4:5) | 1080×1350 (4:5) | 30 | 68 / 54 / 68 / 54 | same | 5% per side |
| `square` | Square (1:1) | 1080×1080 (1:1) | 30 | 65 / 65 / 65 / 65 | same | 6% per side |
| `custom` | Custom | from `brief.canvas` | from brief | 5% per side unless set | same | 5% per side |
