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

  // ── Elimination System ──
  // Each cut defines: after which stageId, how many advance, and a display label.
  // When a cut is applied, only the top-N candidates by score-so-far continue.
  // Set enabled:false to skip a cut without deleting it.
  progressiveCuts: [
    { id: 1, afterStageId: 4, advancingCount: 5, label: 'Semi-Finalists — Top 5',  enabled: true },
    { id: 2, afterStageId: 5, advancingCount: 3, label: 'Finalists — Top 3',  enabled: true },
  ],
  nextCutId: 10,

  // Segments are SEQUENTIAL; scoring of later stages only applies to advancing candidates.
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

  // candidateStatus: tracks which candidates are active per stage (after cuts are applied)
  // { candidateId: { stageId: 'active'|'eliminated'|'advancing' } }
  candidateStatus: {},

  // 'direct'  = score entered IS the weighted score (max = criteria weight)
  // 'percent' = score entered is 0–100; final contribution = score * weight / 100
  scoringMethod: 'direct',

  rules: [
    { id: 1, text: 'Candidates must be single in their marital status', category: 'marital', affectsScoring: false, deductionType: 'none', deductionValue: 0, enabled: true },
    { id: 2, text: 'Candidates must be at least 18 years old', category: 'age', affectsScoring: false, deductionType: 'none', deductionValue: 0, enabled: true },
  ],
  nextRuleId: 10,
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('eventDate').value = today;
  checkAutosaveOnLoad();
  renderCriteria();
  updateJudgeNames();
  syncSetupFields();
  autosaveIntervalId = setInterval(autosave, 180000); // 3 Minutes Autosave Interval
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


// ===== DISPLAY LABEL HELPERS =====
// Returns the entity label (plural/singular) based on competition type — never touches variables
function entityLabel(plural = true) {
  const t = state.competitionType;
  if (t === 'pageant') return plural ? 'Candidates' : 'Candidate';
  if (t === 'solo')    return plural ? 'Contestants' : 'Contestant';
  return plural ? 'Groups' : 'Group';
}
// Returns "Segment(s)" label — used everywhere stage/stages appeared as display text
function segmentLabel(plural = true) {
  return plural ? 'Segments' : 'Segment';
}
// Short verb form for scoring panel info pill
function entityLabelActive() {
  const t = state.competitionType;
  if (t === 'pageant') return 'Active Candidates';
  if (t === 'solo')    return 'Contestants';
  return 'Groups';
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
    if (pt !== 100) { toast(`Stage weights must total 100% (currently ${pt}%)`, 'error'); return; }
    // FIX #2: validate sub-criteria weights per stage
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

  // FIX #2: Update candidate tab UI based on competition format
  updateCandidateTabUI(val);
  renderPageantStages();
  renderProgressiveCuts();
  if (save) triggerAutosave();
}

// FIX #2 & #3: Adapt the candidate/groups tab UI per competition type
function updateCandidateTabUI(type) {
  // Label for name field
  const groupLabel = document.getElementById('groupOrSoloLabel');
  if (groupLabel) {
    groupLabel.textContent = type === 'pageant' ? 'Candidate Name'
      : type === 'solo' ? 'Contestant Name'
      : 'Group Name';
  }

  // FIX #3: Rename "Zone / Barangay" to "Address / Representing"
  const zoneLabel = document.querySelector('label[for="newGroupZone"], #zoneFieldLabel');
  if (zoneLabel) zoneLabel.textContent = 'Address / Representing';

  // FIX #2: Show/hide members field for solo and pageant (individual competitions)
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
    <div class="criteria-item" style="margin-bottom:10px;flex-direction:row;align-items:stretch;gap:8px;padding:12px;" id="pstage-${si}">
      <div style="padding-left:12px;border-left:2px solid var(--border);">
      <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;">
        <input class="criteria-name-input" type="text" value="${stage.name}"
               oninput="state.pageantStages[${si}].name=this.value" placeholder="Stage name" style="flex:1;">
        <input type="number" min="1" max="100" value="${stage.weight}" style="width:60px;text-align:center;"
               oninput="state.pageantStages[${si}].weight=parseInt(this.value)||0;updatePageantWeightTotal()">
        <span class="criteria-weight-tag">%</span>
        <label class="toggle-label" title="Reset contestant scores at start of this stage">
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
          <span class="weight-total ${subOk ? 'ok' : 'bad'}" style="padding:0px 18px;font-size:0.75rem;" id="subTotal-${si}">Total: ${subTotal}%</span>
        </div>
        ${stage.criteria.map((sc, ci) => `
          <div style="display:flex;gap:6px;margin-bottom:5px;align-items:center;">
            <input type="text" value="${sc.name}" style="flex:1;font-size:0.82rem;"
                   oninput="state.pageantStages[${si}].criteria[${ci}].name=this.value" placeholder="Sub-criteria">
            <input type="number" min="0" max="100" value="${sc.weight}" style="width:65px;text-align:center;font-size:0.82rem;"
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

// FIX #1: Dedicated setter — ensures the value is stored as a true boolean, not a string
function setPageantBackToZero(stageIdx, val) {
  state.pageantStages[stageIdx].backToZero = val === true || val === 'true';
  triggerAutosave();
}

// FIX #2: Live sub-criteria total update
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
  state.pageantStages.push({ id: newId, name: 'New Stage', weight: 0, backToZero: false, criteria: [{ id: 1, name: 'Performance', weight: 100 }] });
  renderPageantStages();
}
function removePageantStage(idx) {
  if (state.pageantStages.length <= 1) { toast('Need at least one stage.', 'error'); return; }
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
// Returns candidates still active (not yet eliminated) at the start of a given stageId.
// If no cuts exist or no candidates registered, returns all groups.
function getActiveCandidatesForStage(stageId) {
  if (state.competitionType !== 'pageant' || !state.progressiveCuts) return [...state.groups];

  // Find the most recent cut that comes BEFORE this stage
  const stageIdx = state.pageantStages.findIndex(s => s.id === stageId);
  if (stageIdx === 0) return [...state.groups]; // everyone active at stage 1

  // Work through cuts in stage order
  let activeCandidates = [...state.groups];
  for (let si = 0; si < stageIdx; si++) {
    const prevStage = state.pageantStages[si];
    const cut = state.progressiveCuts.find(c => c.afterStageId === prevStage.id && c.enabled);
    if (!cut) continue;

    // Rank active candidates by their score through this stage
    const scored = activeCandidates.map(g => ({
      ...g,
      stageScore: computeScoreThroughStage(g.id, si)
    })).sort((a, b) => b.stageScore - a.stageScore);

    // Only keep top N; handle ties at the cutoff
    const cutoff = Math.min(cut.advancingCount, scored.length);
    if (cutoff > 0 && cutoff < scored.length) {
      const cutoffScore = scored[cutoff - 1].stageScore;
      // Include ties at the boundary
      activeCandidates = scored.filter((g, i) => i < cutoff || g.stageScore === cutoffScore);
    }
    // If fewer candidates than cut allows, all advance
  }
  return activeCandidates;
}

// Compute a candidate's cumulative raw score through stage index si (inclusive)
function computeScoreThroughStage(groupId, throughStageIdx) {
  const doneJudges = Array.from({length: state.numJudges}, (_, j) => j)
    .filter(j => isJudgeDoneForStages(groupId, j, throughStageIdx));
  if (!doneJudges.length) {
    // Fallback: average available judge data even if incomplete
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

// Get the cut that applies AFTER a given stageId (if any)
function getCutAfterStage(stageId) {
  return (state.progressiveCuts || []).find(c => c.afterStageId === stageId && c.enabled) || null;
}

// Render the Progressive Cut System editor in Setup
function renderProgressiveCuts() {
  const container = document.getElementById('progressiveCutsContainer');
  if (!container) return;
  const cuts = state.progressiveCuts || [];
  if (cuts.length === 0) {
    container.innerHTML = '<div class="text-dim" style="font-size:0.82rem;padding:6px 0;">No elimination defined. All candidates score all segments.</div>';
    return;
  }
  const stageOptions = state.pageantStages.map((st, si) =>
    `<option value="${st.id}">${si+1}. ${st.name}</option>`).join('');

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
    <div class="criteria-item" style="margin-bottom:10px;flex-direction:column;align-items:stretch;gap:0px;padding:10px 12px;">
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

// FIX #6: Rule violation modal — open properly, violations update score display in real time
function openRuleViolationModal(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  const scoringRules = state.rules.filter(r => r.affectsScoring && r.enabled);
  if (!group.ruleViolations) group.ruleViolations = [];
  const categoryLabel = { members:'👥', age:'🎂', marital:'💍', citizenship:'🌍', general:'📌' };

  const ruleRows = scoringRules.length === 0
    ? '<div class="text-dim" style="padding:8px 0;">No scoring rules defined. Add rules with "Affects score" enabled in Setup → Competition Rules.</div>'
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

  // Show current deduction total
  const currentDeduct = computeViolationDeduction(group);
  const currentAvg = computeRawGroupAverage(groupId);
  const afterDeduct = Math.max(0, currentAvg - currentDeduct);

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

// FIX #6: markViolation — updates state AND refreshes the summary without closing modal
function markViolation(groupId, ruleId, checked) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  if (!group.ruleViolations) group.ruleViolations = [];
  const idx = group.ruleViolations.indexOf(ruleId);
  if (checked && idx === -1) group.ruleViolations.push(ruleId);
  else if (!checked && idx !== -1) group.ruleViolations.splice(idx, 1);
  // Update the summary inside the open modal
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
    return `<span style="font-size:0.8rem;color:var(--text-dim);">Score this group first to see deduction impact.</span>`;
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

// FIX #6: Separate raw average (before deductions) from final average (after)
function computeRawGroupAverage(groupId) {
  const scores = state.scores[groupId] || {};
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
  const order = parseInt(document.getElementById('newGroupOrder').value) || (state.groups.length + 1);

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

  const candidateNo = state.groups.length + 1; // registration-based candidate number
  state.groups.push({ id: state.nextGroupId++, name, zone, members: isSoloType ? null : members, order, candidateNo });
  state.groups.sort((a, b) => a.order - b.order);
  document.getElementById('newGroupName').value = '';
  document.getElementById('newGroupZone').value = '';
  if (membersInput) membersInput.value = '';
  document.getElementById('newGroupOrder').value = '';
  renderGroups();
  toast(`"${name}" added! ✓`, 'success');
  triggerAutosave();
}

function removeGroup(id) {
  if (!confirm('Remove this group?')) return;
  state.groups = state.groups.filter(g => g.id !== id);
  delete state.scores[id];
  renderGroups(); triggerAutosave();
}

function getGroupStatus(groupId) {
  if (state.competitionType === 'pageant') {
    // Pageant: check all stages all judges
    let anyDone = false;
    for (let j = 0; j < state.numJudges; j++) {
      if (isJudgeDone(groupId, j)) { anyDone = true; }
    }
    const allDone = Array.from({length: state.numJudges}, (_, j) => j).every(j => isJudgeDone(groupId, j));
    return allDone ? 'scored' : anyDone ? 'partial' : 'pending';
  }
  const scores = state.scores[groupId];
  if (!scores || !Object.keys(scores).length) return 'pending';
  const allDone = Array.from({length: state.numJudges}, (_, j) => j).every(j => isJudgeDone(groupId, j));
  if (allDone) return 'scored';
  const anyStarted = Object.values(scores).some(js =>
    Object.values(js).some(v => v !== undefined && v !== ''));
  return anyStarted ? 'partial' : 'pending';
}

function renderGroups() {
  const list = document.getElementById('groupsList');
  const count = document.getElementById('groupCount');
  const isSoloType = state.competitionType === 'solo' || state.competitionType === 'pageant';

  count.textContent = state.groups.length + ' ' + entityLabel(state.groups.length !== 1).toLowerCase();
  count.className = 'badge ' + (state.groups.length > 0 ? 'badge-scored' : 'badge-pending');

  // FIX #2: Update form labels and visibility
  updateCandidateTabUI(state.competitionType);

  if (state.groups.length === 0) {
    list.innerHTML = `<div class="empty-state"><img src=".icon/person-svgrepo-com.svg" class="icon"><p>No ${entityLabel().toLowerCase()} yet.<br>Add some above.</p></div>`;
    return;
  }

  list.innerHTML = state.groups.map(g => {
    const status = getGroupStatus(g.id);
    const badgeClass = status === 'scored' ? 'badge-scored' : status === 'partial' ? 'badge-partial' : 'badge-pending';
    const badgeLabel = status === 'scored' ? '<img src=".icon/check-svgrepo-com.svg" class="text-icon"> Scored' : status === 'partial' ? '⏳ Partial' : 'Pending';

    // FIX #6: Show violation count badge
    const violations = g.ruleViolations || [];
    const activeViolations = violations.filter(rid => {
      const r = state.rules.find(x => x.id === rid && x.affectsScoring && x.enabled);
      return !!r;
    });
    const violBadge = activeViolations.length > 0
      ? `<span class="badge" style="background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);"><img src=".icon/warning-svgrepo-com.svg" class="text-icon"> ${activeViolations.length} violation${activeViolations.length>1?'s':''}</span>`
      : '';

    const memberInfo = g.members ? ` · ${g.members} members` : '';

    // FIX #4: Per-segment status row for pageant
    let segmentStatusRow = '';
    if (state.competitionType === 'pageant') {
      const activeSoFar = state.pageantStages.filter(st => getActiveCandidatesForStage(st.id).some(a => a.id === g.id));
      const segBadges = activeSoFar.map((st, si) => {
        const realIdx = state.pageantStages.indexOf(st);
        const segSt = getCandidateSegmentStatus(g.id, realIdx);
        const segCls = segSt === 'scored' ? 'badge-scored' : segSt === 'partial' ? 'badge-partial' : 'badge-pending';
        const segIcon = segSt === 'scored' ? '<img src=".icon/check-svgrepo-com.svg" class="svg-icon">' : segSt === 'partial' ? '…' : '<img src=".icon/light-gray-arrow-reload-svgrepo-com.svg" class="svg-icon">';
        return `<span class="badge ${segCls}" style="font-size:0.6rem;padding:2px 6px;" title="Segment ${realIdx+1}: ${st.name}">${segIcon} Seg.${realIdx+1}</span>`;
      }).join(' ');
      const eliminated = state.pageantStages.length > 0 && !getActiveCandidatesForStage(state.pageantStages[state.pageantStages.length - 1].id).some(a => a.id === g.id);
      const elimBadge = eliminated
        ? `<span class="badge" style="background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);font-size:0.6rem;padding:2px 6px;"><img src=".icon/cancel-svgrepo-com.svg" class="text-icon"> Eliminated</span>`
        : '';
      segmentStatusRow = `<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px;">${segBadges}${elimBadge}</div>`;
    }

    return `
      <div class="group-item">
        <div class="group-number">No.${g.candidateNo || g.order}</div>
        <div style="flex:1;min-width:0;">
          <div class="group-name">${g.name}</div>
          <div class="group-zone"><img src=".icon/pin-svgrepo-com.svg" class="svg-icon"> ${g.zone}${memberInfo}</div>
          ${segmentStatusRow}
          ${violBadge ? `<div style="margin-top:4px;">${violBadge}</div>` : ''}
        </div>
        <div class="badge ${badgeClass}">${badgeLabel}</div>
        <div class="group-actions">
          <button class="btn btn-secondary btn-sm" title="Mark rule violations" onclick="openRuleViolationModal(${g.id})"><img src=".icon/warning-svgrepo-com.svg" class="svg-icon"></button>
          <button class="btn btn-secondary btn-sm" onclick="openScoringModal(${g.id})"><img src=".icon/bar-graph-svgrepo-com.svg" class="svg-icon"> Score</button>
          <button class="btn btn-danger btn-sm" onclick="removeGroup(${g.id})">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== SEGMENT LOCKING =====
// A segment is "complete" when ALL active candidates for that stage have been fully scored
// by ALL judges for that stage. Only then can the next segment be opened.
function isSegmentComplete(stageIdx) {
  if (state.competitionType !== 'pageant') return true;
  const stage = state.pageantStages[stageIdx];
  const activeCandidates = getActiveCandidatesForStage(stage.id);
  if (!activeCandidates.length) return false;
  return activeCandidates.every(g =>
    Array.from({length: state.numJudges}, (_, j) => j).every(j =>
      isPageantStageDone(g.id, j, stageIdx)
    )
  );
}

// Returns the highest segment index that is currently open for scoring.
// Segment 0 is always open. Segment N is open only if segment N-1 is complete.
function getMaxOpenSegmentIdx() {
  if (state.competitionType !== 'pageant') return 0;
  let max = 0;
  for (let si = 0; si < state.pageantStages.length; si++) {
    if (si === 0 || isSegmentComplete(si - 1)) {
      max = si;
    } else {
      break;
    }
  }
  return max;
}

// Per-candidate per-segment scoring status
// Returns: 'scored' | 'partial' | 'pending'
function getCandidateSegmentStatus(groupId, stageIdx) {
  const allDone = Array.from({length: state.numJudges}, (_, j) => j)
    .every(j => isPageantStageDone(groupId, j, stageIdx));
  if (allDone) return 'scored';
  const anyStarted = Array.from({length: state.numJudges}, (_, j) => j)
    .some(j => {
      const stage = state.pageantStages[stageIdx];
      const ss = ((state.scores[groupId] || {})[j] || {})[`stage_${stage.id}`] || {};
      return Object.values(ss).some(v => v !== undefined && v !== '');
    });
  return anyStarted ? 'partial' : 'pending';
}

// ===== SCORING PANEL =====
function renderScoringPanel() {
  const content = document.getElementById('scoringContent');
  if (state.groups.length === 0) {
    content.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><img src=".icon/bar-graph-svgrepo-com.svg" class="icon"><p>Add ${entityLabel().toLowerCase()} first to start scoring.</p></div>`;
    return;
  }

  // For pageant: show stage tabs at the top of the scoring panel
  let stageNav = '';
  if (state.competitionType === 'pageant') {
    stageNav = `
      <div class="card" style="margin-bottom:14px;">
        <div class="card-title">Pageant Segments</div>
        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">
          Select the active segment for scoring. Only eligible candidates appear per segment based on elimination results.
        </div>
        <div class="judge-tabs" style="flex-wrap:wrap;">
          ${(() => {
            const maxOpen = getMaxOpenSegmentIdx();
            return state.pageantStages.map((st, i) => {
              const segComplete = isSegmentComplete(i);
              const activeCandidates = getActiveCandidatesForStage(st.id);
              const isLocked = i > maxOpen;
              const isActive = i === state.currentPageantStage;
              const countLabel = activeCandidates.length < state.groups.length ? ` (${activeCandidates.length})` : '';
              const stageLabel = `${i+1}. ${st.name}${countLabel}`;
              const lockIcon = isLocked ? ' <img src=".icon/lock-svgrepo-com.svg" class="svg-icon">' : '';
              let cls = 'judge-tab';
              if (isActive) cls += ' active';
              else if (segComplete) cls += ' done';
              else if (isLocked) cls += ' locked';
              return `<div class="${cls}" onclick="setActivePageantStage(${i})" title="${isLocked ? 'Complete the previous segment to unlock' : ''}">${stageLabel}${lockIcon}</div>`;
            }).join('');
          })()}
        </div>
        ${(() => {
          const st = state.pageantStages[state.currentPageantStage];
          const cut = getCutAfterStage(st?.id);
          const active = getActiveCandidatesForStage(st?.id);
          const prevCut = state.progressiveCuts?.find(c => {
            const prevStageIdx = state.currentPageantStage - 1;
            return prevStageIdx >= 0 && c.afterStageId === state.pageantStages[prevStageIdx]?.id && c.enabled;
          });
          let notes = [];
          if (prevCut && active.length < state.groups.length) {
            notes.push(`<span style="color:var(--accent3);">✂ ${active.length} of ${state.groups.length} ${entityLabel().toLowerCase()} advance here (${prevCut.label})</span>`);
          }
          if (cut) {
            notes.push(`<span style="color:var(--accent2);">After this segment: Top ${cut.advancingCount} advance — ${cut.label}</span>`);
          }
          if (st?.backToZero) {
            notes.push(`<span style="color:var(--text-dim);">↺ Back-to-zero: scores for this segment are independent</span>`);
          }
          return notes.length ? `<div style="font-size:0.75rem;margin-top:8px;display:flex;flex-direction:column;gap:3px;">${notes.join('')}</div>` : '';
        })()}
      </div>`;
  }

  // For pageant, only show active candidates for the current stage
  const displayGroups = state.competitionType === 'pageant'
    ? getActiveCandidatesForStage(state.pageantStages[state.currentPageantStage]?.id)
    : state.groups;

  content.innerHTML = stageNav + `
    <div class="card">
      <div class="card-title">Scoring Dashboard — ${entityLabel()}</div>
      <div class="info-pills">
        <div class="info-pill">Judges: <span>${state.numJudges}</span></div>
        <div class="info-pill">${state.competitionType === 'pageant' ? segmentLabel() : 'Criteria'}: <span>${state.competitionType === 'pageant' ? state.pageantStages.length : state.criteria.length}</span></div>
        <div class="info-pill">${entityLabelActive()}: <span>${displayGroups.length}</span></div>
        ${state.competitionType === 'pageant' ? `<div class="info-pill">Active Segment: <span>${state.pageantStages[state.currentPageantStage]?.name || '—'}</span></div>` : ''}
      </div>
      <div class="groups-list">
        ${displayGroups.map(g => {
          const status = getGroupStatus(g.id);
          const badgeClass = status === 'scored' ? 'badge-scored' : status === 'partial' ? 'badge-partial' : 'badge-pending';
          const badgeLabel = status === 'scored' ? '<img src=".icon/check-svgrepo-com.svg" class="text-icon"> All Scored' : status === 'partial' ? '⏳ Partial' : '<img src=".icon/red-arrow-reload-svgrepo-com.svg" class="svg-icon"> Pending';
          const avg = status !== 'pending' ? computeGroupAverage(g.id).toFixed(2) : '—';
          return `
            <div class="group-item" style="cursor:pointer;" onclick="openScoringModal(${g.id})">
              <div class="group-number">No.${g.candidateNo || g.order}</div>
              <div style="flex:1;min-width:0;">
                <div class="group-name">${g.name}</div>
                <div class="group-zone">${g.zone}</div>
              </div>
              <div style="text-align:right;">
                <div class="badge ${badgeClass}">${badgeLabel}</div>
                ${status !== 'pending' ? `<div class="font-mono" style="font-size:0.85rem;color:var(--accent2);margin-top:4px;">${avg}%</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// FIX #4 + #5: Set active pageant stage — blocked if previous segment not complete
function setActivePageantStage(idx) {
  const maxOpen = getMaxOpenSegmentIdx();
  if (idx > maxOpen) {
    const prevStageName = state.pageantStages[idx - 1]?.name || 'previous segment';
    toast(`Complete all scores in "${prevStageName}" first.`, 'error');
    return;
  }
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

  // Judge tabs
  let tabsHtml = '<div class="judge-tabs">';
  for (let i = 0; i < state.numJudges; i++) {
    const done = isJudgeDone(groupId, i);
    tabsHtml += `<div class="judge-tab ${i===judgeIdx?'active':''} ${done&&i!==judgeIdx?'done':''}" onclick="switchJudge(${i})">${state.judgeNames[i]}</div>`;
  }
  tabsHtml += '</div>';

  // Criteria rows
  // FIX #4: For 'percent' mode, max input = 100; stored value is 0-100 raw percent
  let criteriaHtml = '';
  for (const c of state.criteria) {
    const val = judgeScores[c.id] !== undefined ? judgeScores[c.id] : '';
    const maxInput = state.scoringMethod === 'direct' ? c.weight : 100;
    const placeholder = state.scoringMethod === 'direct' ? `0–${c.weight}` : '0–100';
    const weightNote = state.scoringMethod === 'direct'
      ? `Max: <strong style="color:var(--accent2);">${c.weight} pts</strong>`
      : `Weight: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100`;
    // FIX #4: Show computed contribution for percent mode
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
      <button class="btn btn-success btn-full" onclick="saveJudgeScores()"><img src=".icon/check-svgrepo-com.svg" class="text-icon"> Save Scores</button>
    </div>
    ${state.numJudges > 1 && judgeIdx < state.numJudges - 1 ? `
    <button class="btn btn-secondary btn-full mt-8" onclick="switchJudge(${judgeIdx+1})">Next: ${state.judgeNames[judgeIdx+1]} →</button>
    ` : ''}
  `;
}

// FIX #5: Pageant scoring modal with stage navigation
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

  // Judge tabs
  let tabsHtml = '<div class="judge-tabs">';
  for (let i = 0; i < state.numJudges; i++) {
    const done = isPageantStageDone(groupId, i, stageIdx);
    tabsHtml += `<div class="judge-tab ${i===judgeIdx?'active':''} ${done&&i!==judgeIdx?'done':''}" onclick="switchJudge(${i})">${state.judgeNames[i]}</div>`;
  }
  tabsHtml += '</div>';

  // Stage navigation tabs
  const stageNavHtml = `
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
      <span style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.8px;flex-shrink:0;">Segment:</span>
      ${state.pageantStages.map((st, si) => {
        const done = isPageantStageDone(groupId, judgeIdx, si);
        return `<div class="judge-tab ${si===stageIdx?'active':''} ${done&&si!==stageIdx?'done':''}"
          onclick="switchPageantStage(${si})" style="font-size:0.72rem;padding:5px 12px;">${si+1}. ${st.name}</div>`;
      }).join('')}
    </div>`;

  // Sub-criteria rows for this stage
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
      ? `Max: <strong style="color:var(--accent2);">${c.weight} pts</strong> of this stage`
      : `Weight in stage: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100`;
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
  const grandTotal = computeJudgeTotal(groupId, judgeIdx);

  // FIX #5: Prev/Next stage navigation buttons
  const prevBtn = stageIdx > 0
    ? `<button class="btn btn-secondary" onclick="switchPageantStage(${stageIdx-1})">← ${state.pageantStages[stageIdx-1].name}</button>` : '';
  const nextBtn = stageIdx < state.pageantStages.length - 1
    ? `<button class="btn btn-secondary" style="margin-left:auto;" onclick="switchPageantStage(${stageIdx+1})">${state.pageantStages[stageIdx+1].name} →</button>` : '';

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
      <span style="font-size:0.78rem;color:var(--text-dim);">Running Total (all segments)</span>
      <span id="grandTotal" class="font-mono" style="font-size:0.95rem;color:var(--accent2);">${grandTotal.toFixed(2)}%</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      ${prevBtn}
      <button class="btn btn-success" style="flex:1;" onclick="savePageantStageScores()"><img src=".icon/check-svgrepo-com.svg" class="text-icon"> Save Stage Scores</button>
      ${nextBtn}
    </div>
  `;
}

// FIX #5: Switch pageant stage within the open modal (for editing/correction)
function switchPageantStage(stageIdx) {
  state.currentPageantStage = stageIdx;
  renderScoringModal();
}

function updateScore(criteriaId, val) {
  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;
  if (!state.scores[groupId]) state.scores[groupId] = {};
  if (!state.scores[groupId][judgeIdx]) state.scores[groupId][judgeIdx] = {};

  const c = state.criteria.find(x => x.id === criteriaId);
  const num = parseFloat(val);
  // FIX #4: Cap according to scoring method
  const maxVal = state.scoringMethod === 'direct' ? c.weight : 100;
  const clamped = isNaN(num) ? '' : Math.min(maxVal, Math.max(0, num));
  state.scores[groupId][judgeIdx][criteriaId] = clamped;

  // Clamp input visually
  const inputEl = document.getElementById('score-' + criteriaId);
  if (inputEl && clamped !== '' && parseFloat(inputEl.value) > maxVal) inputEl.value = clamped;

  // FIX #4: Update contribution label inline
  if (clamped !== '' && state.scoringMethod === 'percent') {
    const row = inputEl?.closest('.criteria-score-row');
    const tag = row?.querySelector('.criteria-weight-tag');
    if (tag) {
      const contribution = (parseFloat(clamped) * c.weight / 100).toFixed(2);
      tag.innerHTML = `Weight: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100 → <strong style="color:var(--accent3);">${contribution} pts</strong>`;
    }
  }

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

  if (!state.scores[groupId]) state.scores[groupId] = {};
  if (!state.scores[groupId][judgeIdx]) state.scores[groupId][judgeIdx] = {};
  if (!state.scores[groupId][judgeIdx][stageKey]) state.scores[groupId][judgeIdx][stageKey] = {};

  const c = stage.criteria.find(x => x.id === criteriaId);
  const num = parseFloat(val);
  const maxVal = state.scoringMethod === 'direct' ? c.weight : 100;
  const clamped = isNaN(num) ? '' : Math.min(maxVal, Math.max(0, num));
  state.scores[groupId][judgeIdx][stageKey][criteriaId] = clamped;

  // Clamp visually
  const inputEl = document.getElementById('score-stage-' + criteriaId);
  if (inputEl && clamped !== '' && parseFloat(inputEl.value) > maxVal) inputEl.value = clamped;

  // Update contribution label
  if (clamped !== '' && state.scoringMethod === 'percent') {
    const row = inputEl?.closest('.criteria-score-row');
    const tag = row?.querySelector('.criteria-weight-tag');
    if (tag) {
      const contribution = (parseFloat(clamped) * c.weight / 100).toFixed(2);
      tag.innerHTML = `Weight in stage: <strong style="color:var(--accent2);">${c.weight}%</strong> — enter 0–100 → <strong style="color:var(--accent3);">${contribution} pts</strong>`;
    }
  }

  const stageTotal = computePageantStageTotal(groupId, judgeIdx, stageIdx);
  const grandTotal = computeJudgeTotal(groupId, judgeIdx);
  const el = document.getElementById('judgeTotal');
  if (el) el.textContent = stageTotal.toFixed(2) + ' / 100';
  const gte = document.getElementById('grandTotal');
  if (gte) gte.textContent = grandTotal.toFixed(2) + '%';
  triggerAutosave();
}

// FIX #4: computeJudgeTotal — correctly applies weight for 'percent' mode
function computeJudgeTotal(groupId, judgeIdx) {
  if (state.competitionType === 'pageant') return computePageantJudgeTotal(groupId, judgeIdx);
  const js = (state.scores[groupId] || {})[judgeIdx] || {};
  return state.criteria.reduce((sum, c) => {
    const v = js[c.id];
    if (v !== undefined && v !== '') {
      const score = parseFloat(v);
      // FIX #4: percent mode multiplies raw 0-100 by weight/100
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
    // FIX #1: If backToZero and this judge hasn't scored this stage yet, skip earlier stages
    const stageRaw = computePageantStageTotal(groupId, judgeIdx, si);
    // stageRaw is out of 100; multiply by stage.weight/100 for its contribution
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

// FIX #5 + #6: Save pageant stage scores — auto-advance; segment tabs refresh on close
function savePageantStageScores() {
  toast('Segment scores saved! ✓', 'success');
  triggerAutosave();

  const groupId = state.currentScoringGroupId;
  const judgeIdx = state.currentScoringJudge;
  const stageIdx = state.currentPageantStage;

  const stageDone = isPageantStageDone(groupId, judgeIdx, stageIdx);
  if (!stageDone) {
    toast('Please fill in all sub-criteria scores first.', 'error'); return;
  }

  // Check if this segment is now fully complete for all active candidates + all judges
  // If so, the next segment button should unlock → re-render scoring panel in background
  if (isSegmentComplete(stageIdx)) {
    // Next segment can now be unlocked — update panel when modal closes
    // If we're not at the last segment, offer to advance to next
    if (stageIdx < state.pageantStages.length - 1) {
      // Check if next segment is now the newly unlocked one
      const maxOpen = getMaxOpenSegmentIdx();
      if (maxOpen > stageIdx) {
        // Navigate to next segment automatically only if it is newly unlocked
      }
    }
  }

  // Try to advance to next stage first
  if (stageIdx < state.pageantStages.length - 1) {
    const nextStage = stageIdx + 1;
    const maxOpen = getMaxOpenSegmentIdx();
    if (state.pageantStages[nextStage].backToZero === true) {
      if (!state.scores[groupId]) state.scores[groupId] = {};
      if (!state.scores[groupId][judgeIdx]) state.scores[groupId][judgeIdx] = {};
      const nextKey = `stage_${state.pageantStages[nextStage].id}`;
      state.scores[groupId][judgeIdx][nextKey] = {};
      toast(`Back-to-zero: Segment "${state.pageantStages[nextStage].name}" scores cleared.`);
    }
    // Only advance inside modal if next segment is open
    if (nextStage <= maxOpen) {
      state.currentPageantStage = nextStage;
      renderScoringModal();
      return;
    }
    // Otherwise stay but refresh so the tab shows green
    renderScoringModal();
    return;
  }

  // All stages for this judge done — try next judge
  const allStagesDone = isJudgeDone(groupId, judgeIdx);
  if (allStagesDone) {
    const allJudgesDone = Array.from({length: state.numJudges}, (_, i) => i).every(i => isJudgeDone(groupId, i));
    if (allJudgesDone) { closeModal(); toast('All judges & segments scored! ✓', 'success'); return; }
    const nextJudge = Array.from({length: state.numJudges}, (_, i) => i).find(i => !isJudgeDone(groupId, i));
    if (nextJudge !== undefined) {
      state.currentScoringJudge = nextJudge;
      state.currentPageantStage = 0;
      renderScoringModal();
    }
  }
}

// ===== COMPUTE AVERAGES =====
function computeGroupAverage(groupId) {
  const rawAvg = computeRawGroupAverage(groupId);
  const group = state.groups.find(g => g.id === groupId);
  return Math.max(0, rawAvg - computeViolationDeduction(group));
}

function getJudgeTotals(groupId) {
  return Array.from({length: state.numJudges}, (_, j) => {
    if (isJudgeDone(groupId, j)) return computeJudgeTotal(groupId, j);
    return null;
  });
}

// ===== RESULTS =====
function renderResults() {
  const content = document.getElementById('resultsContent');
  document.getElementById('printEventName').textContent = state.event.name;
  document.getElementById('printEventDetails').textContent = `${state.event.venue}${state.event.date ? ' · ' + state.event.date : ''}`;

  if (state.groups.length === 0) {
    content.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><img src=".icon/trophy-svgrepo-com.svg" class="icon"><p>No contestants registered yet.</p></div>`;
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
  const scoredGroups = ranked.filter(g => g.status === 'scored');
  const pendingGroups = ranked.filter(g => g.status === 'pending');

  const entityLabel = isPageant ? 'Candidates' : state.competitionType === 'solo' ? 'Contestants' : 'Groups';

  let html = `
    <div class="results-header">
      <h2>🏆 FINAL RANKINGS</h2>
      <p>${state.event.name}${state.event.date ? ' · ' + state.event.date : ''}</p>
    </div>
    <div class="score-summary-grid">
      <div class="score-summary-item"><div class="val">${state.groups.length}</div><div class="lbl">${entityLabel}</div></div>
      <div class="score-summary-item"><div class="val" style="color:var(--accent3);">${scoredGroups.length}</div><div class="lbl">Fully Scored</div></div>
      <div class="score-summary-item"><div class="val" style="color:var(--accent);">${pendingGroups.length}</div><div class="lbl">Pending</div></div>
    </div>`;

  // ── FIX #7: Compute elimination info per candidate for pageant ──
  const eliminationInfo = {}; // groupId → { eliminated: bool, eliminatedAfterStage: stageName|null }
  if (isPageant) {
    for (const g of ranked) {
      const lastStage = state.pageantStages[state.pageantStages.length - 1];
      const inFinal = getActiveCandidatesForStage(lastStage.id).some(a => a.id === g.id);
      if (inFinal) {
        eliminationInfo[g.id] = { eliminated: false, eliminatedAfterStage: null, lastSegmentIdx: state.pageantStages.length - 1 };
      } else {
        // Find the last segment they participated in
        let lastParticipated = -1;
        for (let si = 0; si < state.pageantStages.length; si++) {
          const active = getActiveCandidatesForStage(state.pageantStages[si].id);
          if (active.some(a => a.id === g.id)) lastParticipated = si;
        }
        const cutStage = lastParticipated >= 0 ? state.pageantStages[lastParticipated] : null;
        const cutApplied = cutStage ? getCutAfterStage(cutStage.id) : null;
        eliminationInfo[g.id] = {
          eliminated: true,
          lastSegmentIdx: lastParticipated,
          lastSegmentName: cutStage?.name || '—',
          cutLabel: cutApplied?.label || 'Elimination'
        };
      }
    }
  }

  // ── Ranking cards ──
  ranked.forEach((g, i) => {
    const rank = i + 1;
    // FIX #7: rank styling only top 3 if scored; eliminated candidates get a distinct look
    const elimInfo = eliminationInfo[g.id];
    const isEliminated = isPageant && elimInfo?.eliminated;
    const rankClass = isEliminated ? 'rank-other' : rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-other';
    const rankEmoji = isEliminated ? '<img src=".icon/cancel-svgrepo-com.svg" class="text-icon">' : rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const progressWidth = maxScore > 0 ? (g.average / maxScore * 100).toFixed(1) : 0;

    // FIX #7: Always show judge scores even for partial/eliminated
    const judgeScoreText = g.judgeTotals.map((t, j) => t !== null ? `${state.judgeNames[j]}: ${t.toFixed(2)}%` : `${state.judgeNames[j]}: —`).join(' · ');

    // FIX #7: Status badge — show Eliminated instead of Pending for pageant
    let statusBadge = '';
    if (isEliminated) {
      statusBadge = `<span class="badge" style="margin-left:8px;background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);"><img src=".icon/cancel-svgrepo-com.svg" class="text-icon"> Eliminated</span>`;
    } else if (g.status === 'partial') {
      statusBadge = '<span class="badge badge-partial" style="margin-left:8px;">Partial</span>';
    } else if (g.status === 'pending') {
      statusBadge = '<span class="badge badge-pending" style="margin-left:8px;">Pending</span>';
    }

    const violBadge = g.violations > 0 ? `<span class="badge" style="margin-left:6px;background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);"><img src=".icon/warning-svgrepo-com.svg" class="text-icon"> −${(g.rawAverage - g.average).toFixed(2)}</span>` : '';
    const memberInfo = g.members ? ` · ${g.members} members` : '';

    // FIX #7: Extra info row for pageant
    let stageInfo = '';
    if (isPageant) {
      const segsCount = elimInfo ? elimInfo.lastSegmentIdx + 1 : 0;
      if (isEliminated) {
        stageInfo = `<div style="font-size:0.7rem;color:var(--accent);margin-top:3px;">
          Eliminated after Segment ${elimInfo.lastSegmentIdx + 1}: ${elimInfo.lastSegmentName} — ${elimInfo.cutLabel}
        </div>`;
      } else {
        const stagesParticipated = state.pageantStages.filter(st => {
          const active = getActiveCandidatesForStage(st.id);
          return active.some(a => a.id === g.id);
        });
        stageInfo = `<div style="font-size:0.7rem;color:var(--text-dim);margin-top:3px;">Participated in ${stagesParticipated.length}/${state.pageantStages.length} segment${stagesParticipated.length !== 1 ? 's' : ''}</div>`;
      }
    }

    // FIX #7: Show avg score for ALL candidates (not just ranked top), with dimmed styling for eliminated
    const scoreStyle = isEliminated ? 'color:var(--text-muted)' : '';
    const scoreLabel = isEliminated ? 'SCORE (ELIM.)' : 'AVG SCORE %';

    html += `
      <div class="rank-card ${rankClass}" ${isEliminated ? 'style="opacity:0.75;"' : ''}>
        <div class="rank-badge" ${isEliminated ? 'style="background:rgba(255,61,110,0.15);color:var(--accent);border:1px solid rgba(255,61,110,0.3);font-size:0.85rem;"' : ''}>${rankEmoji}</div>
        <div class="rank-info">
          <h3>${g.name}${statusBadge}${violBadge}</h3>
          <div class="zone-tag"><img src=".icon/pin-svgrepo-com.svg" class="svg-icon"> ${g.zone}${memberInfo} · Candidate No. ${g.candidateNo || g.order}</div>
          <div class="judge-scores">${judgeScoreText}</div>
          ${stageInfo}
          <div class="progress-bar"><div class="progress-fill" style="width:${progressWidth}%"></div></div>
        </div>
        <div class="rank-score">
          <div class="final-score" style="${scoreStyle}">${g.average > 0 ? g.average.toFixed(2) : '—'}</div>
          <div class="score-label">${scoreLabel}</div>
        </div>
      </div>`;
  });

  // ── Progressive Cut Tracker (pageant only) ──
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
                      ? '<span class="badge badge-scored">Advances</span>'
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

  // ── Detailed Score Breakdown ──
  if (scoredGroups.length > 0) {
    html += `<div class="card" style="margin-top:16px;"><div class="card-title"><img src=".icon/bar-graph-svgrepo-com.svg" class="svg-icon"> Detailed Score Breakdown</div>`;

    scoredGroups.sort((a,b) => b.average-a.average).forEach((g, i) => {
      const deduction = computeViolationDeduction(g);
      const deductRow = deduction > 0
        ? `<tr style="color:var(--accent);"><td colspan="${2+state.numJudges}"><img src=".icon/warning-svgrepo-com.svg" class="text-icon"> Rule Violation Deduction</td><td style="text-align:right;">—</td><td style="text-align:right;color:var(--accent);">−${deduction.toFixed(2)}</td></tr>`
        : '';

      if (isPageant) {
        // FIX #3: Per-stage breakdown
        html += `
          <div style="margin-bottom:24px;">
            <div class="flex-between" style="margin-bottom:12px;">
              <strong style="font-size:0.95rem;">#${i+1} ${g.name}</strong>
              <span class="font-mono" style="color:var(--accent2);font-size:0.9rem;">${g.average.toFixed(2)}%</span>
            </div>`;

        // Stage-by-stage section
        state.pageantStages.forEach((stage, si) => {
          const activeCandidates = getActiveCandidatesForStage(stage.id);
          const participated = activeCandidates.some(a => a.id === g.id);
          const stageContrib = state.scoringMethod === 'direct' ? stage.weight : stage.weight;
          const cut = getCutAfterStage(stage.id);

          html += `
            <div style="margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="font-size:0.82rem;font-weight:700;color:var(--accent2);">
                  Stage ${si+1}: ${stage.name}
                </div>
                <div style="font-size:0.72rem;color:var(--text-dim);">${stage.weight}% of total</div>
                ${stage.backToZero ? '<div style="font-size:0.7rem;color:var(--warn);background:rgba(255,184,48,0.1);border-radius:4px;padding:1px 6px;">↺ Back-to-zero</div>' : ''}
                ${!participated ? '<div class="badge badge-pending" style="font-size:0.68rem;">Not in this stage</div>' : ''}
              </div>`;

          if (participated) {
            // Sub-criteria rows per judge
            html += `<div style="overflow-x:auto;"><table class="breakdown-table">
              <thead><tr>
                <th>Sub-Criteria</th>
                <th style="text-align:right;">Max</th>
                ${Array.from({length:state.numJudges},(_,j)=>`<th style="text-align:right;">${state.judgeNames[j]}</th>`).join('')}
                <th style="text-align:right;">Avg</th>
                <th style="text-align:right;">Contribution</th>
              </tr></thead>
              <tbody>`;

            let stageSumContrib = 0;
            stage.criteria.forEach(c => {
              const judgeVals = Array.from({length:state.numJudges}, (_, j) => {
                const v = ((state.scores[g.id] || {})[j] || {})[`stage_${stage.id}`]?.[c.id];
                return v !== undefined && v !== '' ? parseFloat(v) : null;
              });
              const valid = judgeVals.filter(v => v !== null);
              const avgRaw = valid.length ? valid.reduce((s,v)=>s+v,0)/valid.length : 0;
              const avgWeighted = state.scoringMethod === 'percent' ? avgRaw * c.weight / 100 : avgRaw;
              // Contribution to stage total, then to overall
              const stageContribution = avgWeighted * stage.weight / 100;
              stageSumContrib += stageContribution;

              html += `<tr>
                <td>${c.name}</td>
                <td style="text-align:right;">${state.scoringMethod === 'direct' ? c.weight : '100'}</td>
                ${judgeVals.map(v=>`<td style="text-align:right;">${v!==null?v.toFixed(1):'—'}</td>`).join('')}
                <td style="text-align:right;">${avgWeighted.toFixed(2)}</td>
                <td style="text-align:right;color:var(--accent3);">${stageContribution.toFixed(2)}%</td>
              </tr>`;
            });

            // Stage subtotal row
            const judgeStageRaws = Array.from({length:state.numJudges}, (_, j) => {
              const done = isPageantStageDone(g.id, j, si);
              if (!done) return null;
              const stageScores = ((state.scores[g.id] || {})[j] || {})[`stage_${stage.id}`] || {};
              return stage.criteria.reduce((sum, c) => {
                const v = stageScores[c.id];
                if (v === undefined || v === '') return sum;
                const score = parseFloat(v);
                return sum + (state.scoringMethod === 'percent' ? score * c.weight / 100 : score);
              }, 0);
            });

            html += `</tbody>
              <tfoot>
                <tr style="background:rgba(255,184,48,0.07);">
                  <td colspan="2" style="font-weight:700;color:var(--accent2);">Stage Subtotal (×${stage.weight}%)</td>
                  ${judgeStageRaws.map(v => `<td style="text-align:right;font-weight:600;">${v!==null?v.toFixed(2):'—'}</td>`).join('')}
                  <td style="text-align:right;font-weight:700;">${stageSumContrib > 0 ? (stageSumContrib / stage.weight * 100).toFixed(2) : '—'}</td>
                  <td style="text-align:right;font-weight:700;color:var(--accent2);">${stageSumContrib.toFixed(2)}%</td>
                </tr>
              </tfoot>
            </table></div>`;
          } else {
            html += `<div style="font-size:0.78rem;color:var(--text-muted);padding:8px 12px;background:var(--surface2);border-radius:4px;">— Candidate was eliminated before this segment —</div>`;
          }

          // Cut result divider
          if (cut) {
            const activeCandidatesAfter = getActiveCandidatesForStage(state.pageantStages[si+1]?.id);
            const advancedHere = activeCandidatesAfter ? activeCandidatesAfter.some(a => a.id === g.id) : true;
            html += `<div style="margin-top:8px;padding:6px 12px;border-radius:6px;font-size:0.75rem;display:flex;align-items:center;gap:8px;
                        background:${advancedHere ? 'rgba(61,255,209,0.07)' : 'rgba(255,61,110,0.07)'};
                        border:1px solid ${advancedHere ? 'rgba(61,255,209,0.2)' : 'rgba(255,61,110,0.2)'};">
              ${advancedHere
                ? `<span style="color:var(--accent3);"><img src=".icon/check-svgrepo-com.svg" class="text-icon"> Advanced</span> — ${cut.label}`
                : `<span style="color:var(--accent);"><img src=".icon/cancel-svgrepo-com.svg" class="text-icon"> Eliminated</span> — Did not advance in ${cut.label}`}
            </div>`;
          }

          html += `</div>`; // close stage section
        });

        // Overall total + deductions
        html += `
            <div class="judge-total" style="margin-top:8px;">
              <div class="judge-total-label">Final Score</div>
              <div class="judge-total-value">${g.average.toFixed(2)}%</div>
            </div>
            ${deductRow ? `<div style="font-size:0.78rem;color:var(--accent);padding:6px 0;"><img src=".icon/warning-svgrepo-com.svg" class="text-icon"> Rule deduction applied: −${deduction.toFixed(2)} pts</div>` : ''}
          </div>`; // close candidate section

      } else {
        // Standard (non-pageant) breakdown — unchanged
        const rows = state.criteria.map(c => {
          const judgeVals = Array.from({length: state.numJudges}, (_, j) => {
            const v = ((state.scores[g.id] || {})[j] || {})[c.id];
            return v !== undefined && v !== '' ? parseFloat(v) : null;
          });
          const valid = judgeVals.filter(v => v !== null);
          const avgScore = valid.length ? valid.reduce((s,v) => s+v, 0)/valid.length : 0;
          const contribution = state.scoringMethod === 'percent' ? (avgScore * c.weight / 100) : avgScore;
          return `<tr>
            <td>${c.name}</td>
            <td style="text-align:right;">${c.weight}</td>
            ${judgeVals.map(v => `<td style="text-align:right;">${v !== null ? v.toFixed(1) : '—'}</td>`).join('')}
            <td style="text-align:right;">${avgScore.toFixed(2)}</td>
            <td style="text-align:right;">${contribution.toFixed(2)}</td>
          </tr>`;
        }).join('');

        html += `
          <div style="margin-bottom:18px;">
            <div class="flex-between" style="margin-bottom:8px;">
              <strong style="font-size:0.9rem;">#${i+1} ${g.name}</strong>
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
          </div>` + (i < scoredGroups.length - 1 ? '<hr class="divider">' : '');
      }
    });
    html += '</div>';
  }

  html += `<div style="text-align:center;padding:24px 0 8px;">
    <button class="btn btn-success" onclick="printResults()"><img src=".icon/printer-svgrepo-com.svg" class="text-icon"> Print Results</button>
  </div>`;

  content.innerHTML = html;
}

// ===== PRINT =====
function buildScoresheets() {
  const container = document.getElementById('scoresheetContainer');
  const eventName = state.event.name || 'Competition';
  const eventDate = state.event.date ? new Date(state.event.date).toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'}) : '';
  const eventVenue = state.event.venue || '';
  const subLine = [eventVenue, eventDate].filter(Boolean).join(' · ');
  const groups = state.groups.length > 0 ? state.groups : [{ id: 0, name: '________________________', zone: '____________', order: '—', members: null }];

  let pagesHtml = '';

  if (state.competitionType === 'pageant') {
    // PAGEANT: one sheet per judge per SEGMENT (all candidates on one sheet, horizontal sub-criteria columns)
    for (let j = 0; j < state.numJudges; j++) {
      const judgeName = state.judgeNames[j] || `Judge ${j+1}`;
      for (const stage of state.pageantStages) {
        pagesHtml += buildPageantScoresheetPage(eventName, subLine, judgeName, groups, stage);
      }
    }
  } else {
    // GROUP / SOLO: unchanged — one sheet per judge per contestant
    for (let j = 0; j < state.numJudges; j++) {
      const judgeName = state.judgeNames[j] || `Judge ${j+1}`;
      for (const g of groups) {
        const rows = state.criteria.map(c => `
          <tr>
            <td class="criteria-cell">${c.name}</td>
            <td class="max-cell">${c.weight}</td>
            <td class="score-cell"><div class="ss-score-box"></div></td>
          </tr>`).join('');
        pagesHtml += buildScoresheetPage(eventName, subLine, judgeName, g, rows, '', '');
      }
    }
  }

  container.innerHTML = pagesHtml;
}

// PAGEANT SCORESHEET: one page per judge per segment.
// Rows = candidates (No. | Name | sub-criteria…). Segment name is the main headline.
function buildPageantScoresheetPage(eventName, subLine, judgeName, groups, stage) {
  const isB2Z = stage.backToZero === true;

  // Build column headers: No. | Candidate Name | sub-criteria... | TOTAL
  const subCritHeaders = stage.criteria.map(c =>
    `<th class="ps-sub-th">${c.name}<br><span class="ps-max-tag">max ${c.weight}</span></th>`
  ).join('');

  // Build one row per candidate
  const candidateRows = groups.map(g => {
    const orderLabel = (g.order && g.order !== '—') ? `#${g.order}` : (g.order || '');
    const subCells = stage.criteria.map(() =>
      `<td class="ps-score-cell"><div class="ps-score-box"></div></td>`
    ).join('');
    return `<tr>
      <td class="ps-no-cell">${orderLabel}</td>
      <td class="ps-name-cell">${g.name}${g.zone && g.zone !== '____________' ? `<div class="ps-zone">${g.zone}</div>` : ''}</td>
      ${subCells}
      <td class="ps-total-cell"><div class="ps-total-box"></div></td>
    </tr>`;
  }).join('');

  return `
    <div class="scoresheet-page pageant-scoresheet-page">
      <!-- Event header -->
      <div class="ss-event-header" style="margin-bottom:10px;">
        <h1>${eventName}</h1>
        ${subLine ? `<div class="ss-sub">${subLine}</div>` : ''}
      </div>

      <!-- Segment headline banner -->
      <div class="ps-segment-banner">
        <div class="ps-segment-name">${stage.name}</div>
        <div class="ps-segment-meta">
          Segment Weight: <strong>${stage.weight}%</strong>
          ${isB2Z ? '&nbsp;·&nbsp;<span class="ps-b2z-tag">⚠ Back-to-Zero</span>' : ''}
        </div>
      </div>

      <!-- Judge block -->
      <div class="ps-judge-row">
        <div class="ps-judge-item">
          <div class="ss-label">Judge</div>
          <div class="ps-judge-name">${judgeName}</div>
        </div>
        <div class="ps-judge-item" style="flex:2;">
          <div class="ss-label">Signature</div>
          <div class="ps-sig-underline"></div>
        </div>
        <div class="ps-judge-item">
          <div class="ss-label">Date / Time</div>
          <div class="ps-sig-underline"></div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="ss-instructions" style="margin-bottom:10px;">
        <strong>Instructions:</strong>
        ${state.scoringMethod === 'direct'
          ? 'Score each sub-criteria from 0 up to the Max Score shown. The max score for each sub-criteria is its weight. Your total per candidate must not exceed <strong>100</strong>.'
          : 'Enter a score of <strong>0–100</strong> for each sub-criteria. Your score will be multiplied by the sub-criteria weight % to get the weighted contribution.'}
      </div>

      <!-- Candidate scoring table -->
      <div class="ps-table-wrap">
        <table class="ps-table">
          <thead>
            <tr>
              <th class="ps-no-th">No.</th>
              <th class="ps-name-th">Candidate Name</th>
              ${subCritHeaders}
              <th class="ps-total-th">Total<br><span class="ps-max-tag">/ 100</span></th>
            </tr>
          </thead>
          <tbody>${candidateRows}</tbody>
        </table>
      </div>

      <!-- Tabulator sign-off -->
      <div class="ss-sig-block" style="margin-top:16px;">
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Judge's Signature over Printed Name</div></div>
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Date &amp; Time</div></div>
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Tabulator / Received by</div></div>
      </div>
    </div>`;
}

function buildScoresheetPage(eventName, subLine, judgeName, g, criteriaRows, stageLabel, stageNote) {
  const memberInfo = g.members ? ` &nbsp;|&nbsp; ${g.members} members` : '';
  return `
    <div class="scoresheet-page">
      <div class="ss-event-header">
        <h1>${eventName}</h1>
        ${subLine ? `<div class="ss-sub">${subLine}</div>` : ''}
        ${stageLabel ? `<div class="ss-sub" style="font-weight:700;color:#333;margin-top:4px;">${stageLabel}</div>` : ''}
        ${stageNote ? `<div class="ss-sub" style="color:#888;">${stageNote}</div>` : ''}
      </div>
      <div class="ss-judge-block">
        <div><div class="ss-label">Judge Name</div><div class="ss-value">${judgeName}</div></div>
        <div><div class="ss-label">Signature</div><div class="ss-value" style="min-width:160px;">&nbsp;</div></div>
      </div>
      <div class="ss-group-name">
        ${g.name}
        ${g.zone && g.zone !== '____________' ? `&nbsp;|&nbsp; ${g.zone}` : ''}
        ${g.order && g.order !== '—' ? `&nbsp;|&nbsp; #${g.order}` : ''}
        ${memberInfo}
      </div>
      <div class="ss-instructions">
        <strong>Instructions:</strong>
        ${state.scoringMethod === 'direct'
          ? 'Score each criteria from 0 up to the Max Score shown. The max score equals the criteria\'s weight. Your total must not exceed <strong>100</strong>.'
          : 'Enter a score of <strong>0–100</strong> for each criteria. Your score will be multiplied by the criteria\'s weight % to get the weighted contribution.'}
      </div>
      <table class="ss-table">
        <thead><tr>
          <th>Criteria</th>
          <th class="right" style="width:80px;">${state.scoringMethod === 'direct' ? 'Max Score' : 'Weight %'}</th>
          <th class="right" style="width:130px;">Score Given</th>
        </tr></thead>
        <tbody>${criteriaRows}</tbody>
        <tfoot><tr class="ss-total-row">
          <td colspan="2" style="text-align:right;padding-right:16px;font-size:0.9rem;">TOTAL SCORE (out of 100)</td>
          <td style="text-align:center;padding:8px;"><div class="ss-total-box"></div></td>
        </tr></tfoot>
      </table>
      <div class="ss-sig-block">
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Judge's Signature over Printed Name</div></div>
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Date & Time</div></div>
        <div class="ss-sig-item"><div class="ss-sig-line"></div><div class="ss-sig-label">Tabulator / Received by</div></div>
      </div>
    </div>`;
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