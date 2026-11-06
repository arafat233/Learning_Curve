// Minimal logic checks that don't need Electron. Run: npm test
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// every ipcRenderer channel the preload uses must have a handler in main.js
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const used = [...preload.matchAll(/ipcRenderer\.(?:invoke|send)\('([\w-]+)'/g)].map((m) => m[1]);
assert(used.length > 20, 'preload channels not found');
for (const ch of used) assert(main.includes(`'${ch}'`), `no handler for IPC channel: ${ch}`);

// .env.example documents every key main.js reads
for (const k of new Set(main.match(/process\.env\.([A-Z_]+_KEY)/g) || [])) {
  assert(fs.readFileSync(path.join(root, '.env.example'), 'utf8').includes(k.split('.')[2]), `${k} missing from .env.example`);
}
console.log(`unit checks passed (${used.length} IPC channels)`);

// lib.js helpers
const lib = require('../lib');
assert.strictEqual(lib.compareVersions('1.2.0', '1.10.0'), -1);
assert.strictEqual(lib.compareVersions('2.0', '2.0.0'), 0);
assert.strictEqual(lib.compareVersions('0.1.1', '0.1.0'), 1);
assert(lib.markdownToHtml('# T\n**b** <x>').includes('<h1>T</h1>'));
assert(lib.markdownToHtml('<script>').includes('&lt;script&gt;'), 'html must be escaped');
for (const list of [lib.SCENARIOS, lib.PERSONAS]) assert.strictEqual(new Set(list.map((x) => x.id)).size, list.length, 'duplicate ids');
assert(lib.randomPanicPhrase().length > 0);
console.log('lib checks passed');

// backends.js: local chat path + endpoint validation + local-only guard
(async () => {
  const mk = (s) => require('../backends')({ getSettings: () => s, getAnthropic: () => { throw new Error('no cloud'); } });
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: ' hi ' } }] }) });
  assert.strictEqual(await mk({ backend: 'local' }).modelText({ user: 'x' }), 'hi');
  assert((await mk({ backend: 'local', localModelEndpoint: 'http://x/bad' }).modelText({ user: 'x' })).includes('must be OpenAI-compatible'));
  assert((await mk({ backend: 'api', localOnly: true }).modelText({ user: 'x' })).includes('Local-only'));
  global.fetch = realFetch;
  console.log('backend checks passed');
})().catch((e) => { console.error(e); process.exit(1); });

// scoring + classification (moved to lib.js so they can be tested)
assert.strictEqual(lib.localClassifyQuestion('Tell me about a time you had a conflict').type, 'behavioral');
assert.strictEqual(lib.localClassifyQuestion('Design a rate limiter that can scale').type, 'system-design');
assert.strictEqual(lib.localClassifyQuestion('hello there').type, 'general');
const good = lib.localScoreDetails('Tell me about a project', '- First, I cut latency 40%\n- Result: 3x throughput for 2000 users');
const weak = lib.localScoreDetails('Tell me about a project', 'I guess maybe it was sort of fine');
assert(good.hasMetric && !weak.hasMetric && weak.hasHedge);
assert(good.specificity > weak.specificity && good.confidence > weak.confidence);
console.log('scoring checks passed');
