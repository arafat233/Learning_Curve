// Pure data and helpers split out of main.js (no Electron dependency, unit-testable).
function compareVersions(a, b) {
  const pa = String(a || '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}


const SCENARIOS = [
  { id: 'faang-backend', name: 'FAANG backend round', track: 'backend', interviewType: 'coding', mockStyle: 'confidence' },
  { id: 'startup-cto', name: 'Startup CTO screen', track: 'backend', interviewType: 'system-design', mockStyle: 'confidence' },
  { id: 'product-sense', name: 'Product sense round', track: 'pm', interviewType: 'auto', mockStyle: 'standard' },
  { id: 'system-design-deep', name: 'System design deep dive', track: 'system-design', interviewType: 'system-design', mockStyle: 'confidence' },
  { id: 'bar-raiser', name: 'Behavioral bar raiser', track: 'behavioral', interviewType: 'behavioral', mockStyle: 'confidence' },
  { id: 'hiring-manager', name: 'Final hiring manager round', track: 'general', interviewType: 'recruiter', mockStyle: 'standard' },
];
const PERSONAS = [
  { id: 'staff-engineer', name: 'Strict staff engineer', prompt: 'Act like a senior staff engineer. Probe tradeoffs, correctness, scale, and ambiguity.' },
  { id: 'friendly-recruiter', name: 'Friendly recruiter', prompt: 'Act like a friendly recruiter. Focus on motivation, clarity, role fit, logistics, and concise examples.' },
  { id: 'skeptical-manager', name: 'Skeptical hiring manager', prompt: 'Act like a skeptical hiring manager. Challenge vague impact, ownership, conflict, and decision quality.' },
  { id: 'system-designer', name: 'System design deep-dive', prompt: 'Act like a system design interviewer. Push on APIs, storage, bottlenecks, failure modes, and scale.' },
  { id: 'fast-dsa', name: 'Fast DSA interviewer', prompt: 'Act like a fast coding interviewer. Ask concise algorithm questions and push for complexity and edge cases.' },
];
const QUESTION_LIBRARY = {
  behavioral: [
    'Tell me about a time you handled conflict.',
    'Describe a failure and what you changed afterward.',
    'Tell me about a time you influenced without authority.',
    'What is your proudest project and why?',
  ],
  systemDesign: [
    'Design a URL shortener.',
    'Design a real-time chat system.',
    'Design a rate limiter.',
    'Design an event-driven notification service.',
  ],
  coding: [
    'Find the longest substring without repeating characters.',
    'Merge overlapping intervals.',
    'Find the lowest common ancestor in a binary tree.',
    'Design an LRU cache.',
  ],
  recruiter: [
    'Walk me through your background.',
    'Why are you interested in this company?',
    'What are your compensation expectations?',
    'When could you start?',
  ],
  product: [
    'How would you prioritize a roadmap with limited engineering capacity?',
    'Define success metrics for a new onboarding flow.',
    'How would you investigate a drop in conversion?',
  ],
};
const PRIVACY_MATRIX = [
  ['Live transcription', 'Deepgram sends audio to Deepgram; Sherpa/Whisper stay local.'],
  ['Live answer generation', 'API backend sends recent transcript, question, and saved profile context to the model provider. CLI backend uses the local Claude CLI. Local backend sends prompts only to the configured local HTTP endpoint.'],
  ['Company research', 'Sends company and role to the model provider with web search enabled.'],
  ['Screenshot solve/review', 'Sends the captured screenshot or selected region to the model provider.'],
  ['Prep pack and reports', 'Sends saved profile context and session history to the model provider.'],
  ['Telemetry', 'Only product event metadata is sent, and only when telemetry opt-in plus endpoint are configured.'],
];


const PANIC_PHRASES = [
  'Let me structure that in two parts.',
  'I want to clarify the goal first.',
  'The tradeoff I would start with is this.',
  'A concrete example from my experience is...',
  'I would first define success, then work backward.',
  'Let me think through the edge cases out loud.',
];
const randomPanicPhrase = () => PANIC_PHRASES[Math.floor(Math.random() * PANIC_PHRASES.length)];

function markdownToHtml(md) {
  const escHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;line-height:1.5;color:#111;padding:32px;max-width:860px;margin:auto}pre{white-space:pre-wrap}h1,h2,h3{line-height:1.2}</style>' +
    escHtml(md).split('\n').map(line => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      return line.trim() ? `<p>${line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</p>` : '';
    }).join('\n');
}


function localClassifyQuestion(question) {
  const q = String(question || '').toLowerCase();
  const rules = [
    ['coding', /\b(code|algorithm|leetcode|array|string|tree|graph|complexity|function|bug|debug|implement)\b/],
    ['system-design', /\b(design|scale|architecture|distributed|database|cache|queue|load balancer|throughput)\b/],
    ['behavioral', /\b(tell me about a time|conflict|failure|challenge|leadership|disagree|mistake|proud|difficult)\b/],
    ['recruiter', /\b(salary|compensation|notice period|visa|location|availability|why this company|why do you want)\b/],
    ['project', /\b(project|built|worked on|ownership|impact|users|launched)\b/],
    ['resume', /\b(resume|background|experience|walk me through|career)\b/],
  ];
  const found = rules.find(([, re]) => re.test(q));
  return {
    type: found?.[0] || 'general',
    confidence: found ? 0.75 : 0.45,
    reason: found ? 'Matched local keyword pattern.' : 'No strong local pattern matched.',
  };
}

function localScoreDetails(question, answer) {
  const a = String(answer || '');
  const wordCount = (a.match(/\S+/g) || []).length;
  const hasBullets = /^\s*[-*]/m.test(a);
  const hasMetric = /\b\d+%|\b\d+x|\b\d+\s*(users|requests|customers|ms|seconds|minutes|hours|days|revenue|cost)\b/i.test(a);
  const hasHedge = /\bprobably|maybe|sort of|kind of|i guess|i think\b/i.test(a);
  const qType = localClassifyQuestion(question).type;
  const clarity = Math.max(4, Math.min(10, 9 - (wordCount > 220 ? 2 : 0) + (hasBullets ? 1 : 0)));
  const structure = Math.max(4, Math.min(10, (hasBullets ? 8 : 6) + (/\b(first|second|finally|situation|task|action|result)\b/i.test(a) ? 1 : 0)));
  const specificity = Math.max(3, Math.min(10, hasMetric ? 8 : 5));
  const confidence = Math.max(3, Math.min(10, hasHedge ? 5 : 8));
  const technicalDepth = Math.max(4, Math.min(10, /\b(api|database|cache|latency|scale|complexity|tradeoff|test|failure|edge)\b/i.test(a) ? 8 : (qType === 'coding' || qType === 'system-design' ? 5 : 6)));
  return { clarity, structure, specificity, confidence, technicalDepth, wordCount, hasMetric, hasHedge, qType };
}

const RATES = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10], 'claude-haiku-4-5': [1, 5] };
// USD for one response's token usage; unknown models are billed at the top rate (safe for a cap).
const usageCost = (model, u) => { const r = RATES[model] || [5, 25]; return ((u.input_tokens || 0) * r[0] + (u.output_tokens || 0) * r[1]) / 1e6; };
const capReached = (cap, spent) => Number(cap) > 0 && spent >= Number(cap);

// Wraps an Anthropic `messages` object so every create/stream call is blocked past the cap and its usage is counted.
function enforceCostCap(m, { isCapped, addCost, capError }) {
  const create = m.create.bind(m), stream = m.stream.bind(m);
  m.create = async (...a) => { if (isCapped()) throw capError(); const r = await create(...a); if (r.usage) addCost(r.usage); return r; };
  m.stream = (...a) => {
    if (isCapped()) throw capError();
    const st = stream(...a);
    st.finalMessage().then(fm => { if (fm.usage) addCost(fm.usage); }).catch(() => {});
    return st;
  };
}

function buildSessionMarkdown({ turns, profile, settings, pinned, prep, report }) {
  const sec = (title, text) => (String(text || '').trim() ? `## ${title}\n\n${String(text).trim()}` : '');
  return [
    '# AI Interview Session',
    '',
    `Generated: ${new Date().toISOString()}`,
    profile ? `Profile: ${profile.name || 'Untitled profile'}` : '',
    settings.company || settings.role ? `Target: ${settings.role || 'role'} at ${settings.company || 'company'}` : '',
    '',
    '## Turns',
    '',
    turns.map((o, i) => `### ${i + 1}. ${o.kind} - ${o.t}\n\n**Q:** ${o.q}\n\n**A:**\n\n${o.a}`).join('\n\n'),
    '',
    sec('Pinned', pinned), sec('Prep Pack', prep), sec('Post Report', report),
  ].filter(Boolean).join('\n');
}

module.exports = { buildSessionMarkdown, enforceCostCap, usageCost, capReached, RATES, localClassifyQuestion, localScoreDetails, compareVersions, SCENARIOS, PERSONAS, QUESTION_LIBRARY, PRIVACY_MATRIX, randomPanicPhrase, markdownToHtml };
