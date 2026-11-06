# Changelog

## Unreleased
- CLI backend (`claude -p`) now works for all text features, no API key needed
- Mock mode: optional spoken interviewer questions (Voice button) and a 90s answer timer
- Settings: "Review weakest answer" drill; export/import backup of profiles, sessions and reports
- `settings.html` split into css/js; sherpa speech and session log split out of `main.js`
- Hardened windows (sandbox, navigation/permission guards), single-instance lock, crash handlers
- Deepgram temp tokens, automatic reconnect, fallback to local speech
- Optional `maxSessionCost` cap (USD) in settings.json
- Prompt-injection guard in the answer system prompt
- `context.txt` and `profiles.json` encrypted at rest via the OS keystore
- `lib.js` / `backends.js` split out of `main.js`; unit tests, ESLint, CI, README
