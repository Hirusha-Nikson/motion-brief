# When Claude Motion isn't available

Claude Motion is in beta on Team and Enterprise plans; Enterprise owners turn it on under Organization settings → Artifacts. If you can't create a Motion animation, use the first route that works, and say in one line which route you used and why.

## 1. HTML animation artifact

Build a self-contained HTML artifact that follows every rule in [build-rules.md](build-rules.md) and [checklist.md](checklist.md), plus:

- **Stage:** a stage of exactly `canvas.width × canvas.height` px, scaled down with a CSS transform to fit the viewport, never reflowed.
- **Timeline:** one timeline drives all animation from the current time, so it can be scrubbed. Use `requestAnimationFrame` and no CSS transitions that run on their own.
- **Controls:** play/pause, a frame scrubber, and a current-time display, all outside the stage.
- **Fonts:** Google Fonts, loaded before the timeline starts.
- **Export:** tell the user that a screen recording is the quickest way to get a video file from this route.

## 2. Remotion in Claude Code

For an MP4 rendered from code, with real voice-over, the user can run the same brief through the Remotion route in Claude Code (coming in a later MotionBrief release). Mention it only when the HTML route won't do, for example when the user needs an MP4 with audio.
