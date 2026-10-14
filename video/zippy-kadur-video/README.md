# Zippy x Kadur – "Coming Soon" teaser (Remotion, 1080x1920, 30fps, 25s)
Structure: `timing.json` (single source of truth for scenes/cues) · `src/scenes/Scene1–9.tsx` · `src/typography.tsx` · `src/media.tsx` (footage slots + grade) · `scripts/make-audio.py` (score synced to timing.json) · `public/assets/` (your footage) · `ASSETS.md` (shot list).
Logo files are the originals from the app (`public/logo-mark.png`, `public/logo-zippy.png`).
Render: `npx remotion render src/index.ts ZippyKadurImages out/zippy-kadur-A-with-images-voiceover.mp4` (typography-only variant: composition ZippyKadurType). See ASSETS.md.

## Voice-over
`scripts/make-voice.py` (Kokoro neural TTS via sherpa-onnx, speaker 5 = am_adam) reads the on-screen lines at the cues in `timing.json`, writes `public/voice.wav` and `src/voice.json`; the music ducks under each line. Model: `kokoro-en-v0_19` from github.com/k2-fsa/sherpa-onnx/releases (tts-models). Try other voices: `python3 scripts/make-voice.py 10` (bm_lewis), `9` (bm_george), `3` (af_sarah). A human voice-over recording can replace `public/voice.wav` (keep it 25 s, 44.1 kHz).
Note: the English voice reads "Kadur" with an English accent; a recorded voice-over is better for the final.

## Music (supplied track)
Background music = "King of Kotha" teaser theme, from 0:41 (not stored in this repo – copyrighted; you must have rights to publish it). To rebuild: `ffmpeg -ss 41 -t 26 -i <your.mp3> -ar 44100 -ac 2 public/track.wav`, then `python3 scripts/make-audio.py` (writes public/music.wav; synth is SFX-only when track.wav exists).
Cuts/text/voice are locked to the track's bar grid (96 BPM, 1.25 s bars, drop at 9.75 s = logo reveal, KADUR! at 12.25 s) via `timing.json`.
Compositions: `ZippyKadurImages` (music + voice-over), `ZippyKadurImagesNoVoice` (music only), `ZippyKadurType` (typography only).
