/**
 * HUNTERS CRICKET TOURNAMENT
 * app.js – Shared Data Layer & Utilities
 */

// ─── CONSTANTS ───────────────────────────────────────────────────
const HCT = {
  STORAGE_KEY: 'hct_data',
  ROUNDS: [
    { id: 1, name: 'Round 1' },
    { id: 2, name: 'Round 2' },
    { id: 3, name: 'Round 3' },
    { id: 4, name: 'Round 4' },
    { id: 5, name: 'Semi Final' },
    { id: 6, name: 'Final' },
  ],
  OVERS_PER_INNINGS: 6,
  STATUS: { UPCOMING: 'UPCOMING', LIVE: 'LIVE', COMPLETED: 'COMPLETED' },
};

// ─── DEFAULT DATA STRUCTURE ───────────────────────────────────────
function getDefaultData() {
  return {
    matches: [],       // array of match objects
    nextMatchId: 1,
    champion: null,    // winning team name after final
    version: 3,
  };
}

// ─── STORAGE ──────────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(HCT.STORAGE_KEY);
    if (!raw) return getDefaultData();
    const d = JSON.parse(raw);
    if (!d.version || d.version < 3) return getDefaultData();
    return d;
  } catch (e) {
    return getDefaultData();
  }
}

function saveData(data) {
  localStorage.setItem(HCT.STORAGE_KEY, JSON.stringify(data));
}

// ─── MATCH FACTORY ────────────────────────────────────────────────
/**
 * Creates a match object
 * @param {number} id
 * @param {number} round (1-6)
 * @param {number} matchNumber
 * @param {string} teamA
 * @param {string} teamB
 */
function createMatch(id, round, matchNumber, teamA, teamB) {
  return {
    id,
    round,
    matchNumber,
    teamA: teamA.trim(),
    teamB: teamB.trim(),
    status: HCT.STATUS.UPCOMING,
    toss: null,          // { winner: teamName, choice: 'bat'|'bowl' }
    battingFirst: null,  // team name
    innings: {
      first: createInnings(),
      second: createInnings(),
    },
    superOver: null,     // null or { active: true, result: teamNameOrNull }
    winner: null,        // team name
    createdAt: Date.now(),
  };
}

function createInnings() {
  return {
    team: null,
    overs: [],   // array of { over, runs, wickets }
    totalRuns: 0,
    totalWickets: 0,
    completed: false,
  };
}

// ─── MATCH QUERIES ────────────────────────────────────────────────
function getMatchesByRound(data, round) {
  return data.matches
    .filter(m => m.round === round)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

function getMatchById(data, id) {
  return data.matches.find(m => m.id === id) || null;
}

function getLiveMatch(data) {
  return data.matches.find(m => m.status === HCT.STATUS.LIVE) || null;
}

function getCompletedByRound(data, round) {
  return data.matches.filter(m => m.round === round && m.status === HCT.STATUS.COMPLETED);
}

function getTotalByRound(data, round) {
  return data.matches.filter(m => m.round === round);
}

// Compute innings totals from overs array
function computeInningsTotals(innings) {
  innings.totalRuns = innings.overs.reduce((s, o) => s + (o.runs || 0), 0);
  innings.totalWickets = innings.overs.reduce((s, o) => s + (o.wickets || 0), 0);
  innings.completed = innings.overs.length >= HCT.OVERS_PER_INNINGS;
  return innings;
}

// Get current active innings (1st or 2nd)
function getActiveInnings(match) {
  if (!match.innings.first.completed) return { key: 'first', innings: match.innings.first };
  if (!match.innings.second.completed) return { key: 'second', innings: match.innings.second };
  return null; // both complete
}

// ─── SCORE STRING ─────────────────────────────────────────────────
function scoreStr(innings) {
  if (!innings || !innings.team) return '—';
  const runs = innings.totalRuns || 0;
  const wkts = innings.totalWickets || 0;
  const overs = innings.overs ? innings.overs.length : 0;
  return `${runs}/${wkts} (${overs} ov)`;
}

function scoreShort(innings) {
  if (!innings || !innings.team) return '—';
  return `${innings.totalRuns || 0}/${innings.totalWickets || 0}`;
}

// ─── ROUND NAME ───────────────────────────────────────────────────
function getRoundName(round) {
  const r = HCT.ROUNDS.find(r => r.id === round);
  return r ? r.name : `Round ${round}`;
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────
function showConfirm(title, message, type = 'danger') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';

    const iconMap = { danger: '🗑️', warning: '⚠️', info: 'ℹ️' };
    const btnMap = { danger: 'btn-danger', warning: 'btn-warning', info: 'btn-primary' };

    overlay.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">${iconMap[type] || '⚠️'} ${title}</span>
        </div>
        <p style="color:var(--text-secondary);font-size:.95rem;line-height:1.6;">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-outline" id="confirmNo">Cancel</button>
          <button class="btn ${btnMap[type]}" id="confirmYes">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.querySelector('#confirmYes').addEventListener('click', () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(true);
    });
    overlay.querySelector('#confirmNo').addEventListener('click', () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(false);
    });
  });
}

// ─── MODAL HELPERS ────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ─── FORMAT HELPERS ───────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Live interval tracker
window._liveInterval = null;
function startLiveRefresh(fn, ms = 8000) {
  clearInterval(window._liveInterval);
  window._liveInterval = setInterval(fn, ms);
}
function stopLiveRefresh() { clearInterval(window._liveInterval); }
