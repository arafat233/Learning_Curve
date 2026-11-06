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
