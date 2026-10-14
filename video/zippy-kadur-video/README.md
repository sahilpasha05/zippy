# Zippy x Kadur – "Coming Soon" teaser (Remotion, 1080x1920, 25s)
1. Logo and colours come from the zippy app (public/logo-zippy.png); edit `src/config.ts` to change them.
3. `npm i && npx remotion render src/index.ts ZippyKadur out/zippy-kadur-coming-soon.mp4`
   (`npx remotion studio` for live preview). `remotion.config.ts` points at a local headless Chromium; remove that line elsewhere.
Audio is synthesized (`public/music.wav`) – swap in a licensed track if you have one.
