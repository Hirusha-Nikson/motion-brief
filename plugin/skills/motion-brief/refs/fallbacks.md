# Routes other than the MP4 route

## Claude Motion

Claude Motion is in beta on Team and Enterprise plans; Enterprise owners turn it on under Organization settings → Artifacts. Use it only for videos without voice-over or music, because it can't add audio. Apply [build-rules.md](build-rules.md) and [checklist.md](checklist.md) on top of the Motion template's conventions. The user downloads the result with Export → MP4.

## HTML animation (no code execution, no Claude Motion)

Only when the sandbox can't run code. Tell the user in one line that turning on Settings → Capabilities → **Code execution and file creation** gets them a downloadable MP4 with voice-over instead.

Build a self-contained HTML artifact that follows [build-rules.md](build-rules.md) and [checklist.md](checklist.md), plus:

- **Stage:** a stage of exactly `canvas.width × canvas.height` px, scaled down with a CSS transform to fit the viewport, never reflowed.
- **Timeline:** one timeline drives all animation from the current time, using `requestAnimationFrame` and no CSS transitions that run on their own.
- **Controls:** play/pause, a frame scrubber, and a current-time display, all outside the stage.
- **Fonts:** Google Fonts, loaded before the timeline starts.
