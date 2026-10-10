# Voice-over, captions and music

## MP4 route (default when there's any audio)

`scripts/render_video.py` handles all of this; see [mp4-route.md](mp4-route.md).

- **Voice-over:** narration comes from each scene's `voiceover` line. Engines are tried in order:
  1. `edge-tts`: natural neural voices; needs the user to approve `speech.platform.bing.com`.
  2. `gTTS`: Google's voice; needs `translate.google.com`.
  3. `espeak-ng`: offline and robotic, if installed.
  4. Silence, with captions and `narration.txt`.

  The voice follows `voiceover.language`, and "male" or "female" in `voiceover.voice`. Each scene stretches to fit its spoken line.

- **Captions:** when `captions.enabled`, captions are burned in at the bottom of the safe zone, timed to the spoken words, and also written to `captions.srt`.
- **Music:** when `music.enabled`, a file the user attached is used with `--music FILE`. Otherwise the renderer generates an original background bed in the motion style's tempo. It's quieter under narration and fades in and out.
- **Engine used:** tell the user which voice engine was used. If it fell back to `espeak` or silence, tell them which website approval would give a natural voice, and offer to render again.

## Claude Motion route (silent videos only)

Claude Motion builds animations from code and exports MP4 without audio. Use it only when voice-over and music are both off. If captions are on, they show the key on-screen message only where the plan calls for it.

## HTML route

No audio. Give the narration as text with timestamps, and tell the user that turning on code execution gets them an MP4 with voice-over.
