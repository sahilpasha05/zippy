# Zippy x Kadur – "Coming Soon" teaser (Remotion, 1080x1920, 30fps, 25s)
Structure: `timing.json` (single source of truth for scenes/cues) · `src/scenes/Scene1–9.tsx` · `src/typography.tsx` · `src/media.tsx` (footage slots + grade) · `scripts/make-audio.py` (score synced to timing.json) · `public/assets/` (your footage) · `ASSETS.md` (shot list).
Logo files are the originals from the app (`public/logo-mark.png`, `public/logo-zippy.png`).
Render: `npx remotion render src/index.ts ZippyKadurImages out/zippy-kadur-A-with-images-voiceover.mp4` (typography-only variant: composition ZippyKadurType). See ASSETS.md.

## Voice-over
`scripts/make-voice.py` (Kokoro neural TTS via sherpa-onnx, speaker 5 = am_adam) reads the on-screen lines at the cues in `timing.json`, writes `public/voice.wav` and `src/voice.json`; the music ducks under each line. Model: `kokoro-en-v0_19` from github.com/k2-fsa/sherpa-onnx/releases (tts-models). Try other voices: `python3 scripts/make-voice.py 10` (bm_lewis), `9` (bm_george), `3` (af_sarah). A human voice-over recording can replace `public/voice.wav` (keep it 25 s, 44.1 kHz).
Note: the English voice reads "Kadur" with an English accent; a recorded voice-over is better for the final.
