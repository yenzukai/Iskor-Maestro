// ===== STATE =====
let state = {
  event: { name: '', date: '', venue: '' },
  numJudges: 0,
  judgeNames: ['', '', ''],
  criteria: [
    { id: 1, name: 'Choreography', weight: 30 },
    { id: 2, name: 'Execution', weight: 25 },
    { id: 3, name: 'Synchronization & Teamwork', weight: 20 },
    { id: 4, name: 'Stage Presence & Showmanship', weight: 15 },
    { id: 5, name: 'Costume & Concept/Theme', weight: 10 },
  ],
  groups: [],
  scores: {}, // { groupId: { judgeIndex: { criteriaId: rawScore } } } for group/solo
              // { groupId: { judgeIndex: { 'stage_N': { criteriaId: rawScore } } } } for pageant
  nextGroupId: 1,
  nextCriteriaId: 10,
  currentScoringGroupId: null,
  currentScoringJudge: 0,

  competitionType: 'group', // 'group' | 'solo' | 'pageant'

  progressiveCuts: [
    { id: 1, afterStageId: 4, advancingCount: 5, label: 'Semi-Finalists — Top 5',  enabled: true },
    { id: 2, afterStageId: 5, advancingCount: 3, label: 'Finalists — Top 3',  enabled: true },
  ],
  nextCutId: 10,

  pageantStages: [
    {
      id: 1, name: 'Best in Production Number', weight: 20, backToZero: false,
      description: 'Candidates will compete live in their summer casual wear',
      criteria: [
        { id: 1, name: 'Stage Presence', weight: 30 },
        { id: 2, name: 'Projection', weight: 30 },
        { id: 3, name: 'Mastery', weight: 20 },
        { id: 4, name: 'Poise and Bearing', weight: 20 },
      ]
    },
    {
      id: 2, name: 'Best in Talent', weight: 20, backToZero: false,
      description: 'Candidates will show-off their unique talents.',
      criteria: [
        { id: 1, name: 'Mastery', weight: 35 },
        { id: 2, name: 'Execution of Talent', weight: 35 },
        { id: 3, name: 'Stage Presence', weight: 20 },
        { id: 4, name: 'Overall Impact', weight: 10 },
      ]
    },
    {
      id: 3, name: 'Best in Swimsuit/Swimwear', weight: 20, backToZero: false,
      description: 'Candidates will compete in their swimsuit/swimwear.',
      criteria: [
        { id: 1, name: 'Confidence', weight: 30 },
        { id: 2, name: 'Stage Presence', weight: 30 },
        { id: 3, name: 'Figure', weight: 20 },
        { id: 4, name: 'Physical Fitness', weight: 20 },
      ]
    },
    {
      id: 4, name: 'Semi-Finals - Question and Answer', weight: 10, backToZero: false,
      description: 'Candidates receive different question. Determines Top 5 candidates.',
      criteria: [
        { id: 1, name: 'Wit and Content', weight: 40 },
        { id: 2, name: 'Projection and Delivery', weight: 30 },
        { id: 3, name: 'Stage Presence', weight: 20 },
        { id: 4, name: 'Overall Impact', weight: 10 },
      ]
    },
    {
      id: 5, name: 'Best in Evening Gown/Formal Attire', weight: 20, backToZero: true,
      description: 'Determines Top 3 candidates. Back-to-zero: scored independently from prior segments.',
      criteria: [
        { id: 1, name: 'Poise and Bearing', weight: 40 },
        { id: 2, name: 'Design and Fitting', weight: 25 },
        { id: 3, name: 'Stage Deportment', weight: 25 },
        { id: 4, name: 'Overall Impact', weight: 10 },
      ]
    },
    {
      id: 6, name: 'Finals - Question and Answer', weight: 10, backToZero: false,
      description: 'Top 3 candidates receive different question. Determines 2nd Runner-Up, 1st Runner-Up, and Titleholder.',
      criteria: [
        { id: 1, name: 'Wit and Content', weight: 40 },
        { id: 2, name: 'Projection and Delivery', weight: 30 },
        { id: 3, name: 'Stage Presence', weight: 20 },
        { id: 4, name: 'Overall Impact', weight: 10 },
      ]
    },
  ],
  currentPageantStage: 0,
  candidateStatus: {},
  scoringMethod: 'direct',

  rules: [
    { id: 1, text: 'Candidates must be single in their marital status', category: 'marital', affectsScoring: false, deductionType: 'none', deductionValue: 0, enabled: true },
    { id: 2, text: 'Candidates must be at least 18 years old', category: 'age', affectsScoring: false, deductionType: 'none', deductionValue: 0, enabled: true },
  ],
  nextRuleId: 10,
};

// Helper function to resolve dynamic label keywords dependent on competition format setup
function getFormatKeyword() {
  if (state.competitionType === 'pageant') return 'Candidate';
  if (state.competitionType === 'solo') return 'Contestant';
  return 'Group';
}

function getFormatKeywordPlural() {
  if (state.competitionType === 'pageant') return 'Candidates';
  if (state.competitionType === 'solo') return 'Contestants';
  return 'Groups';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('eventDate').value = today;
  checkAutosaveOnLoad();
  renderCriteria();
  updateJudgeNames();
  syncSetupFields();
  autosaveIntervalId = setInterval(autosave, 150000);
  window.addEventListener('beforeunload', () => { if (state.groups.length > 0) autosave(); });
});

// ===== TABS =====
function showTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  event.target.classList.add('active');
  if (tab === 'scoring') renderScoringPanel();
  if (tab === 'results') renderResults();
  if (tab === 'groups') renderGroups();
}

// ===== TOAST =====
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 2500);
}

// ===== PERSISTENCE =====
const AUTOSAVE_KEY = 'scoremaster_autosave';
const AUTOSAVE_META_KEY = 'scoremaster_autosave_meta';
let autosaveTimer = null;
let autosaveIntervalId = null;

function serializeState() {
  const { currentScoringGroupId, currentScoringJudge, ...saveable } = state;
  return JSON.stringify({ version: 2, savedAt: new Date().toISOString(), state: saveable });
}

function applySerializedState(json) {
  const parsed = JSON.parse(json);
  const s = parsed.state || parsed;
  state.event = s.event || state.event;
  state.numJudges = s.numJudges || state.numJudges;
  state.judgeNames = s.judgeNames || state.judgeNames;
  state.criteria = s.criteria || state.criteria;
  state.groups = s.groups || state.groups;
  state.scores = s.scores || state.scores;
  state.nextGroupId = s.nextGroupId || state.nextGroupId;
  state.nextCriteriaId = s.nextCriteriaId || state.nextCriteriaId;
  if (s.competitionType) state.competitionType = s.competitionType;
  if (s.pageantStages) state.pageantStages = s.pageantStages;
  if (s.scoringMethod) state.scoringMethod = s.scoringMethod;
  if (s.rules) state.rules = s.rules;
  if (s.nextRuleId) state.nextRuleId = s.nextRuleId;
  if (typeof s.currentPageantStage === 'number') state.currentPageantStage = s.currentPageantStage;
  if (s.progressiveCuts) state.progressiveCuts = s.progressiveCuts;
  if (s.nextCutId) state.nextCutId = s.nextCutId;
  if (s.candidateStatus) state.candidateStatus = s.candidateStatus;
}

function autosave() {
  setAutosaveStatus('saving');
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeState());
    localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify({ savedAt: new Date().toISOString() }));
    setAutosaveStatus('saved');
  } catch(e) { setAutosaveStatus('error'); }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosave, 1000);
}

function setAutosaveStatus(status) {
  const dot = document.getElementById('autosaveDot');
  const lbl = document.getElementById('autosaveLabel');
  if (!dot || !lbl) return;
  dot.className = 'autosave-dot ' + status;
  lbl.className = 'autosave-label ' + status;
  if (status === 'saving') lbl.textContent = 'Saving…';
  else if (status === 'saved') lbl.textContent = 'Saved ' + new Date().toLocaleTimeString('en-PH', {hour:'2-digit',minute:'2-digit'});
  else if (status === 'error') lbl.textContent = 'Save failed';
  else lbl.textContent = '—';
}

function checkAutosaveOnLoad() {
  try {
    const meta = localStorage.getItem(AUTOSAVE_META_KEY);
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data || !meta) return;
    const { savedAt } = JSON.parse(meta);
    document.getElementById('recoveryTime').textContent = new Date(savedAt).toLocaleString('en-PH', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    document.getElementById('recoveryBanner').style.display = 'flex';
  } catch(e) {}
}

function restoreAutosave() {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data) return;
    applySerializedState(data);
    document.getElementById('recoveryBanner').style.display = 'none';
    syncSetupFields(); renderCriteria(); updateJudgeNames(); renderGroups();
    setAutosaveStatus('saved');
    toast('Session restored! ✓', 'success');
    if (state.groups.length > 0) navigateTo('groups');
  } catch(e) { toast('Failed to restore session.', 'error'); }
}

function dismissRecovery() {
  localStorage.removeItem(AUTOSAVE_KEY);
  localStorage.removeItem(AUTOSAVE_META_KEY);
  document.getElementById('recoveryBanner').style.display = 'none';
  toast('Autosave discarded.');
}

function syncSetupFields() {
  const en = document.getElementById('eventName');
  const ed = document.getElementById('eventDate');
  const ev = document.getElementById('eventVenue');
  if (en) en.value = state.event.name || '';
  if (ed) ed.value = state.event.date || new Date().toISOString().split('T')[0];
  if (ev) ev.value = state.event.venue || '';
  const nj = document.getElementById('numJudges');
  if (nj) nj.value = state.numJudges;
  const ct = document.getElementById('competitionType');
  if (ct) ct.value = state.competitionType;
  onCompetitionTypeChange(false);
  const sm = document.getElementById('scoringMethod');
  if (sm) sm.value = state.scoringMethod;
  renderRules();
  renderProgressiveCuts();
}

function saveToFile() {
  state.event.name = document.getElementById('eventName')?.value || state.event.name;
  state.event.date = document.getElementById('eventDate')?.value || state.event.date;
  state.event.venue = document.getElementById('eventVenue')?.value || state.event.venue;
  for (let i = 0; i < state.numJudges; i++)
    state.judgeNames[i] = document.getElementById('judgeName' + i)?.value || state.judgeNames[i];
  const blob = new Blob([serializeState()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iskormaestro_${(state.event.name||'session').replace(/[^a-z0-9]/gi,'_').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Session saved to file ✓', 'success');
  autosave();
}

function openFileModal() { document.getElementById('fileModal').classList.add('open'); }
function closeFileModal() { document.getElementById('fileModal').classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fileModal').addEventListener('click', function(e) { if (e.target === this) closeFileModal(); });
  document.getElementById('scoringModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
});

function handleDragOver(e) { e.preventDefault(); document.getElementById('dropZone').classList.add('drag-over'); }
function handleDragLeave(e) { document.getElementById('dropZone').classList.remove('drag-over'); }
function handleDrop(e) { e.preventDefault(); document.getElementById('dropZone').classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) loadSessionFile(f); }
function handleFileSelect(e) { const f = e.target.files[0]; if (f) loadSessionFile(f); e.target.value = ''; }

function loadSessionFile(file) {
  if (!file.name.endsWith('.json')) { toast('Please select a .json file.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      applySerializedState(e.target.result);
      closeFileModal(); syncSetupFields(); renderCriteria(); updateJudgeNames(); renderGroups();
      autosave(); setAutosaveStatus('saved'); toast('Session loaded! ✓', 'success');
      if (state.groups.length > 0) navigateTo('groups');
    } catch(err) { toast('Invalid session file.', 'error'); }
  };
  reader.readAsText(file);
}

function triggerAutosave() { scheduleAutosave(); }

function navigateTo(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  const idx = { setup:0, groups:1, scoring:2, results:3 }[tab] ?? 0;
  document.querySelectorAll('.tab-btn')[idx]?.classList.add('active');
  if (tab === 'groups') renderGroups();
  if (tab === 'scoring') renderScoringPanel();
  if (tab === 'results') renderResults();
}

// ===== SETUP =====
function updateJudgeNames() {
  const n = parseInt(document.getElementById('numJudges').value);
  state.numJudges = n;
  while (state.judgeNames.length < n) state.judgeNames.push('Judge ' + (state.judgeNames.length + 1));
  state.judgeNames = state.judgeNames.slice(0, n);
  const container = document.getElementById('judgeNamesContainer');
  let html = '<div class="row ' + (n <= 2 ? 'row-2' : 'row-3') + '">';
  for (let i = 0; i < n; i++) {
    html += `<div class="form-group"><label>Judge ${i+1} Name</label>
      <input type="text" id="judgeName${i}" value="${state.judgeNames[i]}" placeholder="Judge ${i+1}" oninput="state.judgeNames[${i}]=this.value">
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderCriteria() {
  const list = document.getElementById('criteriaList');
  list.innerHTML = state.criteria.map((c, i) => `
    <div class="criteria-item" id="ci-${c.id}">
      <input class="criteria-name-input" type="text" value="${c.name}"
             oninput="state.criteria[${i}].name=this.value" placeholder="Criteria name">
      <div style="display:flex;gap:6px;align-items:center;">
        <input type="number" min="1" max="100" value="${c.weight}" style="width:60px;text-align:center;"
               oninput="state.criteria[${i}].weight=parseInt(this.value)||0;updateWeightTotal()">
        <span class="criteria-weight-tag">%</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeCriteria(${c.id})" title="Remove">✕</button>
    </div>
  `).join('');
  updateWeightTotal();
}

function updateWeightTotal() {
  const total = state.criteria.reduce((s, c) => s + (parseInt(c.weight) || 0), 0);
  const el = document.getElementById('weightTotal');
  el.textContent = `Total: ${total}%`;
  el.className = 'weight-total ' + (total === 100 ? 'ok' : 'bad');
}

function addCriteria() {
  state.criteria.push({ id: state.nextCriteriaId++, name: 'New Criteria', weight: 0 });
  renderCriteria(); triggerAutosave();
}

function removeCriteria(id) {
  if (state.criteria.length <= 1) { toast('Need at least one criteria.', 'error'); return; }
  state.criteria = state.criteria.filter(c => c.id !== id);
  renderCriteria(); triggerAutosave();
}

function resetCriteria() {
  state.criteria = [
    { id: 1, name: 'Synchronization & Coordination', weight: 30 },
    { id: 2, name: 'Energy & Stage Presence', weight: 25 },
    { id: 3, name: 'Creativity & Choreography', weight: 20 },
    { id: 4, name: 'Audience Impact', weight: 15 },
    { id: 5, name: 'Costume / Overall Presentation', weight: 10 },
  ];
  renderCriteria();
}

function saveSetupAndGo() {
  const total = state.criteria.reduce((s, c) => s + c.weight, 0);
  if (state.competitionType !== 'pageant' && total !== 100) {
    toast(`Criteria weights must total 100% (currently ${total}%)`, 'error'); return;
  }
  if (state.competitionType === 'pageant') {
    const pt = state.pageantStages.reduce((s, st) => s + (parseInt(st.weight) || 0), 0);
    if (pt !== 100) { toast(`Segment weights must total 100% (currently ${pt}%)`, 'error'); return; }
    for (const st of state.pageantStages) {
      const subTotal = st.criteria.reduce((s, c) => s + (parseInt(c.weight) || 0), 0);
      if (subTotal !== 100) {
        toast(`"${st.name}" sub-criteria must total 100% (currently ${subTotal}%)`, 'error'); return;
      }
    }
  }
  state.event.name = document.getElementById('eventName').value || 'Competition';
  state.event.date = document.getElementById('eventDate').value;
  state.event.venue = document.getElementById('eventVenue').value;
  for (let i = 0; i < state.numJudges; i++)
    state.judgeNames[i] = document.getElementById('judgeName' + i)?.value || ('Judge ' + (i+1));
  state.competitionType = document.getElementById('competitionType')?.value || state.competitionType;
  state.scoringMethod = document.getElementById('scoringMethod')?.value || state.scoringMethod;
  toast('Setup saved! ✓', 'success');
  triggerAutosave();
  setTimeout(() => navigateTo('groups'), 600);
}

// ===== COMPETITION TYPE =====
function onCompetitionTypeChange(save = true) {
  const val = document.getElementById('competitionType')?.value || state.competitionType;
  state.competitionType = val;

  const pageantSection = document.getElementById('pageantStagesSection');
  const criteriaSection = document.getElementById('criteriaCard');

  if (val === 'pageant') {
    if (pageantSection) pageantSection.style.display = '';
    if (criteriaSection) criteriaSection.style.display = 'none';
  } else {
    if (pageantSection) pageantSection.style.display = 'none';
    if (criteriaSection) criteriaSection.style.display = '';
  }

  // Sync Nav Bar and Setup DOM texts dynamically
  const tabButtons = document.querySelectorAll('.tab-btn');
  if(tabButtons.length >= 2) {
    tabButtons[1].textContent = "👥 " + getFormatKeyword();
  }

  updateCandidateTabUI(val);
  renderPageantStages();
  renderProgressiveCuts();
  if (save) triggerAutosave();
}

function updateCandidateTabUI(type) {
  const groupLabel = document.getElementById('groupOrSoloLabel');
  if (groupLabel) {
    groupLabel.textContent = type === 'pageant' ? 'Candidate Name'
      : type === 'solo' ? 'Contestant Name'
      : 'Group Name';
  }

  const zoneLabel = document.querySelector('label[for="newGroupZone"], #zoneFieldLabel');
  if (zoneLabel) zoneLabel.textContent = 'Address / Representing';

  const membersRow = document.getElementById('membersRow');
  if (membersRow) {
    membersRow.style.display = (type === 'solo' || type === 'pageant') ? 'none' : '';
  }
}

// ===== PAGEANT STAGES =====
function renderPageantStages() {
  const container = document.getElementById('pageantStagesList');
  if (!container) return;
  container.innerHTML = state.pageantStages.map((stage, si) => {
    const subTotal = stage.criteria.reduce((s, c) => s + (parseInt(c.weight)||0), 0);
    const subOk = subTotal === 100;
    return `
    <div class="criteria-item" style="flex-direction:row;align-items:stretch;gap:8px;padding:12px;" id="pstage-${si}">
      <div style="padding-left:12px;border-left:2px solid var(--border);">
      <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
        <input class="criteria-name-input" type="text" value="${stage.name}"
               oninput="state.pageantStages[${si}].name=this.value" placeholder="Segment name" style="flex:1;">
        <input type="number" min="1" max="100" value="${stage.weight}" style="width:60px;text-align:center;"
               oninput="state.pageantStages[${si}].weight=parseInt(this.value)||0;updatePageantWeightTotal()">
        <span class="criteria-weight-tag">%</span>
        <label class="toggle-label" title="Reset candidate scores at start of this segment">
          <input type="checkbox" class="toggle-cb" id="btz-${si}" ${stage.backToZero === true ? 'checked' : ''}
                 onchange="setPageantBackToZero(${si}, this.checked)">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span style="font-size:0.72rem;color:var(--text-dim);">Back-to-zero</span>
        </label>
        <button class="btn btn-danger btn-sm" onclick="removePageantStage(${si})">✕</button>
      </div>
       ${stage.description ? `<div style="font-size:0.75rem;color:var(--text-dim);font-style:italic;padding:7px 0px;">${stage.description}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.8px;">Sub-criteria</span>
          <span class="weight-total ${subOk ? 'ok' : 'bad'}" style="padding:0;font-size:0.75rem;" id="subTotal-${si}">Total: ${subTotal}%</span>
        </div>
        ${stage.criteria.map((sc, ci) => `
          <div style="display:flex;gap:6px;margin-bottom:5px;align-items:center;">
            <input type="text" value="${sc.name}" style="flex:1;font-size:0.82rem;"
                   oninput="state.pageantStages[${si}].criteria[${ci}].name=this.value" placeholder="Sub-criteria">
            <input type="number" min="0" max="100" value="${sc.weight}" style="width:55px;text-align:center;font-size:0.82rem;"
                   oninput="state.pageantStages[${si}].criteria[${ci}].weight=parseInt(this.value)||0;updateSubCriteriaTotal(${si})">
            <span style="font-size:0.75rem;color:var(--text-dim);">%</span>
            <button class="btn btn-danger btn-sm" style="padding:2px 7px;font-size:0.7rem;" onclick="removePageantSubCriteria(${si},${ci})">✕</button>
          </div>
        `).join('')}
        <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;margin-top:4px;" onclick="addPageantSubCriteria(${si})">+ Sub-criteria</button>
      </div>
    </div>`;
  }).join('');
  updatePageantWeightTotal();
}

function setPageantBackToZero(stageIdx, val) {
  state.pageantStages[stageIdx].backToZero = val === true || val === 'true';
  triggerAutosave();
}

function updateSubCriteriaTotal(si) {
  const stage = state.pageantStages[si];
  const total = stage.criteria.reduce((s, c) => s + (parseInt(c.weight)||0), 0);
  const el = document.getElementById(`subTotal-${si}`);
  if (el) {
    el.textContent = `Total: ${total}%`;
    el.className = `weight-total ${total === 100 ? 'ok' : 'bad'}`;
    el.style.padding = '0';
    el.style.fontSize = '0.75rem';
  }
}

function updatePageantWeightTotal() {
  const total = state.pageantStages.reduce((s, st) => s + (parseInt(st.weight) || 0), 0);
  const el = document.getElementById('pageantWeightTotal');
  if (el) { el.textContent = `Total: ${total}%`; el.className = 'weight-total ' + (total === 100 ? 'ok' : 'bad'); }
}

function addPageantStage() {
  const newId = Math.max(0, ...state.pageantStages.map(s => s.id)) + 1;
  state.pageantStages.push({ id: newId, name: 'New Segment', weight: 0, backToZero: false, criteria: [{ id: 1, name: 'Performance', weight: 100 }] });
  renderPageantStages();
}
function removePageantStage(idx) {
  if (state.pageantStages.length <= 1) { toast('Need at least one segment.', 'error'); return; }
  state.pageantStages.splice(idx, 1);
  renderPageantStages();
}
function addPageantSubCriteria(stageIdx) {
  const newId = Math.max(0, ...state.pageantStages[stageIdx].criteria.map(c => c.id)) + 1;
  state.pageantStages[stageIdx].criteria.push({ id: newId, name: 'New Sub-criteria', weight: 0 });
  renderPageantStages();
}
function removePageantSubCriteria(stageIdx, ciIdx) {
  if (state.pageantStages[stageIdx].criteria.length <= 1) { toast('Need at least one sub-criteria.', 'error'); return; }
  state.pageantStages[stageIdx].criteria.splice(ciIdx, 1);
  renderPageantStages();
}

// ===== PROGRESSIVE CUT SYSTEM =====
function getActiveCandidatesForStage(stageId) {
  if (state.competitionType !== 'pageant' || !state.progressiveCuts) return [...state.groups];

  const stageIdx = state.pageantStages.findIndex(s => s.id === stageId);
  if (stageIdx === 0) return [...state.groups]; 

  let activeCandidates = [...state.groups];
  for (let si = 0; si < stageIdx; si++) {
    const prevStage = state.pageantStages[si];
    const cut = state.progressiveCuts.find(c => c.afterStageId === prevStage.id && c.enabled);
    if (!cut) continue;

    const scored = activeCandidates.map(g => ({
      ...g,
      stageScore: computeScoreThroughStage(g.id, si)
    })).sort((a, b) => b.stageScore - a.stageScore);

    const cutoff = Math.min(cut.advancingCount, scored.length);
    if (cutoff > 0 && cutoff < scored.length) {
      const cutoffScore = scored[cutoff - 1].stageScore;
      activeCandidates = scored.filter((g, i) => i < cutoff || g.stageScore === cutoffScore);
    }
  }
  return activeCandidates;
}

function computeScoreThroughStage(groupId, throughStageIdx) {
  const doneJudges = Array.from({length: state.numJudges}, (_, j) => j)
    .filter(j => isJudgeDoneForStages(groupId, j, throughStageIdx));
  if (!doneJudges.length) {
    const anyJudges = Array.from({length: state.numJudges}, (_, j) => j)
      .filter(j => hasAnyStageData(groupId, j, throughStageIdx));
    if (!anyJudges.length) return 0;
    return anyJudges.reduce((s, j) => s + computeJudgeTotalThroughStage(groupId, j, throughStageIdx), 0) / anyJudges.length;
  }
  return doneJudges.reduce((s, j) => s + computeJudgeTotalThroughStage(groupId, j, throughStageIdx), 0) / doneJudges.length;
}

function computeJudgeTotalThroughStage(groupId, judgeIdx, throughStageIdx) {
  let total = 0;
  for (let si = 0; si <= throughStageIdx; si++) {
    const stage = state.pageantStages[si];
    const stageScores = ((state.scores[groupId] || {})[judgeIdx] || {})[`stage_${stage.id}`] || {};
    const stageRaw = stage.criteria.reduce((sum, c) => {
      const v = stageScores[c.id];
      if (v !== undefined && v !== '') {
        const score = parseFloat(v);
        return sum + (state.scoringMethod === 'percent' ? score * c.weight / 100 : score);
      }
      return sum;
    }, 0);
    total += stageRaw * stage.weight / 100;
  }
  return total;
}

function isJudgeDoneForStages(groupId, judgeIdx, throughStageIdx) {
  for (let si = 0; si <= throughStageIdx; si++) {
    if (!isPageantStageDone(groupId, judgeIdx, si)) return false;
  }
  return true;
}

function hasAnyStageData(groupId, judgeIdx, throughStageIdx) {
  for (let si = 0; si <= throughStageIdx; si++) {
    const stage = state.pageantStages[si];
    const ss = ((state.scores[groupId] || {})[judgeIdx] || {})[`stage_${stage.id}`] || {};
    if (Object.values(ss).some(v => v !== undefined && v !== '')) return true;
  }
  return false;
}

function getCutAfterStage(stageId) {
  return (state.progressiveCuts || []).find(c => c.afterStageId === stageId && c.enabled) || null;
}

function renderProgressiveCuts() {
  const container = document.getElementById('progressiveCutsContainer');
  if (!container) return;
  const cuts = state.progressiveCuts || [];
  if (cuts.length === 0) {
    container.innerHTML = '<div class="text-dim" style="font-size:0.82rem;padding:6px 0;">No elimination defined. All candidates score all segments.</div>';
    return;
  }

  container.innerHTML = cuts.map((cut, ci) => `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:10px 12px;">
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:160px;">
        <label style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim);">After Segment</label>
        <select style="font-size:0.8rem;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:4px 8px;"
                onchange="state.progressiveCuts[${ci}].afterStageId=parseInt(this.value)">
          ${state.pageantStages.map((st, si) =>
            `<option value="${st.id}" ${cut.afterStageId===st.id?'selected':''}>${si+1}. ${st.name}</option>`
          ).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;">
        <label style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim);">Top</label>
        <input type="number" min="1" max="999" value="${cut.advancingCount}" style="width:64px;text-align:center;"
               oninput="state.progressiveCuts[${ci}].advancingCount=parseInt(this.value)||1;updateCutLabel(${ci})">
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;flex:2;min-width:120px;">
        <label style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim);">Label</label>
        <input type="text" value="${cut.label}" style="font-size:0.8rem;"
               oninput="state.progressiveCuts[${ci}].label=this.value" placeholder="e.g. Top 10 Finalists">
      </div>
      <label class="toggle-label" style="align-self:flex-end;margin-bottom:2px;" title="Enable or disable this cut">
        <input type="checkbox" class="toggle-cb" ${cut.enabled?'checked':''}
               onchange="state.progressiveCuts[${ci}].enabled=this.checked">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span style="font-size:0.72rem;color:var(--text-dim);">Active</span>
      </label>
      <button class="btn btn-danger btn-sm" style="align-self:flex-end;" onclick="removeCut(${ci})">✕</button>
    </div>
  `).join('');
}

function updateCutLabel(ci) {
  const cut = state.progressiveCuts[ci];
  if (!cut) return;
  const stageName = state.pageantStages.find(s => s.id === cut.afterStageId)?.name || '';
  cut.label = `Top ${cut.advancingCount}${stageName ? ' — after ' + stageName : ''}`;
  renderProgressiveCuts();
}

function addCut() {
  const lastStageId = state.pageantStages[state.pageantStages.length - 1]?.id || 1;
  state.progressiveCuts.push({
    id: state.nextCutId++,
    afterStageId: lastStageId,
    advancingCount: 5,
    label: 'Top 5',
    enabled: true
  });
  renderProgressiveCuts();
  triggerAutosave();
}

function removeCut(ci) {
  state.progressiveCuts.splice(ci, 1);
  renderProgressiveCuts();
  triggerAutosave();
}

// ===== RULES =====
function renderRules() {
  const container = document.getElementById('rulesList');
  if (!container) return;
  if (state.rules.length === 0) {
    container.innerHTML = '<div class="text-dim" style="font-size:0.82rem;padding:8px 0;">No rules defined.</div>';
    return;
  }
  const categoryLabel = { members:'Members', age:'Age', marital:'Marital', citizenship:'Citizenship', general:'General' };
  container.innerHTML = state.rules.map((r, i) => `
    <div class="criteria-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:10px 12px;">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select style="font-size:0.78rem;padding:3px 6px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;"
                onchange="state.rules[${i}].category=this.value">
          ${['members','age','marital','citizenship','general'].map(cat =>
            `<option value="${cat}" ${r.category===cat?'selected':''}>${categoryLabel[cat]}</option>`
          ).join('')}
        </select>
        <input type="text" value="${r.text}" style="flex:1;min-width:140px;font-size:0.82rem;"
               oninput="state.rules[${i}].text=this.value" placeholder="Rule description">
        <label class="toggle-label" title="Toggle whether this rule affects scoring">
          <input type="checkbox" class="toggle-cb" ${r.affectsScoring?'checked':''}
                 onchange="state.rules[${i}].affectsScoring=this.checked;renderRules()">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span style="font-size:0.72rem;color:var(--text-dim);">Affects score</span>
        </label>
        <label class="toggle-label" title="Enable or disable this rule">
          <input type="checkbox" class="toggle-cb" ${r.enabled?'checked':''}
                 onchange="state.rules[${i}].enabled=this.checked">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span style="font-size:0.72rem;color:var(--text-dim);">Enabled</span>
        </label>
        <button class="btn btn-danger btn-sm" onclick="removeRule(${r.id})">✕</button>
      </div>
      ${r.affectsScoring ? `
      <div style="display:flex;gap:8px;align-items:center;padding-left:8px;flex-wrap:wrap;">
        <span style="font-size:0.75rem;color:var(--text-dim);">Deduction on violation:</span>
        <select style="font-size:0.78rem;padding:3px 6px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;"
                onchange="state.rules[${i}].deductionType=this.value;renderRules()">
          <option value="none" ${r.deductionType==='none'?'selected':''}>None (disqualify only)</option>
          <option value="fixed" ${r.deductionType==='fixed'?'selected':''}>Fixed pts</option>
          <option value="percent" ${r.deductionType==='percent'?'selected':''}>% of score</option>
        </select>
        ${r.deductionType !== 'none' ? `
        <input type="number" min="0" max="100" value="${r.deductionValue}" style="width:60px;text-align:center;font-size:0.82rem;"
               oninput="state.rules[${i}].deductionValue=parseFloat(this.value)||0"
               placeholder="${r.deductionType==='fixed'?'pts':'%'}">
        <span style="font-size:0.75rem;color:var(--text-dim);">${r.deductionType==='fixed'?'pts':'%'}</span>
        ` : ''}
      </div>
      ` : ''}
    </div>
  `).join('');
}

function addRule() {
  state.rules.push({ id: state.nextRuleId++, text: '', category: 'general', affectsScoring: false, deductionType: 'none', deductionValue: 0, enabled: true });
  renderRules(); triggerAutosave();
}

function removeRule(id) {
  state.rules = state.rules.filter(r => r.id !== id);
  renderRules(); triggerAutosave();
}

function openRuleViolationModal(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  const scoringRules = state.rules.filter(r => r.affectsScoring && r.enabled);
  if (!group.ruleViolations) group.ruleViolations = [];
  const categoryLabel = { members:'👥', age:'🎂', marital:'💍', citizenship:'🌍', general:'📌' };

  const ruleRows = scoringRules.length === 0
    ? `<div class="text-dim" style="padding:8px 0;">No scoring rules defined. Add rules with "Affects score" enabled in Setup → Competition Rules.</div>`
    : scoringRules.map(r => {
        const isChecked = group.ruleViolations.includes(r.id);
        const deductLabel = r.deductionType !== 'none'
          ? `<span class="badge badge-partial" style="margin-left:auto;flex-shrink:0;">−${r.deductionValue}${r.deductionType==='percent'?'%':' pts'}</span>`
          : '<span class="badge badge-pending" style="margin-left:auto;flex-shrink:0;">Flag only</span>';
        return `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;">
            <input type="checkbox" ${isChecked?'checked':''}
                   onchange="markViolation(${groupId}, ${r.id}, this.checked)">
            <span style="font-size:0.85rem;flex:1;">${categoryLabel[r.category]||'📌'} ${r.text}</span>
            ${deductLabel}
          </label>`;
      }).join('');

  document.getElementById('modalTitle').textContent = `⚠️ Rule Violations — ${group.name}`;
  document.getElementById('modalBody').innerHTML = `
    <div style="padding:0 0 16px;">
      <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:14px;">
        Check any rules violated by <strong style="color:var(--text);">${group.name}</strong>.
        Violations with deductions will reduce their final average score.
      </div>
      <div id="violationRuleRows">${ruleRows}</div>
      <div id="violationSummary" style="margin-top:14px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px;">
        ${renderViolationSummary(groupId)}
      </div>
      <div style="margin-top:16px;">
        <button class="btn btn-secondary btn-full" onclick="closeModal()">Done</button>
      </div>
    </div>
  `;
  document.getElementById('scoringModal').classList.add('open');
}

function markViolation(groupId, ruleId, checked) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  if (!group.ruleViolations) group.ruleViolations = [];
  const idx = group.ruleViolations.indexOf(ruleId);
  if (checked && idx === -1) group.ruleViolations.push(ruleId);
  else if (!checked && idx !== -1) group.ruleViolations.splice(idx, 1);
  const summaryEl = document.getElementById('violationSummary');
  if (summaryEl) summaryEl.innerHTML = renderViolationSummary(groupId);
  triggerAutosave();
}

function renderViolationSummary(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  const violations = group?.ruleViolations || [];
  const rawAvg = computeRawGroupAverage(groupId);
  const deduction = computeViolationDeduction(group);
  const finalScore = Math.max(0, rawAvg - deduction).toFixed(2);
  const violationCount = violations.length;

  if (rawAvg === 0 && violationCount === 0) {
    return `<span style="font-size:0.8rem;color:var(--text-dim);">Score this ${getFormatKeyword().toLowerCase()} first to see deduction impact.</span>`;
  }
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:1.1rem;color:var(--text);">${rawAvg.toFixed(2)}</div>
        <div style="font-size:0.66rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;">Raw Average</div>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:1.1rem;color:var(--accent);">−${deduction.toFixed(2)}</div>
        <div style="font-size:0.66rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;">${violationCount} Violation${violationCount!==1?'s':''}</div>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:1.1rem;color:var(--accent3);">${finalScore}</div>
        <div style="font-size:0.66rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;">Final Score</div>
      </div>
    </div>
  `;
}

function computeRawGroupAverage(groupId) {
  const scores = state.scores[groupId] || {};
  if (state.competitionType === 'pageant') {
    let activeStagesCount = 0;
    let sumTotals = 0;
    state.pageantStages.forEach((stage, si) => {
      const activeCandidates = getActiveCandidatesForStage(stage.id);
      if (activeCandidates.some(a => a.id === groupId)) {
        activeStagesCount++;
        let stageSum = 0;
        let stageJudgesScored = 0;
        for (let j = 0; j < state.numJudges; j++) {
          if (isPageantStageDone(groupId, j, si)) {
            stageSum += computePageantStageTotal(groupId, j, si);
            stageJudgesScored++;
          }
        }
        const stageAvg = stageJudgesScored > 0 ? (stageSum / stageJudgesScored) : 0;
        sumTotals += (stageAvg * stage.weight / 100);
      }
    });
    return sumTotals;
  }
  const doneJudges = Array.from({length: state.numJudges}, (_, j) => j).filter(j => isJudgeDone(groupId, j));
  if (!doneJudges.length) return 0;
  return doneJudges.reduce((s, j) => s + computeJudgeTotal(groupId, j), 0) / doneJudges.length;
}

function computeViolationDeduction(group) {
  if (!group || !group.ruleViolations || !group.ruleViolations.length) return 0;
  const rawAvg = computeRawGroupAverage(group.id);
  let deduction = 0;
  for (const ruleId of group.ruleViolations) {
    const rule = state.rules.find(r => r.id === ruleId && r.affectsScoring && r.enabled);
    if (!rule) continue;
    if (rule.deductionType === 'fixed') deduction += rule.deductionValue;
    else if (rule.deductionType === 'percent') deduction += rawAvg * (rule.deductionValue / 100);
  }
  return deduction;
}

function extractMemberLimit(text) {
  if (!text) return null;
  const m = text.match(/(\d+)\s*[–\-–]\s*(\d+)/);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  return null;
}

// ===== GROUPS =====
function addGroup() {
  const name = document.getElementById('newGroupName').value.trim();
  const zone = document.getElementById('newGroupZone').value.trim();
  const isSoloType = state.competitionType === 'solo' || state.competitionType === 'pageant';
  const membersInput = document.getElementById('newGroupMembers');
  const members = isSoloType ? 1 : parseInt(membersInput?.value);
  
  // FIX #3: Candidate number is based on registration order automatically
  const order = state.groups.length + 1;

  if (!name) { toast('Enter a name.', 'error'); return; }
  if (!zone) { toast('Enter the address / representing area.', 'error'); return; }

  if (!isSoloType) {
    const memberRule = state.rules.find(r => r.category === 'members' && r.enabled);
    const memberLimit = extractMemberLimit(memberRule?.text);
    if (memberLimit) {
      if (!members || members < memberLimit.min || members > memberLimit.max) {
        toast(`Members must be ${memberLimit.min}–${memberLimit.max} (per competition rules).`, 'error'); return;
      }
    } else {
      if (!members || members < 1) { toast('Enter a valid member count.', 'error'); return; }
    }
  }

  state.groups.push({ id: state.nextGroupId++, name, zone, members: isSoloType ? null : members, order });
  state.groups.sort((a, b) => a.order - b.order);
  document.getElementById('newGroupName').value = '';
  document.getElementById('newGroupZone').value = '';
  if (membersInput) membersInput.value = '';
  renderGroups();
  toast(`"${name}" added! ✓`, 'success');
  triggerAutosave();
}

function removeGroup(id) {
  if (!confirm(`Remove this ${结构}?`)) return;
  state.groups = state.groups.filter(g => g.id !== id);
  // Re-index order numbers on registration array structure shift
  state.groups.forEach((g, idx) => g.order = idx + 1);
  delete state.scores[id];
  renderGroups(); triggerAutosave();
}

function getGroupStatus(groupId) {
  const kw = getFormatKeyword();
  if (state.competitionType === 'pageant') {
    let totalSegments = state.pageantStages.length;
    let countedSegments = 0;
    
    state.pageantStages.forEach((stage, si) => {
      const activeCandidates = getActiveCandidatesForStage(stage.id);
      if (activeCandidates.some(a => a.id === groupId)) {
        const stageDone = Array.from({length: state.numJudges}, (_, j) => j).every(j => isPageantStageDone(groupId, j, si));
        if (stageDone) countedSegments++;
      } else {
        totalSegments--; 
      }
    });

    if (countedSegments === totalSegments && totalSegments > 0) return 'scored';
    if (countedSegments > 0) return `${countedSegments}/${totalSegments} Segments`;
    return 'Pending';
  }
  
  const scores = state.scores[groupId];
  if (!scores || !Object.keys(scores).length) return 'Pending';
  const allDone = Array.from({length: state.numJudges}, (_, j) => j).every(j => isJudgeDone(groupId, j));
  if (allDone) return 'scored';
  return 'Partial';
}

function renderGroups() {
  const list = document.getElementById('groupsList');
  const count = document.getElementById('groupCount');
  const isSoloType = state.competitionType === 'solo' || state.competitionType === 'pageant';

  count.textContent = state.groups.length + " " + (state.groups.length !== 1 ? getFormatKeywordPlural().toLowerCase() : getFormatKeyword().toLowerCase());
  count.className = 'badge ' + (state.groups.length > 0 ? 'badge-scored' : 'badge-pending');

  updateCandidateTabUI(state.competitionType);

  if (state.groups.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">🎭</div><p>No ${getFormatKeywordPlural().toLowerCase()} yet.<br>Add some above.</p></div>`;
    return;
  }

  list.innerHTML = state.groups.map(g => {
    const status = getGroupStatus(g.id);
    const badgeClass = status === 'scored' ? 'badge-scored' : status === 'Pending' ? 'badge-pending' : 'badge-partial';
    const badgeLabel = status === 'scored' ? '✓ Scored' : status;

    const violations = g.ruleViolations || [];
    const activeViolations = violations.filter(rid => {
      const r = state.rules.find(x => x.id === rid && x.affectsScoring && x.enabled);
      return !!r;
    });
    const violBadge = activeViolations.length > 0
      ? `<span class="badge" style="background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);">⚠️ ${activeViolations.length} violation${activeViolations.length>1?'s':''}</span>`
      : '';

    const memberInfo = g.members ? ` · ${g.members} members` : '';
    return `
      <div class="group-item">
        <div class="group-number">#${g.order}</div>
        <div style="flex:1;min-width:0;">
          <div class="group-name">${g.name}</div>
          <div class="group-zone">📍 ${g.zone}${memberInfo}</div>
          ${violBadge ? `<div style="margin-top:4px;">${violBadge}</div>` : ''}
        </div>
        <div class="badge ${badgeClass}">${badgeLabel}</div>
        <div class="group-actions">
          <button class="btn btn-secondary btn-sm" title="Mark rule violations" onclick="openRuleViolationModal(${g.id})">⚠️</button>
          <button class="btn btn-secondary btn-sm" onclick="openScoringModal(${g.id})">📊 Score</button>
          <button class="btn btn-danger btn-sm" onclick="removeGroup(${g.id})">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== SCORING PANEL =====
function renderScoringPanel() {
  const content = document.getElementById('scoringContent');
  if (state.groups.length === 0) {
    content.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><div class="icon">📝</div><p>Add ${getFormatKeywordPlural().toLowerCase()} first to start scoring.</p></div>`;
    return;
  }

  let stageNav = '';
  if (state.competitionType === 'pageant') {
    stageNav = `
      <div class="card" style="margin-bottom:14px;">
        <div class="card-title">Pageant Segments</div>
        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">
          Select the active segment for scoring. Later segments are locked until every candidate in the current segment receives their scores.
        </div>
        <div class="judge-tabs" style="flex-wrap:wrap;">
          ${state.pageantStages.map((st, i) => {
            // FIX #4: Lock later segments until preceding segment is entirely completed
            let isLocked = false;
            if (i > 0) {
              const prevStage = state.pageantStages[i - 1];
              const prevActiveCandidates = getActiveCandidatesForStage(prevStage.id);
              const prevStageDone = prevActiveCandidates.every(g => {
                return Array.from({length: state.numJudges}, (_, j) => j).every(j => isPageantStageDone(g.id, j, i - 1));
              });
              if (!prevStageDone) isLocked = true;
            }

            // FIX #6: Highlight green (.done class) if EVERY available remaining candidate is scored
            const currentActiveCandidates = getActiveCandidatesForStage(st.id);
            const allStageDone = currentActiveCandidates.length > 0 && currentActiveCandidates.every(g => {
              return Array.from({length: state.numJudges}, (_, j) => j).every(j => isPageantStageDone(g.id, j, i));
            });

            const stageLabel = `${i+1}. ${st.name}${currentActiveCandidates.length < state.groups.length ? ` (${currentActiveCandidates.length})` : ''}`;
            
            return `<div class="judge-tab ${i === state.currentPageantStage ? 'active' : ''} ${allStageDone ? 'done' : ''} ${isLocked ? 'disabled-tab' : ''}"
              style="${isLocked ? 'opacity:0.4; cursor:not-allowed; pointer-events:none;' : ''}"
              onclick="${isLocked ? '' : `setActivePageantStage(${i})`}">${stageLabel}</div>`;
          }).join('')}
        </div>
      </div>`;
  }

  const displayGroups = state.competitionType === 'pageant'
    ? getActiveCandidatesForStage(state.pageantStages[state.currentPageantStage]?.id)
    : state.groups;

  content.innerHTML = stageNav + `
    <div class="card">
      <div class="card-title">Scoring Dashboard</div>
      <div class="info-pills">
        <div class="info-pill">Judges: <span>${state.numJudges}</span></div>
        <div class="info-pill">${state.competitionType === 'pageant' ? 'Segments' : 'Criteria'}: <span>${state.competitionType === 'pageant' ? state.pageantStages.length : state.criteria.length}</span></div>
        <div class="info-pill">${getFormatKeywordPlural()}: <span>${displayGroups.length}</span></div>
        ${state.competitionType === 'pageant' ? `<div class="info-pill">Active Segment: <span>${state.pageantStages[state.currentPageantStage]?.name || '—'}</span></div>` : ''}
      </div>
      <div class="groups-list">
        ${displayGroups.map(g => {
          const status = getGroupStatus(g.id);
          const badgeClass = status === 'scored' ? 'badge-scored' : status === 'Pending' ? 'badge-pending' : 'badge-partial';
          const badgeLabel = status === 'scored' ? '✓ All Scored' : status;
          const avg = computeRawGroupAverage(g.id) > 0 ? computeGroupAverage(g.id).toFixed(2) : '—';
          return `
            <div class="group-item" style="cursor:pointer;" onclick="openScoringModal(${g.id})">
              <div class="group-number">#${g.order}</div>
              <div style="flex:1;min-width:0;">
                <div class="group-name">${g.name}</div>
                <div class="group-zone">${g.zone}</div>
              </div>
              <div style="text-align:right;">
                <div class="badge ${badgeClass}">${badgeLabel}</div>
                ${avg !== '—' ? `<div class="font-mono" style="font-size:0.85rem;color:var(--accent2);margin-top:4px;">${avg}%</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function setActivePageantStage(idx) {
  state.currentPageantStage = idx;
  renderScoringPanel();
  triggerAutosave();
}

// ===== SCORING MODAL =====
function openScoringModal(groupId) {
  state.currentScoringGroupId = groupId;
  state.currentScoringJudge = 0;
  const group = state.groups.find(g => g.id === groupId);
  document.getElementById('modalTitle').textContent = group.name;
  renderScoringModal();
  document.getElementById('scoringModal').classList.add('open');
}

function closeModal() {
  document.getElementById('scoringModal').classList.remove('open');
  if (document.getElementById('panelScoring').classList.contains('active')) renderScoringPanel();
  if (document.getElementById('panelGroups').classList.contains('active')) renderGroups();
}

function renderScoringModal() {
  if (state.competitionType === 'pageant') {
    renderPageantScoringModal();
  } else {
    renderStandardScoringModal();
  }
}

function renderStandardScoringModal() {
  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;

  if (!state.scores[groupId]) state.scores[groupId] = {};
  if (!state.scores[groupId][judgeIdx]) state.scores[groupId][judgeIdx] = {};
  const judgeScores = state.scores[groupId][judgeIdx];

  let tabsHtml = '<div class="judge-tabs">';
  for (let i = 0; i < state.numJudges; i++) {
    const done = isJudgeDone(groupId, i);
    tabsHtml += `<div class="judge-tab ${i===judgeIdx?'active':''} ${done&&i!==judgeIdx?'done':''}" onclick="switchJudge(${i})">${state.judgeNames[i]}</div>`;
  }
  tabsHtml += '</div>';

  let criteriaHtml = '';
  for (const c of state.criteria) {
    const val = judgeScores[c.id] !== undefined ? judgeScores[c.id] : '';
    const maxInput = state.scoringMethod === 'direct' ? c.weight : 100;
    const placeholder = state.scoringMethod === 'direct' ? `0–${c.weight}` : '0–100';
    const weightNote = state.scoringMethod === 'direct'
      ? `Max: <strong style="color:var(--accent2);">${c.weight} pts</strong>`
      : `Weight: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100`;
    const contribution = (val !== '' && state.scoringMethod === 'percent')
      ? `→ <strong style="color:var(--accent3);">${(parseFloat(val)*c.weight/100).toFixed(2)} pts</strong>`
      : '';
    criteriaHtml += `
      <div class="criteria-score-row">
        <div>
          <div class="criteria-label">${c.name}</div>
          <div class="criteria-weight-tag">${weightNote} ${contribution}</div>
        </div>
        <div class="score-input-wrap">
          <input type="number" class="score-input" min="0" max="${maxInput}" step="0.5"
                 value="${val}" placeholder="${placeholder}" id="score-${c.id}"
                 oninput="updateScore(${c.id}, this.value)">
        </div>
      </div>`;
  }

  const judgeTotal = computeJudgeTotal(groupId, judgeIdx);

  document.getElementById('modalBody').innerHTML = `
    ${tabsHtml}
    <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">
      ${state.scoringMethod === 'direct'
        ? 'Score directly — each input\'s max <em>equals</em> its criteria weight. Sum = total out of 100.'
        : 'Enter 0–100 for each criteria. Each score is multiplied by the criteria\'s weight % automatically.'}
    </div>
    ${criteriaHtml}
    <div class="judge-total">
      <div class="judge-total-label">${state.judgeNames[judgeIdx]} Total</div>
      <div class="judge-total-value" id="judgeTotal">${judgeTotal.toFixed(2)}%</div>
    </div>
    <div class="flex-gap mt-12">
      <button class="btn btn-success btn-full" onclick="saveJudgeScores()">✓ Save Scores</button>
    </div>
    ${state.numJudges > 1 && judgeIdx < state.numJudges - 1 ? `
    <button class="btn btn-secondary btn-full mt-8" onclick="switchJudge(${judgeIdx+1})">Next: ${state.judgeNames[judgeIdx+1]} →</button>
    ` : ''}
  `;
}

function renderPageantScoringModal() {
  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;
  const stageIdx = state.currentPageantStage;
  const stage = state.pageantStages[stageIdx];

  if (!state.scores[groupId]) state.scores[groupId] = {};
  if (!state.scores[groupId][judgeIdx]) state.scores[groupId][judgeIdx] = {};
  const stageKey = `stage_${stage.id}`;
  if (!state.scores[groupId][judgeIdx][stageKey]) state.scores[groupId][judgeIdx][stageKey] = {};
  const stageScores = state.scores[groupId][judgeIdx][stageKey];

  let tabsHtml = '<div class="judge-tabs">';
  for (let i = 0; i < state.numJudges; i++) {
    const done = isPageantStageDone(groupId, i, stageIdx);
    tabsHtml += `<div class="judge-tab ${i===judgeIdx?'active':''} ${done&&i!==judgeIdx?'done':''}" onclick="switchJudge(${i})">${state.judgeNames[i]}</div>`;
  }
  tabsHtml += '</div>';

  const stageNavHtml = `
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.8px;flex-shrink:0;">Segment:</span>
      ${state.pageantStages.map((st, si) => {
        const currentActiveCandidates = getActiveCandidatesForStage(st.id);
        if(!currentActiveCandidates.some(a => a.id === groupId)) return ''; // omit if candidate was eliminated
        
        const done = isPageantStageDone(groupId, judgeIdx, si);
        return `<div class="judge-tab ${si===stageIdx?'active':''} ${done&&si!==stageIdx?'done':''}"
          onclick="switchPageantStage(${si})" style="font-size:0.72rem;padding:5px 12px;">${si+1}. ${st.name}</div>`;
      }).join('')}
    </div>`;

  let criteriaHtml = `
    <div style="background:rgba(255,184,48,0.07);border:1px solid rgba(255,184,48,0.2);border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:0.78rem;color:var(--accent2);">
      <strong>Segment ${stageIdx+1}: ${stage.name}</strong> &nbsp;·&nbsp; Weight: ${stage.weight}%
      ${stage.backToZero === true ? '&nbsp;·&nbsp; <em style="color:var(--text-dim);">Back-to-zero enabled</em>' : ''}
    </div>`;

  for (const c of stage.criteria) {
    const val = stageScores[c.id] !== undefined ? stageScores[c.id] : '';
    const maxInput = state.scoringMethod === 'direct' ? c.weight : 100;
    const placeholder = state.scoringMethod === 'direct' ? `0–${c.weight}` : '0–100';
    const weightNote = state.scoringMethod === 'direct'
      ? `Max: <strong style="color:var(--accent2);">${c.weight} pts</strong>`
      : `Weight: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100`;
    const contribution = (val !== '' && state.scoringMethod === 'percent')
      ? `→ <strong style="color:var(--accent3);">${(parseFloat(val)*c.weight/100).toFixed(2)} pts</strong>`
      : '';
    criteriaHtml += `
      <div class="criteria-score-row">
        <div>
          <div class="criteria-label">${c.name}</div>
          <div class="criteria-weight-tag">${weightNote} ${contribution}</div>
        </div>
        <div class="score-input-wrap">
          <input type="number" class="score-input" min="0" max="${maxInput}" step="0.5"
                 value="${val}" placeholder="${placeholder}" id="score-stage-${c.id}"
                 oninput="updatePageantScore(${c.id}, this.value)">
        </div>
      </div>`;
  }

  const stageTotal = computePageantStageTotal(groupId, judgeIdx, stageIdx);
  const grandTotal = computeRawGroupAverage(groupId); 

  document.getElementById('modalBody').innerHTML = `
    ${tabsHtml}
    ${stageNavHtml}
    ${criteriaHtml}
    <div class="judge-total" style="margin-bottom:8px;">
      <div>
        <div class="judge-total-label">${state.judgeNames[judgeIdx]} — Segment Total</div>
        <div style="font-size:0.72rem;color:var(--text-dim);">Contribution to final: ${((stageTotal/100)*stage.weight).toFixed(2)} pts</div>
      </div>
      <div class="judge-total-value" id="judgeTotal">${stageTotal.toFixed(2)} / 100</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:0.78rem;color:var(--text-dim);">Cumulative Running Score (All active segments)</span>
      <span id="grandTotal" class="font-mono" style="font-size:0.95rem;color:var(--accent2);">${grandTotal.toFixed(2)}%</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <button class="btn btn-success btn-full" onclick="savePageantStageScores()">✓ Save Segment Scores</button>
    </div>
  `;
}

function switchPageantStage(stageIdx) {
  state.currentPageantStage = stageIdx;
  renderScoringModal();
}

function updateScore(criteriaId, val) {
  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;
  const c = state.criteria.find(x => x.id === criteriaId);
  const num = parseFloat(val);
  const maxVal = state.scoringMethod === 'direct' ? c.weight : 100;
  const clamped = isNaN(num) ? '' : Math.min(maxVal, Math.max(0, num));
  state.scores[groupId][judgeIdx][criteriaId] = clamped;

  const inputEl = document.getElementById('score-' + criteriaId);
  if (inputEl && clamped !== '' && parseFloat(inputEl.value) > maxVal) inputEl.value = clamped;

  const total = computeJudgeTotal(groupId, judgeIdx);
  const totalEl = document.getElementById('judgeTotal');
  if (totalEl) totalEl.textContent = total.toFixed(2) + '%';
  triggerAutosave();
}

function updatePageantScore(criteriaId, val) {
  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;
  const stageIdx = state.currentPageantStage;
  const stage = state.pageantStages[stageIdx];
  const stageKey = `stage_${stage.id}`;

  const c = stage.criteria.find(x => x.id === criteriaId);
  const num = parseFloat(val);
  const maxVal = state.scoringMethod === 'direct' ? c.weight : 100;
  const clamped = isNaN(num) ? '' : Math.min(maxVal, Math.max(0, num));
  state.scores[groupId][judgeIdx][stageKey][criteriaId] = clamped;

  const inputEl = document.getElementById('score-stage-' + criteriaId);
  if (inputEl && clamped !== '' && parseFloat(inputEl.value) > maxVal) inputEl.value = clamped;

  const stageTotal = computePageantStageTotal(groupId, judgeIdx, stageIdx);
  const grandTotal = computeRawGroupAverage(groupId);
  const el = document.getElementById('judgeTotal');
  if (el) el.textContent = stageTotal.toFixed(2) + ' / 100';
  const gte = document.getElementById('grandTotal');
  if (gte) gte.textContent = grandTotal.toFixed(2) + '%';
  triggerAutosave();
}

function computeJudgeTotal(groupId, judgeIdx) {
  if (state.competitionType === 'pageant') return computePageantJudgeTotal(groupId, judgeIdx);
  const js = (state.scores[groupId] || {})[judgeIdx] || {};
  return state.criteria.reduce((sum, c) => {
    const v = js[c.id];
    if (v !== undefined && v !== '') {
      const score = parseFloat(v);
      return sum + (state.scoringMethod === 'percent' ? score * c.weight / 100 : score);
    }
    return sum;
  }, 0);
}

function computePageantStageTotal(groupId, judgeIdx, stageIdx) {
  const stage = state.pageantStages[stageIdx];
  const stageScores = ((state.scores[groupId] || {})[judgeIdx] || {})[`stage_${stage.id}`] || {};
  return stage.criteria.reduce((sum, c) => {
    const v = stageScores[c.id];
    if (v !== undefined && v !== '') {
      const score = parseFloat(v);
      return sum + (state.scoringMethod === 'percent' ? score * c.weight / 100 : score);
    }
    return sum;
  }, 0);
}

function computePageantJudgeTotal(groupId, judgeIdx) {
  let total = 0;
  for (let si = 0; si < state.pageantStages.length; si++) {
    const stage = state.pageantStages[si];
    const stageRaw = computePageantStageTotal(groupId, judgeIdx, si);
    total += stageRaw * stage.weight / 100;
  }
  return total;
}

function isJudgeDone(groupId, judgeIdx) {
  if (state.competitionType === 'pageant') {
    return state.pageantStages.every((_, si) => isPageantStageDone(groupId, judgeIdx, si));
  }
  const js = (state.scores[groupId] || {})[judgeIdx] || {};
  return state.criteria.every(c => js[c.id] !== undefined && js[c.id] !== '');
}

function isPageantStageDone(groupId, judgeIdx, stageIdx) {
  const stage = state.pageantStages[stageIdx];
  const ss = ((state.scores[groupId] || {})[judgeIdx] || {})[`stage_${stage.id}`] || {};
  return stage.criteria.every(c => ss[c.id] !== undefined && ss[c.id] !== '');
}

function switchJudge(idx) {
  state.currentScoringJudge = idx;
  renderScoringModal();
}

function saveJudgeScores() {
  toast('Scores saved! ✓', 'success');
  triggerAutosave();
  const groupId = state.currentScoringGroupId;
  if (isJudgeDone(groupId, state.currentScoringJudge)) {
    const allDone = Array.from({length: state.numJudges}, (_, i) => i).every(i => isJudgeDone(groupId, i));
    if (allDone) { closeModal(); toast('All judges scored! ✓', 'success'); return; }
    const next = Array.from({length: state.numJudges}, (_, i) => i).find(i => !isJudgeDone(groupId, i));
    if (next !== undefined) switchJudge(next);
  }
}

function savePageantStageScores() {
  toast('Segment scores saved! ✓', 'success');
  triggerAutosave();
  closeModal();
}

// ===== RESULTS =====
function renderResults() {
  const content = document.getElementById('resultsContent');
  document.getElementById('printEventName').textContent = state.event.name;
  document.getElementById('printEventDetails').textContent = `${state.event.venue}${state.event.date ? ' · ' + state.event.date : ''}`;

  if (state.groups.length === 0) {
    content.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><div class="icon">🏆</div><p>No registered contestants yet.</p></div>`;
    return;
  }

  const isPageant = state.competitionType === 'pageant';
  const ranked = state.groups.map(g => ({
    ...g,
    rawAverage: computeRawGroupAverage(g.id),
    average: computeGroupAverage(g.id),
    judgeTotals: getJudgeTotals(g.id),
    status: getGroupStatus(g.id),
    violations: (g.ruleViolations || []).filter(rid => state.rules.find(r => r.id===rid && r.affectsScoring && r.enabled)).length,
  })).sort((a, b) => b.average - a.average);

  const maxScore = ranked[0]?.average || 100;
  
  // FIX #7: Compute average score of ALL candidates dynamically
  const scoredCandidateList = ranked.filter(g => g.rawAverage > 0);
  const allCandidatesAverage = scoredCandidateList.length > 0
    ? (scoredCandidateList.reduce((sum, g) => sum + g.average, 0) / scoredCandidateList.length).toFixed(2)
    : '0.00';

  let html = `
    <div class="results-header">
      <h2>🏆 FINAL RANKINGS</h2>
      <p>${state.event.name}${state.event.date ? ' · ' + state.event.date : ''}</p>
    </div>
    <div class="score-summary-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="score-summary-item"><div class="val">${state.groups.length}</div><div class="lbl">Registered ${getFormatKeywordPlural()}</div></div>
      <div class="score-summary-item"><div class="val" style="color:var(--accent3);">${scoredCandidateList.length}</div><div class="lbl">Scored Active</div></div>
      <div class="score-summary-item"><div class="val" style="color:var(--accent2);">${allCandidatesAverage}%</div><div class="lbl">Overall Gen. Average Score</div></div>
      <div class="score-summary-item"><div class="val" style="color:var(--accent);">${ranked.filter(g => g.rawAverage === 0).length}</div><div class="lbl">Pending Scores</div></div>
    </div>`;

  ranked.forEach((g, i) => {
    const rank = i + 1;
    const rankClass = rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-other';
    const rankEmoji = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const progressWidth = maxScore > 0 ? (g.average / maxScore * 100).toFixed(1) : 0;
    const judgeScoreText = g.judgeTotals.map((t, j) => t !== null ? `${state.judgeNames[j]}: ${t.toFixed(2)}%` : `${state.judgeNames[j]}: —`).join(' · ');
    
    // FIX #7: Track execution steps and flag when/where candidate was eliminated explicitly
    let eliminationLabel = '';
    let lastSegmentParticipated = 'None';
    
    if (isPageant) {
      let isEliminated = false;
      let cutSegmentName = '';
      
      for (let si = 0; si < state.pageantStages.length; si++) {
        const stage = state.pageantStages[si];
        const activeInSegment = getActiveCandidatesForStage(stage.id);
        if (activeInSegment.some(a => a.id === g.id)) {
          lastSegmentParticipated = stage.name;
        } else {
          if (!isEliminated) {
            isEliminated = true;
            const prevCut = state.progressiveCuts.find(c => c.afterStageId === state.pageantStages[si-1]?.id && c.enabled);
            cutSegmentName = prevCut ? prevCut.label : `Segment ${si}`;
          }
        }
      }
      if (isEliminated) {
        eliminationLabel = `<span class="badge badge-pending" style="margin-left:8px; background-color: #721c24; color: #f8d7da;">🛑 Eliminated at ${cutSegmentName}</span>`;
      }
    }

    const statusBadge = g.rawAverage > 0 ? (eliminationLabel || '<span class="badge badge-scored" style="margin-left:8px;">Active</span>') : '<span class="badge badge-pending" style="margin-left:8px;">Pending</span>';
    const violBadge = g.violations > 0 ? `<span class="badge" style="margin-left:6px;background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);">⚠️ −${(g.rawAverage - g.average).toFixed(2)}</span>` : '';
    const memberInfo = g.members ? ` · ${g.members} members` : '';
    const pageantHistoryText = isPageant ? `<div style="font-size:0.75rem; color: var(--text-dim); margin-top:2px;">Last Active Segment: <strong>${lastSegmentParticipated}</strong></div>` : '';

    html += `
      <div class="rank-card ${rankClass}">
        <div class="rank-badge">${rankEmoji}</div>
        <div class="rank-info">
          <h3>${g.name}${statusBadge}${violBadge}</h3>
          <div class="zone-tag">📍 ${g.zone}${memberInfo} · ${getFormatKeyword()} #${g.order}</div>
          <div class="judge-scores">${judgeScoreText}</div>
          ${pageantHistoryText}
          <div class="progress-bar"><div class="progress-fill" style="width:${progressWidth}%"></div></div>
        </div>
        <div class="rank-score">
          <div class="final-score">${g.average.toFixed(2)}</div>
          <div class="score-label">AVG SCORE %</div>
        </div>
      </div>`;
  });

  // Keep original Elimination Results Card unaltered (per note #7)
  if (isPageant && (state.progressiveCuts || []).some(c => c.enabled)) {
    html += `<div class="card" style="margin-top:16px;">
      <div class="card-title">Elimination Results</div>
      <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">Candidates advancing through each cut based on cumulative scores.</div>`;

    state.pageantStages.forEach((stage, si) => {
      const cut = getCutAfterStage(stage.id);
      if (!cut) return;

      const prevActiveCandidates = getActiveCandidatesForStage(stage.id);
      const afterActive = getActiveCandidatesForStage(state.pageantStages[si + 1]?.id);

      const cutRanked = prevActiveCandidates.map(g => ({
        ...g,
        cutScore: computeScoreThroughStage(g.id, si)
      })).sort((a, b) => b.cutScore - a.cutScore);

      html += `
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="background:var(--accent2);color:#000;border-radius:20px;padding:3px 12px;font-size:0.75rem;font-weight:700;">${cut.label}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">After: ${stage.name} → Top ${cut.advancingCount} advance</div>
          </div>
          <div style="overflow-x:auto;">
            <table class="breakdown-table">
              <thead><tr>
                <th style="width:36px;">Rank</th>
                <th>Candidate</th>
                <th style="text-align:right;">Score</th>
                <th style="text-align:center;">Status</th>
              </tr></thead>
              <tbody>
                ${cutRanked.map((g, ri) => {
                  const advances = afterActive ? afterActive.some(a => a.id === g.id) : ri < cut.advancingCount;
                  const isCutoff = ri === cut.advancingCount - 1;
                  return `<tr ${isCutoff ? 'style="border-bottom:2px solid var(--accent2);"' : ''}>
                    <td style="font-family:'DM Mono',monospace;text-align:center;">${ri+1}</td>
                    <td>${g.name} <span style="font-size:0.7rem;color:var(--text-dim);">${g.zone}</span></td>
                    <td style="text-align:right;font-family:'DM Mono',monospace;">${g.cutScore.toFixed(2)}%</td>
                    <td style="text-align:center;">${advances
                      ? '<span class="badge badge-scored">✓ Advances</span>'
                      : '<span class="badge badge-pending">Eliminated</span>'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  // Detailed breakdowns 
  if (scoredCandidateList.length > 0) {
    html += `<div class="card" style="margin-top:16px;"><div class="card-title">📊 Detailed Score Breakdown</div>`;
    scoredCandidateList.forEach((g, i) => {
      const deduction = computeViolationDeduction(g);
      const deductRow = deduction > 0
        ? `<tr style="color:var(--accent);"><td colspan="${2+state.numJudges}">⚠️ Rule Violation Deduction</td><td style="text-align:right;">—</td><td style="text-align:right;color:var(--accent);">−${deduction.toFixed(2)}</td></tr>`
        : '';

      if (isPageant) {
        html += `
          <div style="margin-bottom:24px; padding-bottom:16px; border-bottom:1px dashed var(--border);">
            <div class="flex-between" style="margin-bottom:12px;">
              <strong style="font-size:0.95rem;">#${g.order} ${g.name}</strong>
              <span class="font-mono" style="color:var(--accent2);font-size:0.9rem;">Final Score: ${g.average.toFixed(2)}%</span>
            </div>`;

        state.pageantStages.forEach((stage, si) => {
          const activeCandidates = getActiveCandidatesForStage(stage.id);
          const participated = activeCandidates.some(a => a.id === g.id);

          html += `
            <div style="margin-bottom:12px; margin-left: 10px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="font-size:0.82rem;font-weight:700;color:var(--accent3);">
                  Segment ${si+1}: ${stage.name} (${stage.weight}%)
                </div>
                ${!participated ? '<span class="badge badge-pending" style="font-size:0.65rem; background-color:#3a1015;">Eliminated / Non-Participant</span>' : ''}
              </div>`;

          if (participated) {
            html += `<div style="overflow-x:auto;"><table class="breakdown-table">
              <thead><tr>
                <th>Sub-Criteria</th>
                <th style="text-align:right;">Max</th>
                ${Array.from({length:state.numJudges},(_,j)=>`<th style="text-align:right;">${state.judgeNames[j]}</th>`).join('')}
                <th style="text-align:right;">Weighted Contribution</th>
              </tr></thead>
              <tbody>`;

            stage.criteria.forEach(c => {
              const judgeVals = Array.from({length:state.numJudges}, (_, j) => {
                return ((state.scores[g.id] || {})[j] || {})[`stage_${stage.id}`]?.[c.id] || 0;
              });
              const valid = judgeVals.filter(v => v !== '');
              const avgRaw = valid.length ? valid.reduce((s,v)=>s+v,0)/valid.length : 0;
              const contribution = state.scoringMethod === 'percent' ? (avgRaw * c.weight / 100) : avgRaw;

              html += `<tr>
                <td>${c.name}</td>
                <td style="text-align:right;">${state.scoringMethod === 'direct' ? c.weight : '100'}</td>
                ${judgeVals.map(v=>`<td style="text-align:right;">${parseFloat(v).toFixed(1)}</td>`).join('')}
                <td style="text-align:right;color:var(--accent2); font-family: 'DM Mono';">${(contribution * stage.weight / 100).toFixed(2)}%</td>
              </tr>`;
            });
            html += `</tbody></table></div>`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      } else {
        const rows = state.criteria.map(c => {
          const judgeVals = Array.from({length: state.numJudges}, (_, j) => {
            return ((state.scores[g.id] || {})[j] || {})[c.id] || 0;
          });
          const avgScore = judgeVals.reduce((s,v) => s+v, 0)/state.numJudges;
          const contribution = state.scoringMethod === 'percent' ? (avgScore * c.weight / 100) : avgScore;
          return `<tr>
            <td>${c.name}</td>
            <td style="text-align:right;">${c.weight}</td>
            ${judgeVals.map(v => `<td style="text-align:right;">${parseFloat(v).toFixed(1)}</td>`).join('')}
            <td style="text-align:right;">${avgScore.toFixed(2)}</td>
            <td style="text-align:right;">${contribution.toFixed(2)}</td>
          </tr>`;
        }).join('');

        html += `
          <div style="margin-bottom:18px;">
            <div class="flex-between" style="margin-bottom:8px;">
              <strong style="font-size:0.9rem;">#${g.order} ${g.name}</strong>
              <span class="font-mono" style="color:var(--accent2);font-size:0.9rem;">${g.average.toFixed(2)}%</span>
            </div>
            <div style="overflow-x:auto;">
              <table class="breakdown-table"><thead><tr>
                <th>Criteria</th>
                <th style="text-align:right;">Max</th>
                ${Array.from({length:state.numJudges},(_,j) => `<th style="text-align:right;">${state.judgeNames[j]}</th>`).join('')}
                <th style="text-align:right;">Avg</th>
                <th style="text-align:right;">Contribution</th>
              </tr></thead>
              <tbody>${rows}${deductRow}</tbody>
              <tfoot><tr class="total-row">
                <td colspan="${2+state.numJudges}"><strong>FINAL SCORE</strong></td>
                <td style="text-align:right;"></td>
                <td style="text-align:right;"><strong>${g.average.toFixed(2)}%</strong></td>
              </tr></tfoot></table>
            </div>
          </div>`;
      }
    });
    html += '</div>';
  }

  html += `<div style="text-align:center;padding:24px 0 8px;">
    <button class="btn btn-success" onclick="printResults()">🖨️ Print Results</button>
  </div>`;

  content.innerHTML = html;
}

// ===== PRINT SCHEDULER MATRIX ENGINE =====
// FIX #5: Pageant sheets compressed in a single compact matrix sheet per segment
function buildScoresheets() {
  const container = document.getElementById('scoresheetContainer');
  const eventName = state.event.name || 'Competition';
  const eventDate = state.event.date ? new Date(state.event.date).toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'}) : '';
  const eventVenue = state.event.venue || '';
  const subLine = [eventVenue, eventDate].filter(Boolean).join(' · ');
  const totalJudges = state.numJudges || 1;

  let pagesHtml = '';

  for (let j = 0; j < totalJudges; j++) {
    const judgeName = state.judgeNames[j] || `Judge ${j+1}`;

    if (state.competitionType === 'pageant') {
      // Loop across each segment to create compressed matrices
      state.pageantStages.forEach((stage, si) => {
        // Collect currently surviving advancing candidates for this specific segment row layout
        const survivingCandidates = getActiveCandidatesForStage(stage.id);
        const candidatesToPrint = survivingCandidates.length > 0 ? survivingCandidates : [{id:0, name:'Sample Candidate Name', zone:'Representing Location', order:1}];

        let matrixHeadSubColumns = stage.criteria.map(c => `<th style="text-align:center; font-size:0.75rem;">${c.name}<br><small>(${state.scoringMethod === 'direct' ? c.weight + ' max' : '100 pts'})</small></th>`).join('');
        
        let matrixRows = candidatesToPrint.map(cand => {
          let scoreBoxes = stage.criteria.map(() => `<td style="height: 38px; width: 90px;"><div style="border: 1px dashed #ccc; height:100%;"></div></td>`).join('');
          return `
            <tr>
              <td style="text-align:center; font-weight:bold; font-family: 'DM Mono'; padding:8px;">#${cand.order}</td>
              <td style="padding:8px;"><strong>${cand.name}</strong> <br><small style="color:#666;">${cand.zone}</small></td>
              ${scoreBoxes}
              <td style="width:100px;"><div style="border: 1px solid #333; height: 32px; background:#f9f9f9;"></div></td>
            </tr>`;
        }).join('');

        pagesHtml += `
          <div class="scoresheet-page layout-matrix" style="page-break-after: always; padding: 20px; font-family: 'DM Sans', sans-serif; color:#000; background:#fff;">
            <div style="text-align:center; margin-bottom:15px; border-bottom: 2px dashed #000; padding-bottom:10px;">
              <h1 style="font-family:'Bebas Neue', sans-serif; font-size: 2.2rem; margin:0; letter-spacing:1px;">${stage.name.toUpperCase()}</h1>
              <div style="font-size:0.9rem; text-transform:uppercase; font-weight:600; color:#444;">Main Segment Headline · Sub-Criteria Matrix View</div>
              <div style="font-size:0.8rem; color:#666; margin-top:2px;">${eventName} &nbsp;|&nbsp; ${subLine}</div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.85rem; background:#f0f0f2; padding:8px 12px; border-radius:4px;">
              <div><strong>JUDGE EVALUATOR:</strong> ${judgeName}</div>
              <div><strong>METHOD:</strong> ${state.scoringMethod === 'direct' ? 'Direct Point Weights' : '0-100 Percentage Grading Method'}</div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:0.85rem;" border="1" cellpadding="6">
              <thead>
                <tr style="background-color:#e1e1e5; text-align:left;">
                  <th style="width:60px; text-align:center;">No.</th>
                  <th>Candidate Name / Region</th>
                  ${matrixHeadSubColumns}
                  <th style="text-align:center; width:100px;">Total Score</th>
                </tr>
              </thead>
              <tbody>
                ${matrixRows}
              </tbody>
            </table>

            <div style="margin-top:40px; display:flex; justify-content:space-between; font-size:0.75rem;">
              <div style="width:45%; text-align:center;">
                <div style="border-bottom:1px solid #000; margin-bottom:5px; height:25px;"></div>
                <span>${judgeName} Signature over Printed Name</span>
              </div>
              <div style="width:20%; text-align:center;">
                <div style="border-bottom:1px solid #000; margin-bottom:5px; height:25px;"></div>
                <span>Date & Time</span>
              </div>
              <div style="width:25%; text-align:center;">
                <div style="border-bottom:1px solid #000; margin-bottom:5px; height:25px;"></div>
                <span>Tabulator Signature Verification</span>
              </div>
            </div>
          </div>`;
      });
    } else {
      // Standard Group/Solo Multi-sheet fallback structure
      const groupsToPrint = state.groups.length > 0 ? state.groups : [{ id: 0, name: 'Sample Entry Name', zone: 'Representing Area', order: '—', members: null }];
      for (const g of groupsToPrint) {
        const rows = state.criteria.map(c => `
          <tr>
            <td class="criteria-cell" style="padding:10px; border:1px solid #000;">${c.name}</td>
            <td class="max-cell" style="padding:10px; text-align:center; border:1px solid #000;">${c.weight}</td>
            <td class="score-cell" style="padding:10px; border:1px solid #000;"><div style="border:1px dashed #777; height:24px;"></div></td>
          </tr>`).join('');
        
        pagesHtml += `
          <div class="scoresheet-page" style="page-break-after: always; padding: 25px; color:#000; background:#fff;">
            <div style="text-align:center; margin-bottom:20px;">
              <h2 style="margin:0; font-size:1.8rem;">${eventName}</h2>
              <div style="font-size:0.9rem; color:#444;">${subLine}</div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border:1px solid #000; padding:10px; font-size:0.85rem;">
              <div><strong>Judge:</strong> ${judgeName}</div>
              <div><strong>Entry Profile:</strong> #${g.order} - ${g.name} (${g.zone})</div>
            </div>
            <table style="width:100%; border-collapse:collapse;" border="1">
              <thead>
                <tr style="background:#eee;">
                  <th style="padding:8px; text-align:left;">Criteria Description</th>
                  <th style="padding:8px; width:100px; text-align:center;">Weight/Max</th>
                  <th style="padding:8px; width:150px; text-align:center;">Score Given</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:50px; border-top:1px solid #000; width:250px; text-align:center; font-size:0.8rem; padding-top:5px;">
              Evaluator Auth Signature
            </div>
          </div>`;
      }
    }
  }
  container.innerHTML = pagesHtml;
}

function printScoresheets() {
  buildScoresheets();
  document.body.classList.add('print-scoresheets');
  window.print();
  setTimeout(() => document.body.classList.remove('print-scoresheets'), 500);
}

function printResults() {
  renderResults();
  document.body.classList.remove('print-scoresheets');
  window.print();
}