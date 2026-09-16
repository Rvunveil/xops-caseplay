// =============================================================================
// LEADERBOARD PAGE
// =============================================================================

import { clientState, formatCurrency } from '../app.js';

export function renderLeaderboard(container, { midGame = false } = {}) {
  const gs = clientState.gameState;
  const teams = gs ? Object.values(gs.teams).sort((a, b) => (a.rank || 99) - (b.rank || 99)) : [];

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          ${midGame ? '<span class="badge badge-accent">MID-GAME STANDINGS</span>' : '<span class="badge badge-low">FINAL STANDINGS</span>'}
        </div>
      </div>

      <div class="page-content" style="max-width:800px;">
        <div class="text-center mb-8 fade-in">
          ${midGame ? `
            <div class="card-title mb-3" style="color:var(--accent);">HALFTIME</div>
            <h1 class="section-title">📊 Current Standings</h1>
            <p style="color:var(--text-muted);margin-top:var(--space-3);">
              The game isn't over. Round 3 will bring a market shock.
            </p>
          ` : `
            <div class="card-title mb-3" style="color:var(--amber);">GAME OVER</div>
            <h1 class="section-title">🏆 Final Standings</h1>
          `}
        </div>

        <div id="leaderboard-list" style="display:flex;flex-direction:column;gap:var(--space-3);">
          ${teams.map((team, i) => renderLeaderboardRow(team, i, midGame)).join('')}
        </div>

        ${midGame ? `
          <div class="card mt-8" style="background:var(--bg-surface);">
            <div style="font-size:1.2rem;font-weight:700;margin-bottom:var(--space-3);">💡 What just happened?</div>
            <p style="color:var(--text-muted);line-height:1.8;">
              Your current position reflects your <strong>committed production costs</strong>.
              But the real score is determined by what customers actually buy.
              <strong>Round 3 brings a market shock.</strong> Everything could change.
            </p>
          </div>

          <div style="text-align:center;margin-top:var(--space-8);color:var(--text-dim);font-size:0.85rem;">
            ⏳ Waiting for the host to trigger Round 3…
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Animate rows in with stagger
  teams.forEach((_, i) => {
    const row = document.getElementById(`lb-row-${teams[i].teamId}`);
    if (row) {
      row.style.opacity = '0';
      row.style.transform = 'translateX(-30px)';
      setTimeout(() => {
        if (row) {
          row.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
          row.style.opacity = '1';
          row.style.transform = 'translateX(0)';
        }
      }, 100 + i * 150);
    }
  });

  return (newState) => {
    if (!newState) return;
    const updatedTeams = Object.values(newState.teams).sort((a, b) => (a.rank || 99) - (b.rank || 99));
    const list = document.getElementById('leaderboard-list');
    if (list) {
      list.innerHTML = updatedTeams.map((team, i) => renderLeaderboardRow(team, i, midGame)).join('');
    }
  };
}

function renderLeaderboardRow(team, index, midGame) {
  const rank = team.rank || (index + 1);
  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  const change = team.rankChange || 0;
  const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
  const changeIcon = change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : '—';
  const isMyTeam = team.teamId === clientState.teamId;
  const score = team.currentScore || 1000000;

  return `
    <div class="leaderboard-row ${rankClass} ${isMyTeam ? 'card-accent' : ''}"
      id="lb-row-${team.teamId}"
      style="${isMyTeam ? 'box-shadow:0 0 0 2px var(--accent);' : ''}">

      <div class="rank-number">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}</div>

      <div class="rank-team-symbol">${team.symbol || '⭐'}</div>

      <div style="flex:1;">
        <div class="rank-team-name">
          ${team.name}
          ${isMyTeam ? '<span class="badge badge-accent" style="font-size:0.6rem;">YOU</span>' : ''}
        </div>
        ${!team.isConnected ? '<div style="font-size:0.75rem;color:var(--text-dim);">● Offline</div>' : ''}
      </div>

      <div style="text-align:right;">
        <div class="rank-score">${formatCurrency(score)}</div>
        ${midGame ? '<div style="font-size:0.7rem;color:var(--text-dim);">estimated</div>' : ''}
      </div>

      <div class="rank-change ${changeClass}">${changeIcon}</div>
    </div>
  `;
}
