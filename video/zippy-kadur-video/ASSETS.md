# Footage & asset list (drop files in `public/assets/`, then `npm run render`)
Each shot is a slot. Missing slots render as a dark placeholder naming the file; once every file exists the video has no placeholders.
Use only footage you own or have licensed for commercial use (e.g. your own shoot, or a commercial-use stock licence you have checked).
Do NOT present generic footage as Kadur. Slots are labelled "representative".

| File (any of .mp4 .mov .webm .jpg .png .webp) | Scene / time | Brief |
|---|---|---|
| s1-town-night | 1 · 0–3s | Real Indian town at dusk/night, streetlights, traffic, slow push-in. 3s+ |
| s2-biryani | 2 · 3–4s | Macro biryani with visible steam, warm light |
| s2-pizza | 2 · 4–5s | Pizza, natural cheese pull |
| s2-burger | 2 · 5–6s | Burger close-up |
| s2-fries | 2 · 6–7s | Crispy fries |
| s3-produce | 3 · 7–8s | Vegetables & fruit, smooth tracking |
| s3-shelves | 3 · 8–9s | Milk, snacks, grocery shelves, tracking |
| s5-town | 5 · 12–14s | Representative town street/skyline (no invented landmarks or signs) |
| s6-rider | 6 · 14–15.5s | Delivery rider moving safely through a town |
| s6-bag | 6 · 15.5–17s | Close-up of a bag carrying the real logo (shot branded, or composited with matched perspective/light) |
| s7-app | 7 · 17–19s | Real screenshot or screen recording of the Zippy app/site (portrait, ~9:19.5). Show only features that exist |

Clips: 1080×1920 or larger, ideally 30 fps, at least as long as the slot. Landscape clips are centre-cropped (cover).

Timing: edit `timing.json`; the video AND the score (`scripts/make-audio.py`) both read it, so cuts, text and hits stay in sync.
Website text: `SITE` in `src/config.ts` (currently zippykadur.com).
Commands: `npm run render` (scan assets, rebuild score, render MP4).
