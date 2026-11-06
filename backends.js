// Model backends (local OpenAI-compatible server or Anthropic API), split out of main.js.
// One OpenAI-compatible chat call; errors come back as text so callers can show them inline.
async function localChat(label, endpoint, model, max_tokens, messages) {
  try {
    if (!/\/v1\/chat\/completions\b/i.test(endpoint)) throw new Error(`${label} endpoint must be OpenAI-compatible /v1/chat/completions.`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens, messages }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return String(json.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    return `${label} model unavailable: ${e.message}`;
  }
}

const NL = String.fromCharCode(10), DBL = NL + NL;
// --- Claude CLI as a drop-in for the Anthropic SDK (subscription instead of API key) ---
const textOf = (c) => typeof c === 'string' ? c : c.map(b => {
  if (b.type !== 'text') throw new Error('Images are not supported with the CLI backend. Use the API or a local vision model.');
  return b.text;
}).join('');
function cliPrompt(system, messages) {
  const turns = messages.map(m => (messages.length > 1 ? (m.role === 'assistant' ? 'Assistant: ' : 'User: ') : '') + textOf(m.content)).join(DBL);
  return (system ? 'Instructions:' + NL + system + DBL : '') + turns;
}
// One-shot `claude -p`; the prompt goes over stdin so nothing needs shell quoting.
function cliRun(prompt, model, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    if (!/^[\w.\[\]-]+$/.test(String(model))) return reject(new Error('Invalid model name for CLI.'));
    const child = require('child_process').spawn('claude', ['-p', '--model', model], { cwd: require('os').tmpdir(), shell: true });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Claude CLI timed out.')); }, timeoutMs);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); reject(new Error('Claude CLI failed: ' + e.message)); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out.trim()) : reject(new Error('Claude CLI exited ' + code + ': ' + err.trim().slice(0, 300))); });
    child.stdin.end(prompt);
  });
}
// While backend === 'cli', route messages.create/stream through the CLI; otherwise leave them alone.
function useCliWhenSelected(m, getSettings, run = cliRun) {
  const create = m.create.bind(m), stream = m.stream.bind(m);
  const ask = async (a) => run(cliPrompt(a.system, a.messages), a.model);
  const msg = (t) => ({ content: [{ type: 'text', text: t }], usage: {} });
  m.create = (...a) => getSettings().backend === 'cli' ? ask(a[0]).then(msg) : create(...a);
  m.stream = (...a) => {
    if (getSettings().backend !== 'cli') return stream(...a);
    const p = ask(a[0]); p.catch(() => {});
    const handlers = [];
    const st = { on: (e, cb) => { if (e === 'text') handlers.push(cb); return st; },
      finalMessage: async () => { const t = await p; handlers.forEach(h => h(t)); return msg(t); } };
    return st;
  };
}

module.exports = ({ getSettings, getAnthropic }) => {
  async function modelText({ system, user, max_tokens = 1000, effort = 'medium', allowLocalOnly = false, model }) {
    const settings = getSettings();
    model = model || settings.model;
    if (settings.backend === 'local') {
      return localChat('Local', settings.localModelEndpoint || 'http://127.0.0.1:8080/v1/chat/completions', settings.localModelName || 'local-model', max_tokens,
        [{ role: 'system', content: system || '' }, { role: 'user', content: user || '' }]);
    }
    if (settings.localOnly && settings.backend === 'api' && !allowLocalOnly) {
      return 'Local-only mode is on. This feature uses a cloud model.';
    }
    const r = await getAnthropic().messages.create({
      model,
      max_tokens,
      output_config: { effort },
      system,
      messages: [{ role: 'user', content: user }],
    });
    return r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }

  async function localVisionText({ system, prompt, imageBase64, max_tokens = 1600 }) {
    const settings = getSettings();
    return localChat('Local vision',
      settings.localVisionEndpoint || settings.localModelEndpoint || 'http://127.0.0.1:8080/v1/chat/completions',
      settings.localVisionModelName || settings.localModelName || 'local-vision-model', max_tokens,
      [{ role: 'system', content: system || '' }, { role: 'user', content: [
        { type: 'text', text: prompt || '' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
      ] }]);
  }


  return { modelText, localVisionText };
};
module.exports.useCliWhenSelected = useCliWhenSelected;
module.exports.cliPrompt = cliPrompt;
