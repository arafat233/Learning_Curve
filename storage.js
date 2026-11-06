const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

// --- user data files ---
// Runtime data belongs in Electron's userData folder, not next to source or the packaged exe.
const DATA_DIR = app.getPath('userData');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
const dataFile = (name) => path.join(DATA_DIR, name);
const legacyFile = (name) => path.join(__dirname, name);
// Files holding personal data are encrypted at rest with the OS keystore (legacy plaintext still reads fine).
const SECRET_FILES = new Set(['context.txt', 'profiles.json']);
const canEncrypt = () => app.isReady() && safeStorage.isEncryptionAvailable();
function decode(name, raw) {
  if (!raw.startsWith('enc:')) return raw;
  if (!canEncrypt()) throw new Error('keystore unavailable');
  return safeStorage.decryptString(Buffer.from(raw.slice(4), 'base64'));
}
function readTextFile(name, fallback = '') {
  for (const file of [dataFile(name), legacyFile(name)]) {
    try { return decode(name, fs.readFileSync(file, 'utf8')); } catch {}
  }
  return fallback;
}
function writeTextFile(name, value) {
  try {
    const out = SECRET_FILES.has(name) && canEncrypt() ? 'enc:' + safeStorage.encryptString(String(value)).toString('base64') : value;
    fs.writeFileSync(dataFile(name), out);
  } catch {}
}
function readJsonFile(name, fallback) {
  try { return JSON.parse(readTextFile(name, '')); } catch { return fallback; }
}
function writeJsonFile(name, value) {
  writeTextFile(name, JSON.stringify(value, null, 2));
}

// Append-only turn log (session.log), trimmed to the newest lines once it passes the size limit.
const LOG_MAX_BYTES = 2 * 1024 * 1024, LOG_KEEP_LINES = 2000;
const makeLogTurn = (getSessionId, maxBytes = LOG_MAX_BYTES) => (kind, q, a) => {
  const file = dataFile('session.log');
  try {
    fs.appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), sessionId: getSessionId(), kind, q, a }) + '\n');
    if (fs.statSync(file).size > maxBytes) {
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').trim().split('\n').slice(-LOG_KEEP_LINES).join('\n') + '\n');
    }
  } catch {}
};

module.exports = { makeLogTurn, DATA_DIR, dataFile, readTextFile, writeTextFile, readJsonFile, writeJsonFile };
