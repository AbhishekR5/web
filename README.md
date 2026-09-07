# Dynamic Island — Web Playground

An iPhone-style **Dynamic Island** recreated in pure HTML, CSS and vanilla
JavaScript. No frameworks, no build step, no images — the island is a black
pill whose `width`, `height` and `border-radius` morph with springy cubic-bezier
transitions, exactly like the hardware cutout + software animations on iOS.

![stack](https://img.shields.io/badge/stack-html%20%2F%20css%20%2F%20vanilla%20js-0a84ff)

## Run it

Any static file server works:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
# or
npx serve .
```

## What it does

Click the simulator buttons to feed the island live activities:

| Trigger        | Behavior |
| -------------- | -------- |
| 🎵 **Music**   | Compact "now playing" pill with equalizer → expanded player with play/pause, next/prev and a draggable scrubber (WebAudio chimes stand in for a real track) |
| 📞 **Call**    | Incoming call: pill goes *green* while it rings, expands into an accept / decline card, then turns into an active call with mute, speaker and end controls |
| ⏱ **Timer**    | Progress ring shrinks second-by-second; counts down in the background even when another activity is showing; fires a little alarm when done |
| 🚗 **Ride**    | Live activity with ETA countdown, progress bar and driver/plate details, auto-dismisses on arrival |
| 💬 **Notification** | iOS-style banner slides in *under* the island (Messages → WhatsApp → Mail → Instagram) |

Plus a mic / camera / Wi-Fi indicator row, three lock-screen wallpapers and a
"Reset all" button.

**Interaction**
- Tap the pill to expand it, tap outside / `Esc` / the `⌄` button to collapse it.
- Start a second activity and the island smoothly re-morphs to the new shape.
- Live seconds tick on the compact pill when collapsed — time keeps running.

## Files

- `index.html` — markup: the phone mock, the island and the simulator dock
- `styles.css`  — all visual styling and the morphing geometry
- `island.js`   — state machine: compact/expanded views, timers, audio cues

The demo audio is synthesized at runtime with the Web Audio API (tiny CC0-style
chimes) — the repo ships zero binary assets.
