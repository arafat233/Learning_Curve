  const $ = id => document.getElementById(id);
  let dash = null;
  let profilesData = { activeId: 'default', profiles: [] };
  let templates = [];
  let qlibData = {};
  let timelineRows = [];
  let codeSections = {};
  function setupTabs(){
    const legacy = $('legacyContent');
    const children = Array.from(legacy.children);
    const firstCards = children.filter(el => el.classList?.contains('card'));
    const profileCard = firstCards.find(el => el.textContent.includes('Profile Manager'));
    const privacyCard = firstCards.find(el => el.textContent.includes('Privacy and Reliability'));
    const shortcutCard = firstCards.find(el => el.textContent.includes('Shortcut Settings'));
    const historyCard = firstCards.find(el => el.textContent.includes('Session Dashboard'));
    const codingCard = firstCards.find(el => el.textContent.includes('Coding Workspace'));
    const liveTab = $('tab-live');
    for (const el of children) {
      if (!el.classList?.contains('card') && el.id !== 'practiceConsole' && el.id !== 'prepConsole') liveTab.appendChild(el);
    }
    if (profileCard) $('tab-profiles').appendChild(profileCard);
    const analyze = document.createElement('div');
    analyze.className = 'card';
    analyze.innerHTML = '<h2>Profile Strength Analyzer</h2><button id="analyzeProfile" class="sec">Analyze active profile</button><pre id="profileOut"></pre>';
    $('tab-profiles').appendChild(analyze);
    if (privacyCard) $('tab-settings').appendChild(privacyCard);
    if (shortcutCard) $('tab-settings').appendChild(shortcutCard);
    if (historyCard) $('tab-history').appendChild(historyCard);
    if (codingCard) $('tab-coding').appendChild(codingCard);
    $('tab-practice').appendChild($('practiceConsole'));
    $('tab-prep').appendChild($('prepConsole'));
    legacy.remove();
    $('tab-live').appendChild($('answerTools'));
    $('tab-prep').appendChild($('jdMatchPanel'));
    $('tab-practice').appendChild($('drillPanel'));
    $('tab-history').appendChild($('sessionComparePanel'));
    $('tab-coding').appendChild($('codeTestsPanel'));
    $('tab-settings').appendChild($('privacyMatrixPanel'));
    $('newPanels').remove();
    document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b === btn));
      document.querySelectorAll('.section').forEach(s => s.classList.toggle('on', s.id === 'tab-' + btn.dataset.tab));
    });
  }
  function html(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function activeProfile(){
    return profilesData.profiles.find(p => p.id === profilesData.activeId) || profilesData.profiles[0];
  }
  function captureProfileForm(){
    const p = activeProfile();
    if (!p) return;
    p.name = $('profileName').value.trim() || 'Untitled profile';
    p.resume = $('profileResume').value;
    p.jobDescription = $('profileJd').value;
    p.company = $('company').value.trim();
    p.role = $('role').value.trim();
  }
  function renderProfiles(){
    $('profileSelect').innerHTML = profilesData.profiles.map(p => `<option value="${html(p.id)}">${html(p.name || 'Untitled profile')}</option>`).join('');
    $('profileSelect').value = profilesData.activeId;
    const p = activeProfile();
    if (!p) return;
    $('profileName').value = p.name || '';
    $('profileResume').value = p.resume || '';
    $('profileJd').value = p.jobDescription || '';
    $('company').value = p.company || $('company').value || '';
    $('role').value = p.role || $('role').value || '';
    $('stories').innerHTML = (p.stories || []).map((s, i) => `
      <div class="story" data-i="${i}">
        <input class="story-title" placeholder="Story title" value="${html(s.title)}">
        <textarea class="story-situation" placeholder="Situation">${html(s.situation)}</textarea>
        <textarea class="story-task" placeholder="Task">${html(s.task)}</textarea>
        <textarea class="story-action" placeholder="Action">${html(s.action)}</textarea>
        <textarea class="story-result" placeholder="Result">${html(s.result)}</textarea>
        <input class="story-tags" placeholder="tags: leadership, conflict, scale" value="${html((s.tags || []).join(', '))}">
      </div>`).join('');
  }
  function captureStories(){
    const p = activeProfile();
    if (!p) return;
    p.stories = Array.from(document.querySelectorAll('.story')).map(el => ({
      title: el.querySelector('.story-title').value.trim(),
      situation: el.querySelector('.story-situation').value.trim(),
      task: el.querySelector('.story-task').value.trim(),
      action: el.querySelector('.story-action').value.trim(),
      result: el.querySelector('.story-result').value.trim(),
      tags: el.querySelector('.story-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    }));
  }
  function renderDash(){
    if (!dash) return;
    const stats = dash.stats || {};
    const currentSession = dash.activeSession || (dash.sessions || [])[dash.sessions.length - 1] || null;
    const note = currentSession ? (dash.notes || {})[currentSession.id] || {} : {};
    $('sessionStatus').textContent = dash.activeSession
      ? `Active: ${dash.activeSession.name}\nStarted: ${dash.activeSession.startedAt}`
      : `${(dash.sessions || []).length} completed session(s).`;
    $('sessionTags').value = (note.tags || []).join(', ');
    $('sessionOutcome').value = note.outcome || '';
    $('sessionNote').value = note.note || '';
    $('d-turns').textContent = stats.totalTurns || 0;
    $('d-live').textContent = stats.liveTurns || 0;
    $('d-mock').textContent = stats.mockTurns || 0;
    $('d-coding').textContent = stats.codingTurns || 0;
    const q = ($('dashSearch').value || '').toLowerCase();
    const tag = ($('dashTagFilter').value || '').toLowerCase().trim();
    const taggedSessionIds = new Set(Object.entries(dash.notes || {})
      .filter(([, n]) => !tag || (n.tags || []).join(' ').toLowerCase().includes(tag))
      .map(([id]) => id));
    const rows = (dash.turns || []).filter(t =>
      (!q || [t.kind, t.q, t.a].join(' ').toLowerCase().includes(q)) &&
      (!tag || taggedSessionIds.has(t.sessionId || 'global'))
    );
    $('dashOut').textContent = rows.slice(-20).reverse().map(t => `[${t.t}] ${t.kind}\nQ: ${t.q}\nA: ${t.a}`).join('\n\n') || 'No matching session history.';
  }
  function formatTimeline(rows){
    return (rows || []).map(r => {
      const s = r.score || {};
      return `#${r.index} [${r.t}] ${r.kind}
Scores: clarity ${s.clarity || '-'}, structure ${s.structure || '-'}, specificity ${s.specificity || '-'}, confidence ${s.confidence || '-'}, technical ${s.technicalDepth || '-'}
Q: ${r.q}
A: ${r.a}`;
    }).join('\n\n') || 'No timeline yet.';
  }
  function formatTrends(t){
    const avg = t?.averages || {};
    const weak = (t?.weakAreas || []).map(([k, v]) => `- ${k}: ${v}/10`).join('\n');
    const kinds = Object.entries(t?.byKind || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    return `Turns analyzed: ${t?.total || 0}

Average scores
- clarity: ${avg.clarity || '0.0'}/10
- structure: ${avg.structure || '0.0'}/10
- specificity: ${avg.specificity || '0.0'}/10
- confidence: ${avg.confidence || '0.0'}/10
- technical depth: ${avg.technicalDepth || '0.0'}/10

Weakest areas
${weak || '- No scored turns yet.'}

Turns by kind
${kinds || '- No turns yet.'}`;
  }
  function renderTrendViz(t){
    const avg = t?.averages || {};
    const rows = [
      ['Clarity', Number(avg.clarity) || 0],
      ['Structure', Number(avg.structure) || 0],
      ['Specificity', Number(avg.specificity) || 0],
      ['Confidence', Number(avg.confidence) || 0],
      ['Technical depth', Number(avg.technicalDepth) || 0],
    ];
    $('compareViz').classList.add('on');
    $('compareViz').innerHTML = rows.map(([name, v]) => `
      <div class="chart-row">
        <span>${name}</span>
        <span class="chart-bar"><span class="chart-fill" style="width:${Math.max(0, Math.min(100, v * 10))}%"></span></span>
        <b>${v.toFixed(1)}</b>
      </div>`).join('');
  }
  function renderTimelineAt(idx){
    const r = timelineRows[idx];
    if (!r) { $('timelineCard').classList.remove('on'); return; }
    const s = r.score || {};
    $('timelineCard').classList.add('on');
    $('timelineCard').innerHTML = `<div class="timeline-item">
      <b>#${r.index} ${html(r.kind)} - ${html(r.t)}</b>
      <div>Clarity ${s.clarity || '-'} | Structure ${s.structure || '-'} | Specificity ${s.specificity || '-'} | Confidence ${s.confidence || '-'} | Technical ${s.technicalDepth || '-'}</div>
      <p><b>Q</b>${html(r.q)}</p>
      <p><b>A</b>${html(r.a)}</p>
    </div>`;
  }
  function renderTimelinePlayer(rows){
    timelineRows = rows || [];
    $('timelineRange').max = Math.max(0, timelineRows.length - 1);
    $('timelineRange').value = Math.max(0, timelineRows.length - 1);
    renderTimelineAt(Number($('timelineRange').value));
  }
  function renderQuestionLibrary(){
    $('questionLibraryOut').textContent = Object.entries(qlibData).map(([k, qs]) => `${k}\n${qs.map(q => '- ' + q).join('\n')}`).join('\n\n');
    $('questionLibraryEdit').value = Object.entries(qlibData).flatMap(([track, qs]) => (qs || []).map(q => `${track}: ${q}`)).join('\n');
  }
  function parseQuestionLibraryEdit(){
    const out = {};
    for (const line of $('questionLibraryEdit').value.split('\n')) {
      const m = line.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      out[m[1]] = out[m[1]] || [];
      out[m[1]].push(m[2]);
    }
    return out;
  }
  function splitCodeSections(text){
    const sections = {};
    let current = 'Full answer';
    for (const line of String(text || '').split('\n')) {
      const m = line.match(/^\s*(Clarifications|Approach|Pseudocode|Code|Complexity|Edge cases|Test cases|Spoken explanation)\s*:?\s*$/i);
      if (m) { current = m[1].replace(/\b\w/g, c => c.toUpperCase()); sections[current] = ''; }
      else { sections[current] = (sections[current] || '') + line + '\n'; }
    }
    return sections;
  }
  function renderCodeSections(text){
    codeSections = splitCodeSections(text);
    const names = Object.keys(codeSections).filter(k => codeSections[k].trim());
    $('codeTabs').innerHTML = names.map((name, i) => `<button class="sec ${i === 0 ? 'on' : ''}" data-code-tab="${html(name)}">${html(name)}</button>`).join('');
    const show = (name) => {
      document.querySelectorAll('[data-code-tab]').forEach(b => b.classList.toggle('on', b.dataset.codeTab === name));
      $('codeStructured').classList.add('on');
      $('codeStructured').textContent = codeSections[name] || '';
    };
    document.querySelectorAll('[data-code-tab]').forEach(btn => btn.onclick = () => show(btn.dataset.codeTab));
    if (names[0]) show(names[0]);
  }
  function renderTemplates(){
    $('templateSelect').innerHTML = templates.length
      ? templates.map(t => `<option value="${t.id}">${html(t.title || 'Untitled template')}</option>`).join('')
      : '<option value="">No templates saved</option>';
  }
  async function loadDashboard(){
    dash = await window.api.getDashboard();
    renderDash();
    const status = await window.api.getAppStatus();
    $('status').textContent = JSON.stringify(status, null, 2);
    const conflictSet = new Set(status.shortcutConflicts || []);
    const shortcutInputs = {
      answer: 'shortcutAnswer',
      typeQuestion: 'shortcutType',
      solve: 'shortcutSolve',
      settings: 'shortcutSettings',
      review: 'shortcutReview',
      region: 'shortcutRegion',
      hide: 'shortcutHide',
      clickThrough: 'shortcutClickThrough',
      expand: 'shortcutExpand',
      copy: 'shortcutCopy',
      pin: 'shortcutPin',
      length: 'shortcutLength',
      dim: 'shortcutDim',
      compact: 'shortcutCompact',
      monitor: 'shortcutMonitor',
      panic: 'shortcutPanic',
    };
    Object.entries(shortcutInputs).forEach(([name, id]) => {
      const el = $(id);
      if (el) el.classList.toggle('conflict', conflictSet.has(name));
    });
  }
  (async () => {
    setupTabs();
    const s = await window.api.getSettings();
    profilesData = await window.api.getProfiles();
    $('model').value = s.model; $('backend').value = s.backend;
    $('localModelEndpoint').value = s.localModelEndpoint || 'http://127.0.0.1:8080/v1/chat/completions';
    $('localModelName').value = s.localModelName || 'local-model';
    $('localVisionEndpoint').value = s.localVisionEndpoint || 'http://127.0.0.1:8080/v1/chat/completions';
    $('localVisionModelName').value = s.localVisionModelName || 'local-vision-model';
    $('localModelStartCommand').value = s.localModelStartCommand || '';
    $('sttLang').value = s.sttLang; $('length').value = s.length;
    $('answerLang').value = s.answerLang || 'auto';
    $('stt').value = s.stt || 'deepgram';
    $('whisperModel').value = s.whisperModel || 'Xenova/whisper-tiny.en';
    $('interviewType').value = s.interviewType || 'auto';
    $('answerStyle').value = s.answerStyle || 'conversational';
    $('coachingMode').value = s.coachingMode || 'full';
    $('mockStyle').value = s.mockStyle || 'standard';
    $('practiceTrack').value = s.practiceTrack || 'general';
    $('localOnly').checked = !!s.localOnly;
    $('telemetryOptIn').checked = !!s.telemetryOptIn;
    $('telemetryEndpoint').value = s.telemetryEndpoint || '';
    $('updateFeedUrl').value = s.updateFeedUrl || '';
    $('compactDefault').checked = !!s.compactDefault;
    $('opacity').value = s.opacity || 1;
    $('maxSessionCost').value = s.maxSessionCost || 0;
    $('shortcutAnswer').value = s.shortcuts?.answer || 'CommandOrControl+Shift+A';
    $('shortcutType').value = s.shortcuts?.typeQuestion || 'CommandOrControl+Shift+T';
    $('shortcutSolve').value = s.shortcuts?.solve || 'CommandOrControl+Shift+S';
    $('shortcutSettings').value = s.shortcuts?.settings || 'CommandOrControl+Shift+O';
    $('shortcutReview').value = s.shortcuts?.review || 'CommandOrControl+Shift+E';
    $('shortcutRegion').value = s.shortcuts?.region || 'CommandOrControl+Shift+R';
    $('shortcutHide').value = s.shortcuts?.hide || 'CommandOrControl+Shift+H';
    $('shortcutClickThrough').value = s.shortcuts?.clickThrough || 'CommandOrControl+Shift+X';
    $('shortcutExpand').value = s.shortcuts?.expand || 'CommandOrControl+Shift+U';
    $('shortcutCopy').value = s.shortcuts?.copy || 'CommandOrControl+Shift+Y';
    $('shortcutPin').value = s.shortcuts?.pin || 'CommandOrControl+Shift+P';
    $('shortcutLength').value = s.shortcuts?.length || 'CommandOrControl+Shift+L';
    $('shortcutDim').value = s.shortcuts?.dim || 'CommandOrControl+Shift+D';
    $('shortcutCompact').value = s.shortcuts?.compact || 'CommandOrControl+Shift+C';
    $('shortcutMonitor').value = s.shortcuts?.monitor || 'CommandOrControl+Shift+M';
    $('shortcutPanic').value = s.shortcuts?.panic || 'CommandOrControl+Shift+G';
    $('company').value = s.company || '';
    $('role').value = s.role || '';
    $('context').value = await window.api.getContext();
    renderProfiles();
    const scenarios = await window.api.getScenarios();
    $('scenarios').innerHTML = scenarios.map(sc => `<button class="sec scenario" data-id="${sc.id}">${html(sc.name)}</button>`).join('');
    document.querySelectorAll('.scenario').forEach(btn => btn.onclick = async () => {
      const ns = await window.api.applyScenario(btn.dataset.id);
      $('practiceTrack').value = ns.practiceTrack || 'general';
      $('interviewType').value = ns.interviewType || 'auto';
      $('mockStyle').value = ns.mockStyle || 'standard';
      $('productOut').textContent = 'Scenario applied: ' + btn.textContent;
    });
    const personas = await window.api.getPersonas();
    $('mockPersona').innerHTML = personas.map(p => `<option value="${p.id}">${html(p.name)}</option>`).join('');
    $('mockPersona').value = s.mockPersona || 'staff-engineer';
    qlibData = await window.api.getQuestionLibrary();
    renderQuestionLibrary();
    const privacy = await window.api.getPrivacyMatrix();
    $('privacyMatrixOut').textContent = privacy.map(row => `${row.feature}\n${row.data}`).join('\n\n');
    templates = await window.api.getAnswerTemplates();
    renderTemplates();
    await loadDashboard();
  })();
  $('save').onclick = () => {
    captureProfileForm();
    captureStories();
    profilesData.activeId = $('profileSelect').value;
    window.api.saveSettings({
      model: $('model').value, backend: $('backend').value,
      localModelEndpoint: $('localModelEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localModelName: $('localModelName').value.trim() || 'local-model',
      localVisionEndpoint: $('localVisionEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localVisionModelName: $('localVisionModelName').value.trim() || 'local-vision-model',
      localModelStartCommand: $('localModelStartCommand').value.trim(),
      sttLang: $('sttLang').value, length: $('length').value,
      answerLang: $('answerLang').value.trim() || 'auto',
      stt: $('stt').value, whisperModel: $('whisperModel').value,
      interviewType: $('interviewType').value,
      answerStyle: $('answerStyle').value,
      coachingMode: $('coachingMode').value,
      mockStyle: $('mockStyle').value,
      mockPersona: $('mockPersona').value,
      practiceTrack: $('practiceTrack').value,
      localOnly: $('localOnly').checked,
      telemetryOptIn: $('telemetryOptIn').checked,
      telemetryEndpoint: $('telemetryEndpoint').value.trim(),
      updateFeedUrl: $('updateFeedUrl').value.trim(),
      compactDefault: $('compactDefault').checked,
      opacity: Number($('opacity').value) || 1,
      maxSessionCost: Math.max(0, Number($('maxSessionCost').value) || 0),
      shortcuts: {
        answer: $('shortcutAnswer').value.trim() || 'CommandOrControl+Shift+A',
        typeQuestion: $('shortcutType').value.trim() || 'CommandOrControl+Shift+T',
        solve: $('shortcutSolve').value.trim() || 'CommandOrControl+Shift+S',
        settings: $('shortcutSettings').value.trim() || 'CommandOrControl+Shift+O',
        review: $('shortcutReview').value.trim() || 'CommandOrControl+Shift+E',
        region: $('shortcutRegion').value.trim() || 'CommandOrControl+Shift+R',
        hide: $('shortcutHide').value.trim() || 'CommandOrControl+Shift+H',
        clickThrough: $('shortcutClickThrough').value.trim() || 'CommandOrControl+Shift+X',
        expand: $('shortcutExpand').value.trim() || 'CommandOrControl+Shift+U',
        copy: $('shortcutCopy').value.trim() || 'CommandOrControl+Shift+Y',
        pin: $('shortcutPin').value.trim() || 'CommandOrControl+Shift+P',
        length: $('shortcutLength').value.trim() || 'CommandOrControl+Shift+L',
        dim: $('shortcutDim').value.trim() || 'CommandOrControl+Shift+D',
        compact: $('shortcutCompact').value.trim() || 'CommandOrControl+Shift+C',
        monitor: $('shortcutMonitor').value.trim() || 'CommandOrControl+Shift+M',
        panic: $('shortcutPanic').value.trim() || 'CommandOrControl+Shift+G',
      },
      company: $('company').value.trim(), role: $('role').value.trim(),
      activeProfileId: profilesData.activeId,
    });
    window.api.saveContext($('context').value);
    window.api.saveProfiles(profilesData);
    const s = $('saved'); s.style.opacity = 1; setTimeout(() => s.style.opacity = 0, 1200);
  };
  $('profileSelect').onchange = () => {
    captureProfileForm();
    captureStories();
    profilesData.activeId = $('profileSelect').value;
    renderProfiles();
  };
  $('addProfile').onclick = () => {
    captureProfileForm();
    captureStories();
    const id = 'profile-' + Date.now();
    profilesData.profiles.push({ id, name: 'New profile', role: '', company: '', resume: '', jobDescription: '', stories: [] });
    profilesData.activeId = id;
    renderProfiles();
  };
  $('addStory').onclick = () => {
    captureProfileForm();
    captureStories();
    const p = activeProfile();
    p.stories = p.stories || [];
    p.stories.push({ title: '', situation: '', task: '', action: '', result: '', tags: [] });
    renderProfiles();
  };
  $('export').onclick = async () => { await window.api.exportSession(); };
  $('dashSearch').oninput = renderDash;
  $('dashTagFilter').oninput = renderDash;
  $('timelineRange').oninput = () => renderTimelineAt(Number($('timelineRange').value));
  $('startSession').onclick = async () => {
    dash = dash || await window.api.getDashboard();
    const meta = { name: $('sessionName').value.trim(), company: $('company').value.trim(), role: $('role').value.trim() };
    await window.api.startSession(meta);
    await loadDashboard();
  };
  $('endSession').onclick = async () => {
    await window.api.endSession();
    await loadDashboard();
  };
  $('saveSessionNote').onclick = async () => {
    const sessions = dash?.sessions || [];
    const currentSession = dash?.activeSession || sessions[sessions.length - 1] || null;
    await window.api.saveSessionNote({
      sessionId: currentSession?.id || '',
      tags: $('sessionTags').value,
      outcome: $('sessionOutcome').value,
      note: $('sessionNote').value,
    });
    await loadDashboard();
    $('productOut').textContent = 'Session notes saved.';
  };
  $('prep').onclick = async () => {
    $('productOut').textContent = 'Generating prep pack...';
    $('productOut').textContent = await window.api.generatePrepPack();
  };
  $('prep2').onclick = async () => {
    $('prepOut').textContent = 'Generating prep pack...';
    $('prepOut').textContent = await window.api.generatePrepPack();
  };
  $('companyPack').onclick = async () => {
    captureProfileForm();
    captureStories();
    window.api.saveProfiles(profilesData);
    $('prepOut').textContent = 'Generating company question pack...';
    $('prepOut').textContent = await window.api.generateCompanyPack();
  };
  $('post').onclick = async () => {
    $('productOut').textContent = 'Generating post-report...';
    $('productOut').textContent = await window.api.generatePostReport();
    await loadDashboard();
  };
  $('deleteData').onclick = async () => {
    if (!confirm('Delete local profiles, session history, pinned answers, reports, and saved context?')) return;
    await window.api.deleteUserData();
    $('context').value = '';
    await loadDashboard();
  };
  $('checkUpdates').onclick = async () => {
    $('updateOut').textContent = 'Checking for updates...';
    const result = await window.api.checkForUpdates();
    $('updateOut').textContent = JSON.stringify(result, null, 2);
    if (result.hasUpdate && result.downloadUrl && confirm(`Version ${result.latestVersion} is available. Open download page?`)) {
      window.api.openUrl(result.downloadUrl);
    }
  };
  $('startLocalModel').onclick = async () => {
    window.api.saveSettings({
      localModelEndpoint: $('localModelEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localModelName: $('localModelName').value.trim() || 'local-model',
      localVisionEndpoint: $('localVisionEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localVisionModelName: $('localVisionModelName').value.trim() || 'local-vision-model',
      localModelStartCommand: $('localModelStartCommand').value.trim(),
    });
    $('updateOut').textContent = await window.api.startLocalModel();
    await loadDashboard();
  };
  $('checkLocalRuntime').onclick = async () => {
    window.api.saveSettings({
      localModelEndpoint: $('localModelEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localModelName: $('localModelName').value.trim() || 'local-model',
      localVisionEndpoint: $('localVisionEndpoint').value.trim() || 'http://127.0.0.1:8080/v1/chat/completions',
      localVisionModelName: $('localVisionModelName').value.trim() || 'local-vision-model',
    });
    $('updateOut').textContent = 'Checking local endpoints and toolchains...';
    $('updateOut').textContent = JSON.stringify(await window.api.checkLocalRuntime(), null, 2);
    await loadDashboard();
  };
  $('analyzeProfile').onclick = async () => {
    captureProfileForm();
    captureStories();
    window.api.saveProfiles(profilesData);
    $('profileOut').textContent = 'Analyzing active profile...';
    $('profileOut').textContent = await window.api.analyzeProfile();
  };
  $('replayBtn').onclick = async () => {
    $('replayOut').textContent = 'Generating replay coach...';
    $('replayOut').textContent = await window.api.replayAnswer({
      question: $('replayQ').value,
      answer: $('replayA').value,
    });
  };
  $('extractProblem').onclick = async () => {
    $('codeOut').textContent = 'Extracting problem from screen...';
    const text = await window.api.extractScreenProblem();
    $('codeProblem').value = text;
    $('codeOut').textContent = 'Problem extracted. Edit it, then solve draft.';
  };
  $('solveProblem').onclick = async () => {
    $('codeOut').textContent = 'Solving draft...';
    const solved = await window.api.solveCodingText({
      problem: $('codeProblem').value,
      language: $('codeLang').value,
    });
    $('codeOut').textContent = solved;
    renderCodeSections(solved);
    await loadDashboard();
  };
  $('scoreLatest').onclick = async () => {
    $('liveToolsOut').textContent = 'Scoring latest answer...';
    $('liveToolsOut').textContent = await window.api.scoreAnswer({});
  };
  $('rewriteLatest').onclick = async () => {
    $('liveToolsOut').textContent = 'Rewriting latest answer...';
    $('liveToolsOut').textContent = await window.api.rewriteAnswer({ mode: $('rewriteMode').value });
    await loadDashboard();
  };
  $('simulateFollowups').onclick = async () => {
    $('liveToolsOut').textContent = 'Simulating follow-ups...';
    $('liveToolsOut').textContent = await window.api.simulateFollowups({});
  };
  $('panicBtn').onclick = async () => {
    $('liveToolsOut').textContent = await window.api.panicPhrase();
  };
  $('saveTemplate').onclick = async () => {
    const item = await window.api.saveAnswerTemplate({});
    templates = await window.api.getAnswerTemplates();
    renderTemplates();
    $('liveToolsOut').textContent = item.answer ? `Saved template: ${item.title}` : 'No latest answer to save.';
  };
  $('useTemplate').onclick = async () => {
    const answer = await window.api.useAnswerTemplate($('templateSelect').value);
    $('liveToolsOut').textContent = answer || 'Choose a saved template first.';
  };
  $('matchResumeJd').onclick = async () => {
    captureProfileForm();
    captureStories();
    window.api.saveProfiles(profilesData);
    $('matchOut').textContent = 'Analyzing resume/JD match...';
    $('matchOut').textContent = await window.api.resumeJdMatch();
  };
  $('buildStories').onclick = async () => {
    captureProfileForm();
    captureStories();
    window.api.saveProfiles(profilesData);
    $('matchOut').textContent = 'Building story bank...';
    const result = await window.api.buildStoryBank();
    profilesData = await window.api.getProfiles();
    renderProfiles();
    $('matchOut').textContent = result.message || 'Done.';
  };
  $('runDrill').onclick = async () => {
    window.api.saveSettings({ mockPersona: $('mockPersona').value });
    $('questionLibraryOut').textContent = 'Creating drill...';
    const result = await window.api.runDrill({ track: $('drillTrack').value });
    $('questionLibraryOut').textContent = `Question:\n${result.question}\n\nCoach:\n${result.coach}`;
  };
  $('saveQuestionLibrary').onclick = async () => {
    qlibData = await window.api.saveQuestionLibrary(parseQuestionLibraryEdit());
    renderQuestionLibrary();
    $('questionLibraryOut').textContent = 'Custom question library saved.\n\n' + $('questionLibraryOut').textContent;
  };
  $('compareSessions').onclick = async () => {
    $('compareOut').textContent = 'Comparing sessions...';
    $('compareOut').textContent = await window.api.compareSessions();
  };
  $('showTimeline').onclick = async () => {
    $('compareViz').classList.remove('on');
    renderTimelinePlayer(await window.api.getTimeline());
    $('compareOut').textContent = formatTimeline(timelineRows);
  };
  $('showTrends').onclick = async () => {
    const trends = await window.api.getTrends();
    renderTrendViz(trends);
    $('compareOut').textContent = formatTrends(trends);
  };
  $('speakingReport').onclick = async () => {
    $('compareOut').textContent = 'Analyzing speaking habits...';
    $('compareOut').textContent = await window.api.speakingReport();
  };
  $('exportMd').onclick = async () => { $('compareOut').textContent = await window.api.exportRichSession('md'); };
  $('exportHtml').onclick = async () => { $('compareOut').textContent = await window.api.exportRichSession('html'); };
  $('exportPdf').onclick = async () => { $('compareOut').textContent = await window.api.exportRichSession('pdf'); };
  $('runCodeTests').onclick = async () => {
    $('codeTestOut').textContent = 'Running coding tests...';
    $('codeTestOut').textContent = await window.api.runCodingTests({
      problem: $('codeProblem').value,
      language: $('codeLang').value,
      code: $('candidateCode').value,
    });
    await loadDashboard();
  };
