# Changelog

## Unreleased
- Hardened windows (sandbox, navigation/permission guards), single-instance lock, crash handlers
- Deepgram temp tokens, automatic reconnect, fallback to local speech
- Optional `maxSessionCost` cap (USD) in settings.json
- Prompt-injection guard in the answer system prompt
- `context.txt` and `profiles.json` encrypted at rest via the OS keystore
- `lib.js` / `backends.js` split out of `main.js`; unit tests, ESLint, CI, README
