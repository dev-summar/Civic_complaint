# SwachhSetu cinematic

A 120-second product film for AI Day 2026. It plays automatically in a 16:9 stage. It is a separate project from the SwachhSetu app.

## Run

```bash
cd swachhsetu-cinematic
npm install
npm run dev
```

Open the URL Vite prints (port 5178). Fullscreen on a 1920×1080 display keeps the composition at 1:1.

## Screenshots

Drop images into `public/assets/screenshots/` and refresh. No code changes.

| File | Scene |
| --- | --- |
| `voice-assistant.png` | Voice assistant |
| `complaint-draft.png` | Complaint review |
| `location-pin.png` | Map pin |
| `photo-upload.png` | Photo attachment |
| `citizen-dashboard.png` | Citizen home |
| `complaint-tracking.png` | Tracking |
| `admin-dashboard.png` | Municipal dashboard |
| `complaint-maps.png` | Complaint maps |
| `worker-assignment.png` | Assignment / detail view |
| `complaint-detail.png` | Complaint detail with map |
| `resolution.png` | Resolution |

PNG is preferred. JPG, JPEG, and WebP with the same filename are picked up automatically. Until a file loads, the device frame keeps a glass placeholder. Frames are separate from the screenshot, so the camera moves stay the same.

## Audio

The film is silent until files are listed in `public/assets/audio/manifest.json`.

```json
{ "files": ["bed.mp3", "reveal.mp3", "whoosh.mp3", "tick.mp3", "resolve.mp3"] }
```

Put those files in `public/assets/audio/`. Cue times live in `src/config/audio.js`. Playback starts muted so the browser can autoplay the picture. Press `M` or the speaker control to unmute.

An optional logo replaces the drawn bridge mark when `public/assets/logo/manifest.json` contains `{ "file": "logo.svg" }`.

## Controls

Move the pointer to reveal the bar.

- Space: play / pause
- R: restart
- F: fullscreen
- M: mute
- Left / Right: seek 2 seconds
- 1–9: jump to a scene

`?loop=1` restarts at the end for an unattended stall. `?clean=1` hides the controls for recording. `?t=48` starts at a time in seconds.

## Recording

The clock is deterministic. From the browser console:

```js
SwachhSetuFilm.pause()
SwachhSetuFilm.seekTo(20)
SwachhSetuFilm.play()
```

For a master, fullscreen a 1920×1080 window with `?clean=1`, then record with OBS or Xbox Game Bar at 60 fps. This project does not export MP4 by itself.

Device frames use CSS 3D so uploaded screenshots stay sharp. Three.js is not used.
