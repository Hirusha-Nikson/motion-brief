# Voice-over, captions and music

Claude Motion builds animations from code and exports MP4. Check what the Motion template supports for audio before promising any.

## Voice-over (`voiceover.enabled`)

- **Narration:** write it into the plan, one line per scene, in `voiceover.language`. In `script` mode, the narration is the user's script.
- **Timing:** each line takes `words × 60 ÷ voiceover.wordsPerMinute` seconds. The scene must be at least that long plus about 0.5 s.
- **Voice:** `voiceover.voice` is the user's preference in their own words. If it's empty, choose a voice that suits the video.
- **If Motion can add audio:** add the narration and keep it in sync with the scenes.
- **If Motion can't add audio:** still time the scenes to the narration. After presenting the video, tell the user in one line: "Audio isn't supported in Claude Motion yet: record or generate the narration below and add it to the exported MP4 in any video editor." Then give the full narration with scene timestamps.

## Captions (`captions.enabled`)

- **Placement:** in a caption band at the bottom of the safe zone, at most `captions.maxLines` lines, at or above the minimum font size, in `--text` on a `--surface` or `--background` scrim.
- **`line` style:** show one phrase at a time, in sync with the narration.
- **`karaoke` style:** the full phrase shows, and each word highlights in `--accent` as it's spoken.
- **Layout:** keep other text out of the caption band while captions are on.
- **Without voice-over:** captions show the key on-screen message only when the plan calls for it.

## Music (`music.enabled`)

- **Genre:** use `music.genre` if given. If it's empty, pick a style that suits the topic and motion style, and name it under Assumptions in the plan.
- **Mix:** keep music quiet under narration, and fade it in and out.
- **If Motion can't add audio:** tell the user which genre and tempo to use and add it after export, in the same one line as the voice-over note.
