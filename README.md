# AI Interview

Real-time interview copilot (Electron, Windows). Transcribes the interviewer, suggests answers, runs mock interviews, and solves coding problems from a screen region. The window is hidden from screen capture.

## Setup
```
npm install
copy .env.example .env      # add DEEPGRAM_API_KEY and ANTHROPIC_API_KEY
npm run model               # optional: local speech model (sherpa-onnx) into ./models
npm start
```
Keys are read from `.env` next to the source or the packaged `.exe`. Deepgram is only needed for cloud speech; the local model needs no key.

## Hotkeys (rebindable in Settings)
| Key | Action |
|---|---|
| Ctrl+Shift+H | Hide / show |
| Ctrl+Shift+X | Click-through |
| Ctrl+Shift+A | Answer now |
| Ctrl+Shift+S / E / R | Solve screen / review screen / pick region |
| Ctrl+Shift+O | Settings |
| Ctrl+Shift+L / U | Cycle length / expand |
| Ctrl+Shift+Y / P | Copy / pin answer |
| Ctrl+Shift+G | Panic phrase |
| Ctrl+Shift+T | Type a question |
| Ctrl+Shift+D | Dim |
| Ctrl+Shift+C | Compact |
| Ctrl+Shift+M | Next monitor |
| Ctrl+Alt+Arrows | Snap window |

## Scripts
- `npm test` — static logic checks (IPC channels wired, env keys documented)
- `npm run smoke` / `npm run runtime-smoke` — boot Electron / check local runtimes
- `npm run dist` — package to `dist/` with electron-packager

User data (settings, profiles, session logs) lives in Electron's `userData` folder; Settings has a delete-all option.

## Updates
Host a JSON file shaped like `docs/update-feed.sample.json` (e.g. as a raw GitHub file or release asset) and paste its URL into Settings → update feed URL. "Check for updates" compares `version` to the app version and links to `downloadUrl`.

## Settings worth knowing
- `maxSessionCost` (Settings → session cost cap, USD): stops cloud answers once the session spend reaches it. `0` or unset = no cap.
- `context.txt` and `profiles.json` are encrypted with the OS keystore; older plaintext copies are still read and re-encrypted on next save.

## Backends and privacy
Settings → backend: `api` (Anthropic, default), `cli` (local Claude CLI), or `local` (any OpenAI-compatible `/v1/chat/completions` server, default `http://127.0.0.1:8080`). Turn on **local-only** to block cloud answers and cloud speech. Telemetry is off unless you opt in and set an endpoint. Settings has a full table of what is sent where.

## Troubleshooting
- **"No DEEPGRAM_API_KEY in .env"**: add the key to `.env` next to the source or the `.exe`, or switch speech to the local model (`npm run model`).
- **"Deepgram unavailable, switching to local speech"**: the connection failed 3 times in a row; the app fell back to the local model.
- **"Session cost cap reached"**: raise or clear `maxSessionCost` in Settings, or start a new session.
- **"Local model unavailable"**: the local server is not running, or its endpoint is not `/v1/chat/completions`.
- **A hotkey does nothing**: another app owns that combination. Rebind it in Settings.
- **Windows SmartScreen warns on the `.exe`**: the build is not code-signed yet.

## Use responsibly
Many interviews and employers prohibit AI assistance, and this app hides itself from screen capture. You are responsible for following the rules of any interview, assessment, or meeting you use it in, and for consent laws on recording audio. Mock interviews, practice, and prep are the safest use.

## Releases
Push a tag like `v0.1.0`; CI builds the Windows app, zips it, and attaches it to a GitHub release. Regular pushes upload the zip as a build artifact.
