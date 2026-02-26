/**
 * HUNTERS CRICKET TOURNAMENT
 * admin.js – Full Admin Dashboard Logic
 */

// ─── AUTH CHECK ───────────────────────────────────────────────────
if (localStorage.getItem('hct_admin') !== 'true') {
    window.location.href = 'index.html';
}

// ─── STATE ────────────────────────────────────────────────────────
let currentRound = 1;
let data = loadData();

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initRoundSelect();
    renderAll();
    checkLiveIndicator();
    startLiveRefresh(() => {
        data = loadData();
        checkLiveIndicator();
        const s = document.querySelector('.page-section.active');
        if (s) {
            if (s.id === 'section-live') renderLiveSection();
            if (s.id === 'section-overview') renderOverview();
        }
    }, 5000);
});

function adminLogout() {
    localStorage.removeItem('hct_admin');
    window.location.href = 'index.html';
}

// ─── SIDEBAR ──────────────────────────────────────────────────────
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ─── NAVIGATION ───────────────────────────────────────────────────
function showSection(type, round) {
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));

    let titleText = 'Dashboard';

    if (type === 'overview') {
        document.getElementById('nav-overview').classList.add('active');
        document.getElementById('section-overview').classList.add('active');
        renderOverview();
        titleText = 'Dashboard';
    } else if (type === 'bracket') {
        document.getElementById('nav-bracket').classList.add('active');
        document.getElementById('section-bracket').classList.add('active');
        renderBracket();
        titleText = 'Bracket View';
    } else if (type === 'live') {
        document.getElementById('nav-live').classList.add('active');
        document.getElementById('section-live').classList.add('active');
        renderLiveSection();
        titleText = 'Live Match';
    } else if (type === 'round') {
        currentRound = round;
        document.getElementById(`nav-r${round}`).classList.add('active');
        document.getElementById('section-round').classList.add('active');
        renderRoundSection(round);
        titleText = getRoundName(round);
    }

    document.getElementById('topbarTitle').textContent = titleText;
    closeSidebar();
}

// ─── RENDER ALL ───────────────────────────────────────────────────
function renderAll() {
    data = loadData();
    renderOverview();
    checkLiveIndicator();
}

// ─── LIVE INDICATOR ───────────────────────────────────────────────
function checkLiveIndicator() {
    const live = getLiveMatch(data);
    const ind = document.getElementById('topLiveIndicator');
    const badge = document.getElementById('liveBadgeNav');
    if (live) {
        ind.classList.add('show');
        badge.classList.add('show');
    } else {
        ind.classList.remove('show');
        badge.classList.remove('show');
    }
}

// ─── OVERVIEW ─────────────────────────────────────────────────────
function renderOverview() {
    data = loadData();
    const total = data.matches.length;
    const completed = data.matches.filter(m => m.status === HCT.STATUS.COMPLETED).length;
    const live = data.matches.filter(m => m.status === HCT.STATUS.LIVE).length;
    const upcoming = data.matches.filter(m => m.status === HCT.STATUS.UPCOMING).length;

    document.getElementById('overviewStats').innerHTML = `
    <div class="stat-card blue">
      <div class="stat-card-icon">📅</div>
      <div class="stat-card-value">${total}</div>
      <div class="stat-card-label">Total Matches</div>
    </div>
    <div class="stat-card red">
      <div class="stat-card-icon">🔴</div>
      <div class="stat-card-value">${live}</div>
      <div class="stat-card-label">Live Now</div>
    </div>
    <div class="stat-card gold">
      <div class="stat-card-icon">⏳</div>
      <div class="stat-card-value">${upcoming}</div>
      <div class="stat-card-label">Upcoming</div>
    </div>
    <div class="stat-card green">
      <div class="stat-card-icon">✅</div>
      <div class="stat-card-value">${completed}</div>
      <div class="stat-card-label">Completed</div>
    </div>
  `;

    // Round progress
    let html = '';
    HCT.ROUNDS.forEach(r => {
        const matches = getTotalByRound(data, r.id);
        const done = getCompletedByRound(data, r.id).length;
        const pct = matches.length ? Math.round((done / matches.length) * 100) : 0;
        html += `
      <div style="margin-bottom:16px; cursor:pointer;" onclick="showSection('round',${r.id})">
        <div class="flex-between" style="margin-bottom:6px;">
          <span style="font-size:.9rem;font-weight:600;color:var(--text-primary);">${r.name}</span>
          <span style="font-size:.8rem;color:var(--text-muted);">${done}/${matches.length} matches</span>
        </div>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width:${pct}%"></div>
        </div>
      </div>
    `;
    });
    document.getElementById('roundProgressList').innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No matches created yet</div><div class="empty-state-sub">Go to a Round to create fixtures</div></div>';

    // Champion check
    if (data.champion) {
        document.getElementById('roundProgressList').innerHTML += `
      <div class="winner-banner" style="margin-top:20px;">
        <div class="winner-label">🏆 CHAMPIONS</div>
        <div class="winner-name">${escapeHtml(data.champion)}</div>
      </div>
    `;
    }
}

// ─── ROUND SELECT ─────────────────────────────────────────────────
function initRoundSelect() {
    const sel = document.getElementById('fixtureRound');
    if (!sel) return;
    HCT.ROUNDS.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        sel.appendChild(opt);
    });
}

// ─── ROUND SECTION ────────────────────────────────────────────────
function renderRoundSection(round) {
    data = loadData();
    const matches = getMatchesByRound(data, round);
    const done = matches.filter(m => m.status === HCT.STATUS.COMPLETED).length;
    const rName = getRoundName(round);

    document.getElementById('roundHeader').innerHTML = `
    <div>
      <div class="section-header" style="margin-bottom:0;">
        <div class="section-icon">${round === 6 ? '🥇' : round === 5 ? '🏆' : `${round}️⃣`}</div>
        <div>
          <div class="section-title">${rName}</div>
          <div class="section-subtitle">${done}/${matches.length} matches completed</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span class="round-badge">${rName} · ${matches.length} fixtures</span>
      <button class="btn btn-gold btn-sm" onclick="openCreateFixture(${round})">➕ Add Fixture</button>
    </div>
  `;

    let html = '';
    if (matches.length === 0) {
        html = `
      <div class="empty-state">
        <div class="empty-state-icon">🏏</div>
        <div class="empty-state-text">No fixtures yet for ${rName}</div>
        <div class="empty-state-sub">Click "Add Fixture" to create matches</div>
      </div>
    `;
    } else {
        matches.forEach(m => { html += buildMatchCard(m); });
    }
    document.getElementById('roundMatchList').innerHTML = html;
}

// ─── MATCH CARD HTML ──────────────────────────────────────────────
function buildMatchCard(m) {
    const statusBadge = m.status === HCT.STATUS.LIVE
        ? '<span class="badge badge-live">● LIVE</span>'
        : m.status === HCT.STATUS.COMPLETED
            ? '<span class="badge badge-completed">✓ COMPLETED</span>'
            : '<span class="badge badge-upcoming">UPCOMING</span>';

    const cssClass = m.status === HCT.STATUS.LIVE ? 'live'
        : m.status === HCT.STATUS.COMPLETED ? 'completed' : '';

    const teamAWinner = m.winner === m.teamA;
    const teamBWinner = m.winner === m.teamB;

    const scoreA = m.innings.first && m.innings.first.team === m.teamA
        ? scoreShort(m.innings.first)
        : m.innings.second && m.innings.second.team === m.teamA
            ? scoreShort(m.innings.second) : '—';

    const scoreB = m.innings.first && m.innings.first.team === m.teamB
        ? scoreShort(m.innings.first)
        : m.innings.second && m.innings.second.team === m.teamB
            ? scoreShort(m.innings.second) : '—';

    let actions = '';
    if (m.status === HCT.STATUS.UPCOMING) {
        actions = `
      <button class="btn btn-gold btn-sm" onclick="openToss(${m.id})">🏏 Start Match</button>
      <button class="btn btn-outline btn-sm" onclick="openEditFixture(${m.id})">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteMatch(${m.id})">🗑️ Delete</button>
    `;
    } else if (m.status === HCT.STATUS.LIVE) {
        actions = `
      <button class="btn btn-primary btn-sm" onclick="openScoreEntry(${m.id})">📊 Enter Score</button>
      <button class="btn btn-outline btn-sm" onclick="openScorecard(${m.id})">📋 View Card</button>
    `;
    } else {
        actions = `
      <button class="btn btn-outline btn-sm" onclick="openScorecard(${m.id})">📋 Scorecard</button>
      <button class="btn btn-danger btn-sm" onclick="deleteMatch(${m.id})">🗑️ Delete</button>
    `;
    }

    const resultBar = m.winner
        ? `<div class="match-result-bar">🏆 Winner: <strong>${escapeHtml(m.winner)}</strong>${m.superOver ? ' (Super Over)' : ''}</div>`
        : '';

    const tossInfo = m.toss
        ? `<span style="font-size:.75rem;color:var(--text-muted);">Toss: ${escapeHtml(m.toss.winner)} chose to ${m.toss.choice}</span>`
        : '';

    return `
    <div class="admin-match-card ${cssClass}">
      <div class="admin-match-top">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="admin-match-num">M${m.matchNumber}</span>
          ${tossInfo}
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${statusBadge}
        </div>
      </div>
      <div class="admin-match-body">
        <div class="match-teams-row">
          <div class="match-team-block">
            <div class="match-team-label">Team A</div>
            <div class="match-team-name ${teamAWinner ? 'winner-team' : ''}">${teamAWinner ? '🏆 ' : ''}${escapeHtml(m.teamA)}</div>
            <div class="match-score-block">${escapeHtml(scoreA)}</div>
          </div>
          <div class="vs-circle">VS</div>
          <div class="match-team-block">
            <div class="match-team-label">Team B</div>
            <div class="match-team-name ${teamBWinner ? 'winner-team' : ''}">${teamBWinner ? '🏆 ' : ''}${escapeHtml(m.teamB)}</div>
            <div class="match-score-block">${escapeHtml(scoreB)}</div>
          </div>
        </div>
        <div class="match-actions">
          ${actions}
        </div>
      </div>
      ${resultBar}
    </div>
  `;
}

// ─── CREATE FIXTURE ───────────────────────────────────────────────
function openCreateFixture(round) {
    document.getElementById('fixtureModalTitle').textContent = '➕ Create Fixture';
    document.getElementById('fixtureMatchId').value = '';
    document.getElementById('fixtureTeamA').value = '';
    document.getElementById('fixtureTeamB').value = '';
    document.getElementById('fixtureRound').value = round || 1;
    openModal('fixtureModal');
}

function openEditFixture(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;
    if (m.status !== HCT.STATUS.UPCOMING) {
        showToast('Cannot edit a match that has already started.', 'error');
        return;
    }
    document.getElementById('fixtureModalTitle').textContent = '✏️ Edit Fixture';
    document.getElementById('fixtureMatchId').value = matchId;
    document.getElementById('fixtureTeamA').value = m.teamA;
    document.getElementById('fixtureTeamB').value = m.teamB;
    document.getElementById('fixtureRound').value = m.round;
    openModal('fixtureModal');
}

function saveFixture(e) {
    e.preventDefault();
    data = loadData();
    const matchId = parseInt(document.getElementById('fixtureMatchId').value);
    const teamA = document.getElementById('fixtureTeamA').value.trim();
    const teamB = document.getElementById('fixtureTeamB').value.trim();
    const round = parseInt(document.getElementById('fixtureRound').value);

    if (!teamA || !teamB) { showToast('Please enter both team names.', 'error'); return; }
    if (teamA.toLowerCase() === teamB.toLowerCase()) { showToast('Team names must be different.', 'error'); return; }

    if (matchId) {
        // Edit
        const idx = data.matches.findIndex(m => m.id === matchId);
        if (idx !== -1) {
            data.matches[idx].teamA = teamA;
            data.matches[idx].teamB = teamB;
            data.matches[idx].round = round;
        }
        showToast('Fixture updated!', 'success');
    } else {
        // Create
        const existing = getMatchesByRound(data, round);
        const matchNum = existing.length + 1;
        const newMatch = createMatch(data.nextMatchId++, round, matchNum, teamA, teamB);
        data.matches.push(newMatch);
        showToast('Fixture created!', 'success');
    }

    saveData(data);
    closeModal('fixtureModal');
    renderAll();
    renderRoundSection(round);
}

// ─── DELETE MATCH ─────────────────────────────────────────────────
async function deleteMatch(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;
    if (m.status === HCT.STATUS.LIVE) {
        showToast('Cannot delete a live match. Complete it first.', 'error'); return;
    }
    const confirmed = await showConfirm(
        'Delete Match',
        `Are you sure you want to delete Match ${m.matchNumber} (${m.teamA} vs ${m.teamB})? This cannot be undone.`,
        'danger'
    );
    if (!confirmed) return;
    data.matches = data.matches.filter(x => x.id !== matchId);
    // Re-number
    const roundMatches = getMatchesByRound(data, m.round);
    roundMatches.forEach((rm, i) => { rm.matchNumber = i + 1; });
    saveData(data);
    showToast('Match deleted.', 'info');
    renderAll();
    renderRoundSection(m.round);
}

// ─── TOSS ─────────────────────────────────────────────────────────
function openToss(matchId) {
    data = loadData();
    const live = getLiveMatch(data);
    if (live) {
        showToast('There is already a LIVE match! Complete it first.', 'error'); return;
    }
    const m = getMatchById(data, matchId);
    if (!m) return;

    document.getElementById('tossMatchId').value = matchId;
    const sel = document.getElementById('tossWinner');
    sel.innerHTML = `
    <option value="${escapeHtml(m.teamA)}">${escapeHtml(m.teamA)}</option>
    <option value="${escapeHtml(m.teamB)}">${escapeHtml(m.teamB)}</option>
  `;
    openModal('tossModal');
}

function confirmToss() {
    data = loadData();
    const matchId = parseInt(document.getElementById('tossMatchId').value);
    const tossWinner = document.getElementById('tossWinner').value;
    const choice = document.getElementById('tossChoice').value;
    const m = getMatchById(data, matchId);
    if (!m) return;

    // Batting first = toss winner bats if choice is 'bat', else opponent bats
    const battingFirst = (choice === 'bat') ? tossWinner : (tossWinner === m.teamA ? m.teamB : m.teamA);

    m.toss = { winner: tossWinner, choice };
    m.battingFirst = battingFirst;
    m.status = HCT.STATUS.LIVE;
    m.innings.first.team = battingFirst;
    m.innings.second.team = (battingFirst === m.teamA) ? m.teamB : m.teamA;

    saveData(data);
    closeModal('tossModal');
    showToast(`Match LIVE! ${battingFirst} bats first.`, 'success');
    renderAll();
    renderRoundSection(m.round);
    // Open score entry
    openScoreEntry(matchId);
}

// ─── SCORE ENTRY ──────────────────────────────────────────────────
function openScoreEntry(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;
    if (m.status !== HCT.STATUS.LIVE) { showToast('Match is not live.', 'error'); return; }

    document.getElementById('scoreMatchId').value = matchId;
    document.getElementById('scoreModalTitle').textContent = `🏏 ${escapeHtml(m.teamA)} vs ${escapeHtml(m.teamB)}`;
    renderScoreModal(m);
    openModal('scoreModal');
}

function renderScoreModal(m) {
    // Recompute totals
    computeInningsTotals(m.innings.first);
    computeInningsTotals(m.innings.second);

    const activeInfo = getActiveInnings(m);

    // Scoreboard
    const scoreA = m.innings.first && m.innings.first.team === m.teamA ? m.innings.first
        : m.innings.second && m.innings.second.team === m.teamA ? m.innings.second : null;
    const scoreB = m.innings.first && m.innings.first.team === m.teamB ? m.innings.first
        : m.innings.second && m.innings.second.team === m.teamB ? m.innings.second : null;

    const battingTeam = activeInfo ? activeInfo.innings.team : null;

    document.getElementById('scoreModalScoreboard').innerHTML = `
    <div class="live-panel">
      <div class="live-panel-title"><span class="badge badge-live" style="margin-right:8px;">● LIVE</span>${escapeHtml(m.teamA)} vs ${escapeHtml(m.teamB)}</div>
      <div class="scoreboard-teams">
        <div class="scoreboard-team">
          <div class="scoreboard-team-name">${escapeHtml(m.teamA)}</div>
          <div class="scoreboard-score">${scoreShort(scoreA)}</div>
          <div class="scoreboard-overs">${scoreA ? `${scoreA.overs.length}/${HCT.OVERS_PER_INNINGS} overs` : '—'}</div>
          ${battingTeam === m.teamA ? '<div class="scoreboard-batting-label">🏏 BATTING</div>' : ''}
        </div>
        <div class="scoreboard-separator">VS</div>
        <div class="scoreboard-team">
          <div class="scoreboard-team-name">${escapeHtml(m.teamB)}</div>
          <div class="scoreboard-score">${scoreShort(scoreB)}</div>
          <div class="scoreboard-overs">${scoreB ? `${scoreB.overs.length}/${HCT.OVERS_PER_INNINGS} overs` : '—'}</div>
          ${battingTeam === m.teamB ? '<div class="scoreboard-batting-label">🏏 BATTING</div>' : ''}
        </div>
      </div>
      ${m.toss ? `<div style="text-align:center;font-size:.8rem;color:var(--text-muted);">Toss: ${escapeHtml(m.toss.winner)} chose to ${m.toss.choice} | ${escapeHtml(m.battingFirst || '')} bats first</div>` : ''}
    </div>
  `;

    const both = m.innings.first.completed && m.innings.second.completed;
    const tied = both && m.innings.first.totalRuns === m.innings.second.totalRuns;

    // Tied / Super Over
    document.getElementById('tiedNotice').style.display = 'none';
    document.getElementById('superOverPanel').style.display = 'none';
    document.getElementById('overEntryPanel').style.display = 'none';
    document.getElementById('resultPanel').style.display = 'none';

    if (m.superOver && !m.superOver.result) {
        // Super over active
        document.getElementById('superOverPanel').style.display = 'block';
        renderSuperOverPanel(m);
    } else if (both && tied && (!m.superOver || !m.superOver.result)) {
        // Show tied notice + activate super over button
        document.getElementById('tiedNotice').style.display = 'block';
        document.getElementById('superOverPanel').style.display = 'block';
        renderSuperOverPanel(m);
    } else if (both && !tied) {
        // Show result panel
        document.getElementById('resultPanel').style.display = 'block';
        const sel = document.getElementById('resultWinner');
        sel.innerHTML = `
      <option value="${escapeHtml(m.teamA)}">${escapeHtml(m.teamA)}</option>
      <option value="${escapeHtml(m.teamB)}">${escapeHtml(m.teamB)}</option>
    `;
        // Auto-suggest winner by score
        const t1 = m.innings.first; const t2 = m.innings.second;
        const suggested = t1.totalRuns > t2.totalRuns ? t1.team : t2.team;
        sel.value = suggested;
    } else if (activeInfo) {
        // Show over entry
        document.getElementById('overEntryPanel').style.display = 'block';
        const inn = activeInfo.innings;
        const inningsNum = activeInfo.key === 'first' ? '1st Innings' : '2nd Innings';
        const oversLeft = HCT.OVERS_PER_INNINGS - inn.overs.length;

        document.getElementById('overEntryInningsLabel').textContent =
            `${inningsNum} – ${escapeHtml(inn.team || '')} Batting`;
        document.getElementById('overEntryTotalScore').textContent =
            `${inn.totalRuns}/${inn.totalWickets}`;
        document.getElementById('overEntryOversLeft').textContent =
            `(${inn.overs.length}/${HCT.OVERS_PER_INNINGS} ov)`;
        document.getElementById('overEntryOverNum').textContent = inn.overs.length + 1;
        document.getElementById('overRuns').value = '';
        document.getElementById('overWickets').value = '';

        const btnEl = document.getElementById('submitOverBtn');
        btnEl.disabled = inn.overs.length >= HCT.OVERS_PER_INNINGS;

        // Overs table
        let tableHtml = '';
        if (inn.overs.length > 0) {
            tableHtml = `
        <div class="table-wrapper">
          <table class="over-table">
            <thead>
              <tr>
                <th>Over</th><th>Runs</th><th>Wickets</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${inn.overs.map((o, idx) => `
                <tr>
                  <td>#${o.over}</td>
                  <td>${o.runs}</td>
                  <td>${o.wickets}</td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="editOver(${m.id},'${activeInfo.key}',${idx})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteOver(${m.id},'${activeInfo.key}',${idx})">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
        }

        // Target info for 2nd innings
        if (activeInfo.key === 'second') {
            const target = m.innings.first.totalRuns + 1;
            const need = target - inn.totalRuns;
            tableHtml = `
        <div class="alert alert-info" style="margin-bottom:12px;">
          Target: <strong>${target}</strong> | Need: <strong>${Math.max(0, need)}</strong> runs from <strong>${oversLeft}</strong> overs
        </div>
      ` + tableHtml;
        }

        document.getElementById('overTableWrapper').innerHTML = tableHtml;
    }
}

// ─── SUBMIT OVER ──────────────────────────────────────────────────
function submitOver() {
    data = loadData();
    const matchId = parseInt(document.getElementById('scoreMatchId').value);
    const m = getMatchById(data, matchId);
    if (!m) return;

    const runs = parseInt(document.getElementById('overRuns').value);
    const wickets = parseInt(document.getElementById('overWickets').value);

    if (isNaN(runs) || runs < 0) { showToast('Enter valid runs (≥ 0)', 'error'); return; }
    if (isNaN(wickets) || wickets < 0 || wickets > 10) { showToast('Enter valid wickets (0–10)', 'error'); return; }

    const activeInfo = getActiveInnings(m);
    if (!activeInfo) { showToast('Both innings already complete.', 'warning'); return; }

    const inn = activeInfo.key === 'first' ? m.innings.first : m.innings.second;
    if (inn.overs.length >= HCT.OVERS_PER_INNINGS) {
        showToast('All 6 overs completed for this innings.', 'warning'); return;
    }

    inn.overs.push({ over: inn.overs.length + 1, runs, wickets });
    computeInningsTotals(inn);

    // Check if 1st innings done
    if (activeInfo.key === 'first' && inn.completed) {
        showToast(`${escapeHtml(inn.team)}'s innings complete! Switching to ${escapeHtml(m.innings.second.team)}.`, 'info');
    }

    saveData(data);
    renderScoreModal(getMatchById(data, matchId));
}

// ─── EDIT OVER ────────────────────────────────────────────────────
async function editOver(matchId, inningsKey, overIdx) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;

    const inn = inningsKey === 'first' ? m.innings.first : m.innings.second;
    const over = inn.overs[overIdx];
    if (!over) return;

    const confirmed = await showConfirm(
        'Edit Over Score',
        '⚠️ WARNING: Editing a score will update the innings total. Are you sure?',
        'warning'
    );
    if (!confirmed) return;

    const newRuns = prompt(`Over ${over.over} – Current Runs: ${over.runs}\nEnter new runs:`);
    if (newRuns === null) return;
    const newWickets = prompt(`Over ${over.over} – Current Wickets: ${over.wickets}\nEnter new wickets:`);
    if (newWickets === null) return;

    const r = parseInt(newRuns);
    const w = parseInt(newWickets);
    if (isNaN(r) || r < 0 || isNaN(w) || w < 0 || w > 10) {
        showToast('Invalid values.', 'error'); return;
    }

    inn.overs[overIdx] = { ...over, runs: r, wickets: w };
    computeInningsTotals(inn);
    saveData(data);
    showToast('Score updated!', 'success');
    renderScoreModal(getMatchById(data, matchId));
}

// ─── DELETE OVER ──────────────────────────────────────────────────
async function deleteOver(matchId, inningsKey, overIdx) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;

    const confirmed = await showConfirm(
        'Delete Over',
        '⚠️ WARNING: This will remove this over\'s data from the innings. Are you sure?',
        'danger'
    );
    if (!confirmed) return;

    const inn = inningsKey === 'first' ? m.innings.first : m.innings.second;
    inn.overs.splice(overIdx, 1);
    // Re-number
    inn.overs.forEach((o, i) => { o.over = i + 1; });
    computeInningsTotals(inn);
    saveData(data);
    showToast('Over deleted.', 'info');
    renderScoreModal(getMatchById(data, matchId));
}

// ─── SUPER OVER ───────────────────────────────────────────────────
function renderSuperOverPanel(m) {
    const div = document.getElementById('superOverContent');
    if (!m.superOver) {
        div.innerHTML = `
      <p style="color:var(--text-secondary);margin-bottom:16px;font-size:.9rem;">Scores are tied. Start a super over to find the winner.</p>
      <button class="btn btn-warning" onclick="startSuperOver(${m.id})">⚡ Start Super Over</button>
    `;
    } else if (!m.superOver.result) {
        // Super over in progress – enter result directly
        div.innerHTML = `
      <p style="color:var(--text-secondary);margin-bottom:16px;font-size:.9rem;">Play the super over (1 over per team) then declare the winner.</p>
      <div class="form-group">
        <label class="form-label">Super Over Winner</label>
        <select id="superOverWinner" class="form-control">
          <option value="${escapeHtml(m.teamA)}">${escapeHtml(m.teamA)}</option>
          <option value="${escapeHtml(m.teamB)}">${escapeHtml(m.teamB)}</option>
        </select>
      </div>
      <button class="btn btn-gold" onclick="declareSuperOverWinner(${m.id})">🏆 Declare Super Over Winner</button>
    `;
    } else {
        div.innerHTML = `<div class="winner-banner"><div class="winner-label">Super Over Winner</div><div class="winner-name">${escapeHtml(m.superOver.result)}</div></div>`;
    }
}

function startSuperOver(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;
    m.superOver = { active: true, result: null };
    saveData(data);
    showToast('Super Over started!', 'warning');
    renderScoreModal(getMatchById(data, matchId));
}

function declareSuperOverWinner(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;
    const winner = document.getElementById('superOverWinner').value;
    m.superOver.result = winner;
    m.winner = winner;
    m.status = HCT.STATUS.COMPLETED;
    saveData(data);
    // Auto-qualify
    autoQualify(m);
    showToast(`${winner} wins the Super Over! Match complete.`, 'success');
    closeModal('scoreModal');
    renderAll();
    renderRoundSection(m.round);
    checkChampion(m);
}

// ─── DECLARE RESULT ───────────────────────────────────────────────
function declareResult() {
    data = loadData();
    const matchId = parseInt(document.getElementById('scoreMatchId').value);
    const m = getMatchById(data, matchId);
    if (!m) return;

    const both = m.innings.first.completed && m.innings.second.completed;
    if (!both) { showToast('Both innings must be complete before declaring result.', 'error'); return; }

    const tied = m.innings.first.totalRuns === m.innings.second.totalRuns;
    if (tied) { showToast('Scores are tied! Start a super over.', 'warning'); return; }

    const winner = document.getElementById('resultWinner').value;
    m.winner = winner;
    m.status = HCT.STATUS.COMPLETED;
    saveData(data);

    // Auto-qualify
    autoQualify(m);
    showToast(`🏆 ${winner} wins! Match completed.`, 'success');
    closeModal('scoreModal');
    renderAll();
    renderRoundSection(m.round);
    checkChampion(m);
}

// ─── AUTO QUALIFY ─────────────────────────────────────────────────
function autoQualify(m) {
    // For rounds 1–5, winner qualifies to next round (creates fixture placeholder note)
    // We just store the winner; admin creates the next round fixtures manually
    // But we also trigger a "winner qualified" toast
    if (m.round < 6) {
        showToast(`${m.winner} qualifies to ${getRoundName(m.round + 1)}!`, 'info');
    }
}

// ─── CHAMPION CHECK ───────────────────────────────────────────────
function checkChampion(m) {
    if (m.round === 6 && m.winner) {
        data = loadData();
        data.champion = m.winner;
        saveData(data);
        showChampionCelebration(m.winner);
    }
}

function showChampionCelebration(team) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;text-align:center;padding:40px;
  `;
    overlay.innerHTML = `
    <div style="animation:scaleIn .5s ease both">
      <div style="font-size:5rem;animation:float 3s ease-in-out infinite;margin-bottom:8px;">🏆</div>
      <div style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;color:var(--accent-gold);letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">🎉 THE CHAMPIONS 🎉</div>
      <div style="font-family:'Orbitron',monospace;font-size:3rem;font-weight:900;color:var(--accent-gold);text-shadow:0 0 40px rgba(246,201,14,0.8);animation:trophy-glow 2s ease-in-out infinite;line-height:1.1;">${escapeHtml(team)}</div>
      <div style="font-size:2rem;margin:16px 0;">🔥🎊🏏</div>
      <div style="color:var(--text-secondary);font-size:1rem;margin-bottom:24px;">HUNTERS CRICKET TOURNAMENT 2026</div>
      <button class="btn btn-gold btn-lg" onclick="this.parentElement.parentElement.remove()">🎉 Continue</button>
    </div>
  `;
    // Confetti
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div');
        const colors = ['#f6c90e', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
        c.style.cssText = `
      position:absolute;
      width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:50%;
      left:${Math.random() * 100}%;
      animation:confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite;
    `;
        overlay.appendChild(c);
    }
    document.body.appendChild(overlay);
}

// ─── SCORECARD VIEW ───────────────────────────────────────────────
function openScorecard(matchId) {
    data = loadData();
    const m = getMatchById(data, matchId);
    if (!m) return;

    computeInningsTotals(m.innings.first);
    computeInningsTotals(m.innings.second);

    let html = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-family:'Rajdhani',sans-serif;font-size:1.5rem;font-weight:800;color:var(--text-primary);">
        ${escapeHtml(m.teamA)} <span style="color:var(--text-muted);font-size:1rem;">vs</span> ${escapeHtml(m.teamB)}
      </div>
      <div style="font-size:.8rem;color:var(--text-muted);">${getRoundName(m.round)} · Match ${m.matchNumber}</div>
      ${m.toss ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:4px;">Toss: ${escapeHtml(m.toss.winner)} chose to ${m.toss.choice}</div>` : ''}
    </div>
  `;

    // Innings
    [m.innings.first, m.innings.second].forEach((inn, i) => {
        if (!inn || !inn.team) return;
        const ovsHtml = inn.overs.length > 0 ? `
      <div class="table-wrapper">
        <table class="over-table">
          <thead><tr><th>Over</th><th>Runs</th><th>Wickets</th><th>Cumulative</th></tr></thead>
          <tbody>
            ${inn.overs.map((o, idx) => {
            const cumRuns = inn.overs.slice(0, idx + 1).reduce((s, x) => s + x.runs, 0);
            const cumWkts = inn.overs.slice(0, idx + 1).reduce((s, x) => s + x.wickets, 0);
            return `<tr><td>#${o.over}</td><td>${o.runs}</td><td>${o.wickets}</td><td>${cumRuns}/${cumWkts}</td></tr>`;
        }).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="empty-state" style="padding:20px;"><div class="empty-state-text">No overs recorded</div></div>';

        html += `
      <div class="innings-section" style="margin-bottom:16px;">
        <div class="innings-header">
          <span class="innings-title">${i + 1}${i === 0 ? 'st' : 'nd'} Innings – ${escapeHtml(inn.team)}</span>
          <span class="innings-total">${inn.totalRuns || 0}/${inn.totalWickets || 0} (${inn.overs.length} ov)</span>
        </div>
        <div style="padding:12px;">
          ${ovsHtml}
        </div>
      </div>
    `;
    });

    if (m.winner) {
        html += `<div class="winner-banner"><div class="winner-label">🏆 WINNER</div><div class="winner-name">${escapeHtml(m.winner)}${m.superOver ? ' (Super Over)' : ''}</div></div>`;
    }

    document.getElementById('scorecardContent').innerHTML = html;
    openModal('scorecardModal');
}

// ─── BRACKET ──────────────────────────────────────────────────────
function renderBracket() {
    data = loadData();
    const container = document.getElementById('bracketFlow');
    let html = '';
    HCT.ROUNDS.forEach(r => {
        const matches = getMatchesByRound(data, r.id);
        let matchesHtml = '';
        if (matches.length === 0) {
            matchesHtml = `<div style="padding:12px;font-size:.8rem;color:var(--text-muted);text-align:center;">No fixtures</div>`;
        } else {
            matches.forEach(m => {
                const cssClass = m.status === HCT.STATUS.LIVE ? 'live'
                    : m.status === HCT.STATUS.COMPLETED ? 'completed' : '';
                const teamAWin = m.winner === m.teamA;
                const teamBWin = m.winner === m.teamB;
                const sA = m.innings.first?.team === m.teamA ? scoreShort(m.innings.first)
                    : m.innings.second?.team === m.teamA ? scoreShort(m.innings.second) : '';
                const sB = m.innings.first?.team === m.teamB ? scoreShort(m.innings.first)
                    : m.innings.second?.team === m.teamB ? scoreShort(m.innings.second) : '';
                matchesHtml += `
          <div class="bracket-match-box ${cssClass}" style="margin-bottom:12px;">
            <div class="bracket-team-row ${teamAWin ? 'winner-row' : ''}">
              <span>${escapeHtml(m.teamA) || '?'}</span>
              <span class="bracket-score">${sA}</span>
            </div>
            <div class="bracket-team-row ${teamBWin ? 'winner-row' : ''}">
              <span>${escapeHtml(m.teamB) || '?'}</span>
              <span class="bracket-score">${sB}</span>
            </div>
          </div>
        `;
            });
        }
        html += `
      <div class="bracket-round-col">
        <div class="bracket-round-label">${r.name}</div>
        ${matchesHtml}
      </div>
      ${r.id < 6 ? '<div class="connector" style="padding-top:36px;">→</div>' : ''}
    `;
    });
    container.innerHTML = html;
}

// ─── LIVE SECTION ─────────────────────────────────────────────────
function renderLiveSection() {
    data = loadData();
    const container = document.getElementById('liveMatchContent');
    const live = getLiveMatch(data);

    if (!live) {
        container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔴</div>
        <div class="empty-state-text">No live match right now</div>
        <div class="empty-state-sub">Go to a Round and click "Start Match" to begin a match</div>
      </div>
    `;
        return;
    }

    computeInningsTotals(live.innings.first);
    computeInningsTotals(live.innings.second);

    const activeInfo = getActiveInnings(live);
    const battingTeam = activeInfo ? activeInfo.innings.team : null;
    const bowlingTeam = battingTeam
        ? (battingTeam === live.teamA ? live.teamB : live.teamA)
        : null;

    const sA = live.innings.first?.team === live.teamA ? live.innings.first
        : live.innings.second?.team === live.teamA ? live.innings.second : null;
    const sB = live.innings.first?.team === live.teamB ? live.innings.first
        : live.innings.second?.team === live.teamB ? live.innings.second : null;

    container.innerHTML = `
    <div class="live-panel" style="margin-bottom:20px;">
      <div class="live-panel-title"><span class="badge badge-live" style="margin-right:8px;">● LIVE</span>${escapeHtml(live.teamA)} vs ${escapeHtml(live.teamB)}</div>
      <div class="scoreboard-teams">
        <div class="scoreboard-team">
          <div class="scoreboard-team-name">${escapeHtml(live.teamA)}</div>
          <div class="scoreboard-score">${scoreShort(sA)}</div>
          <div class="scoreboard-overs">${sA ? sA.overs.length : 0}/${HCT.OVERS_PER_INNINGS} overs</div>
          ${battingTeam === live.teamA ? '<div class="scoreboard-batting-label">🏏 BATTING</div>' : ''}
        </div>
        <div class="scoreboard-separator" style="font-family:Rajdhani;font-size:1.1rem;">VS</div>
        <div class="scoreboard-team">
          <div class="scoreboard-team-name">${escapeHtml(live.teamB)}</div>
          <div class="scoreboard-score">${scoreShort(sB)}</div>
          <div class="scoreboard-overs">${sB ? sB.overs.length : 0}/${HCT.OVERS_PER_INNINGS} overs</div>
          ${battingTeam === live.teamB ? '<div class="scoreboard-batting-label">🏏 BATTING</div>' : ''}
        </div>
      </div>
      ${live.toss ? `<div style="text-align:center;font-size:.8rem;color:var(--text-muted);">Toss: ${escapeHtml(live.toss.winner)} chose to ${live.toss.choice} | ${escapeHtml(live.battingFirst)} bats first</div>` : ''}
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn btn-primary" onclick="openScoreEntry(${live.id})">📊 Enter Score</button>
      <button class="btn btn-outline" onclick="openScorecard(${live.id})">📋 Scorecard</button>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📋 Match Info</div></div>
      <div class="grid grid-2 gap-12">
        <div class="stat-box">
          <div class="stat-box-value">${getRoundName(live.round)}</div>
          <div class="stat-box-label">Round</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">M${live.matchNumber}</div>
          <div class="stat-box-label">Match Number</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${escapeHtml(battingTeam || '—')}</div>
          <div class="stat-box-label">Batting</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${activeInfo ? `${activeInfo.innings.overs.length}/${HCT.OVERS_PER_INNINGS}` : '—'}</div>
          <div class="stat-box-label">Overs</div>
        </div>
      </div>
    </div>
  `;
}

// ─── TOTAL RESET ──────────────────────────────────────────────────
async function totalReset() {
    const confirmed = await showConfirm(
        '⚠️ TOTAL RESET',
        '<strong>WARNING:</strong> This will permanently delete ALL tournament data including all matches, scores, and results. This cannot be undone!<br/><br/>Are you absolutely sure?',
        'danger'
    );
    if (!confirmed) return;

    const confirmed2 = await showConfirm(
        '🚨 FINAL CONFIRMATION',
        'Last chance! All data will be erased forever. Continue?',
        'danger'
    );
    if (!confirmed2) return;

    localStorage.removeItem(HCT.STORAGE_KEY);
    data = getDefaultData();
    showToast('All tournament data has been reset.', 'warning');
    renderAll();
    showSection('overview');
}
