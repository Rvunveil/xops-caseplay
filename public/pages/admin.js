// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

import { clientState, sendWS, showToast, formatCurrency, navigate } from '../app.js';

const ADMIN_SCRIPTS = {
  LOBBY: {
    prompt: 'Welcome to X-OPS CASEPLAY: The Obermeyer Gambit. You are the management team of a fashion company. You have one season. You have limited capacity. You do NOT know exactly what customers will buy. Make your bets. Beat the market.',
    action: 'START_GAME',
    actionLabel: '▶ Start Game (Round 1)',
    actionColor: 'btn-primary'
  },
  ROUND1: {
    prompt: 'You have 7 minutes. Commit your Mass Factory capacity across five products. You can see historical demand ranges — but not actual demand. Every unit you commit now is locked. You cannot change it. Think carefully.',
    action: 'REVEAL_SIGNALS',
    actionLabel: '📡 Reveal Trade Show Signals',
    actionColor: 'btn-primary'
  },
  SIGNAL_REVEAL: {
    prompt: 'BREAKING: Trade show signals are arriving from the floor. Watch your products carefully. Some are trending. Some are weak. The question is — do you trust the signals? Round 2 opens now.',
    action: 'START_ROUND2',
    actionLabel: '⚡ Open Round 2',
    actionColor: 'btn-primary'
  },
  ROUND2: {
    prompt: 'You have new information. Your Agile Factory capacity is now available. You may choose how much to commit now — and how much to save for later. Remember: the Agile Factory costs 50% more. Use it wisely.',
    action: 'SHOW_LEADERBOARD',
    actionLabel: '📊 Show Mid-Game Leaderboard',
    actionColor: 'btn-primary'
  },
  LEADERBOARD: {
    prompt: 'Here is the current battlefield. The game is not over. Round 3 brings a market shock that will change everything. Not one team is safe.',
    action: 'TRIGGER_EVENT',
    actionLabel: '⚡ Trigger Market Event (Round 3)',
    actionColor: 'btn-danger'
  },
  ROUND3: {
    prompt: 'BREAKING NEWS… [read the event headline]. This is real. The market has shifted. You have one more chance to adjust with your remaining Agile capacity. Round 4 is your final move.',
    action: 'START_ROUND4',
    actionLabel: '🎯 Open Final Round (Round 4)',
    actionColor: 'btn-primary'
  },
  ROUND4: {
    prompt: 'This is your last chance. Emergency sourcing is available — but it costs twice as much. Do you protect your lead? Do you make a comeback play? Do you chase the hot product? The market closes when time runs out.',
    action: 'REVEAL_DEMAND',
    actionLabel: '📦 Reveal Actual Demand',
    actionColor: 'btn-danger'
  },
  DEMAND_REVEAL: {
    prompt: 'The market has spoken. Let us see how every team performed. The results are being calculated.',
    action: 'SHOW_WINNER',
    actionLabel: '🏆 Reveal Winner',
    actionColor: 'btn-primary'
  },
  WINNER: {
    prompt: 'Congratulations to the winner. But before we celebrate — let us reveal the real story behind this game.',
    action: 'START_DEBRIEF',
    actionLabel: '📚 Start Case Reveal',
    actionColor: 'btn-ghost'
  },
  DEBRIEF: {
    prompt: 'What you just played has a real-world counterpart. Sport Obermeyer — a real company — faced exactly this problem. And solved it with a strategy called Accurate Response.',
    action: null,
    actionLabel: '',
    actionColor: ''
  }
};

export function renderAdmin(container) {
  const gs = clientState.gameState;
  if (!gs) {
    container.innerHTML = `<div class="page-content"><p class="text-muted">Loading game state…</p></div>`;
    return null;
  }

  const status = gs.status;
  const teams = Object.values(gs.teams);
  const script = ADMIN_SCRIPTS[status] || ADMIN_SCRIPTS.LOBBY;

  container.innerHTML = `
    <div class="admin-page fade-in">
      <!-- Admin Top Bar -->
      <div class="top-bar" style="background:rgba(26,10,10,0.9);border-bottom-color:rgba(255,71,87,0.3);">
        <div class="top-bar-logo">
          <span class="x">X</span>-OPS
          <span style="background:var(--red-soft);color:var(--red);border:1px solid var(--border-red);
            padding:2px 8px;border-radius:var(--radius-pill);font-size:0.7rem;font-weight:700;margin-left:8px;">
            ADMIN
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-4);">
          <div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted);">
            Game: <span style="color:var(--accent);">${gs.gameId}</span>
          </div>
          <div class="badge ${getStatusBadgeClass(status)}">${status}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">
            ${teams.length} teams
          </div>
        </div>
      </div>

      <div class="admin-grid">
        <!-- SIDEBAR: Controls -->
        <div class="admin-sidebar">
          
          <div style="background:var(--bg-elevated); padding:var(--space-3); border-radius:var(--radius-md); text-align:center; margin-bottom:var(--space-2); border:1px solid var(--border);">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px; font-weight:700;">GAME ID</div>
            <div style="font-family:var(--font-mono); font-size:1.8rem; font-weight:800; color:var(--accent); letter-spacing:0.1em;" id="admin-game-code">
              ${gs.gameId}
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-top:8px; width:100%; font-size:0.75rem;" onclick="navigator.clipboard.writeText('${gs.gameId}'); window.showToast('Game ID copied!','success');">
              📋 Copy ID
            </button>
          </div>

          <!-- MAIN ACTION — BIG AND UNMISSABLE -->
          ${script.action ? `
            <div style="background:var(--bg-elevated);border:2px solid ${status === 'LOBBY' ? 'var(--teal)' : 'var(--accent)'};border-radius:var(--radius-md);padding:var(--space-4);">
              ${status === 'LOBBY' ? `
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;color:var(--teal);margin-bottom:var(--space-3);text-transform:uppercase;">
                  ● ${teams.length} Team${teams.length !== 1 ? 's' : ''} Joined — Ready to Start
                </div>
              ` : `
                <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;color:var(--accent);margin-bottom:var(--space-3);text-transform:uppercase;">
                  ● Next Action
                </div>
              `}
              <button class="btn ${script.actionColor}" style="width:100%;font-size:1rem;padding:var(--space-4);font-weight:800;"
                onclick="window.adminAction('${script.action}')">
                ${script.actionLabel}
              </button>
            </div>
          ` : '<div class="text-muted" style="font-size:0.85rem;padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);">✅ Game complete.</div>'}

          <div class="divider"></div>

          <div class="admin-control-label">HOST SCRIPT</div>
          <div class="script-box">"${script.prompt}"</div>

          <div class="divider"></div>

          <div class="admin-control-label">GAME CONTROLS</div>

          <button class="admin-btn" onclick="window.adminAction('PAUSE_GAME')">
            ⏸️ ${gs.paused ? 'Resume' : 'Pause'} Timer
          </button>

          <button class="admin-btn danger" onclick="window.confirmReset()">
            🔄 Reset Game
          </button>

          <div class="divider"></div>

          <div class="admin-control-label">EVENT</div>
          ${gs.event ? `
            <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);font-size:0.8rem;">
              <div style="font-weight:700;margin-bottom:4px;">${gs.event.title}</div>
              <div style="color:var(--text-muted);">${gs.event.description}</div>
              <div style="margin-top:8px;font-size:0.7rem;color:var(--text-dim);">
                ${status === 'ROUND3' || status === 'ROUND4' || status === 'DEMAND_REVEAL' || status === 'WINNER' || status === 'DEBRIEF'
                  ? '✅ Revealed to players'
                  : '🔒 Hidden from players'}
              </div>
            </div>
          ` : '<div style="font-size:0.8rem;color:var(--text-dim);padding:var(--space-2);">No event triggered yet.</div>'}

          <div class="divider"></div>

          <div class="admin-control-label">DEMAND (HIDDEN)</div>
          ${gs.actualDemands ? `
            <div style="font-size:0.8rem;font-family:var(--font-mono);">
              ${['A','B','C','D','E'].map(code => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
                  <span>${code}</span><span style="color:var(--accent);">${gs.actualDemands[code]}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div style="font-size:0.8rem;color:var(--text-dim);padding:var(--space-2);">Will be shown here once generated.</div>'}
        </div>

        <!-- MAIN: Teams + Dashboard -->
        <div class="admin-main">
          <h2 style="font-weight:800;font-size:1.3rem;margin-bottom:var(--space-6);">
            Team Dashboard
            <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted);margin-left:8px;">Round ${gs.round || 0}/4</span>
          </h2>

          <!-- Team cards grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--space-4);">
            ${teams.length === 0 ? `
              <div class="card" style="grid-column:1/-1;text-align:center;padding:var(--space-8);">
                <div style="font-size:2rem;margin-bottom:var(--space-3);">👥</div>
                <div style="font-weight:700;margin-bottom:var(--space-2);">No teams yet</div>
                <div style="color:var(--text-muted);font-size:0.9rem;">Share the Game ID: <span class="mono" style="color:var(--accent);font-size:1.2rem;"> ${gs.gameId}</span></div>
                <div style="color:var(--text-dim);font-size:0.8rem;margin-top:var(--space-3);">Teams go to <strong>${window.location.origin}</strong> and enter this code to join</div>
              </div>
            ` : teams.map(t => renderAdminTeamCard(t, gs)).join('')}
          </div>

          <!-- Signals preview -->
          ${gs.signals && (status !== 'LOBBY' && status !== 'ROUND1') ? `
            <div class="card mt-6">
              <div class="card-title mb-4">📡 MARKET SIGNALS</div>
              <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
                ${['A','B','C','D','E'].map(code => {
                  const sig = gs.signals[code];
                  const names = {A:'Alpine',B:'Blizzard',C:'Cascade',D:'Drift',E:'Eclipse'};
                  return sig ? `
                    <div style="text-align:center;padding:var(--space-3);min-width:100px;
                      background:var(--bg-elevated);border-radius:var(--radius-md);
                      border:1px solid ${sig.color}44;">
                      <div style="font-weight:700;font-size:0.85rem;">${names[code]}</div>
                      <div style="font-weight:800;color:${sig.color};font-size:0.8rem;">${sig.label}</div>
                    </div>
                  ` : '';
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  window.adminAction = (action, params) => {
    sendWS('ADMIN_ACTION', { action, params });
    showToast(`Admin: ${action}`, 'info');
  };

  window.confirmReset = () => {
    if (confirm('Reset the game? All team data will be lost.')) {
      sendWS('ADMIN_ACTION', { action: 'RESET_GAME', params: {} });
    }
  };

  return (newState) => {
    if (newState) renderAdmin(container);
  };
}

function renderAdminTeamCard(team, gs) {
  const round = gs.round || 0;
  const submitted = team.submittedRounds?.includes(round);
  const allMass = Object.values(team.massAllocation || {}).reduce((a,b)=>a+b,0);
  const allAgile = Object.values(team.agileAllocation || {}).reduce((a,b)=>a+b,0);
  const pnl = team.pnl;

  return `
    <div class="card ${submitted ? 'card-teal' : ''}" style="font-size:0.85rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-2);">
          <span style="font-size:1.4rem;">${team.symbol || '⭐'}</span>
          <div>
            <div style="font-weight:700;">${team.name}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">${team.teamId}</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-2);">
          ${submitted ? '<span class="badge badge-low">✓ LOCKED</span>' : '<span class="badge badge-medium">DECIDING</span>'}
          ${!team.isConnected ? '<span class="badge badge-medium">OFFLINE</span>' : '<span class="badge badge-low" style="font-size:0.6rem;">ONLINE</span>'}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-3);">
        <div style="text-align:center;padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-sm);">
          <div style="font-size:0.65rem;color:var(--text-muted);">MASS USED</div>
          <div class="mono" style="font-weight:700;">${allMass}</div>
        </div>
        <div style="text-align:center;padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-sm);">
          <div style="font-size:0.65rem;color:var(--text-muted);">AGILE USED</div>
          <div class="mono" style="font-weight:700;color:var(--teal);">${allAgile}</div>
        </div>
        <div style="text-align:center;padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-sm);">
          <div style="font-size:0.65rem;color:var(--text-muted);">EMERGENCY</div>
          <div class="mono" style="font-weight:700;color:var(--red);">${team.emergencyUsed || 0}</div>
        </div>
      </div>

      ${pnl ? `
        <div style="padding:var(--space-2);background:${pnl.finalCash >= 1000000 ? 'var(--teal-soft)' : 'var(--red-soft)'};
          border-radius:var(--radius-sm);text-align:center;margin-bottom:var(--space-3);">
          <div class="mono" style="font-weight:700;color:${pnl.finalCash >= 1000000 ? 'var(--teal)' : 'var(--red)'};">
            ${formatCurrency(pnl.finalCash)}
          </div>
          <div style="font-size:0.65rem;color:var(--text-muted);">Final P&L</div>
        </div>
      ` : `
        <div style="padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-sm);text-align:center;margin-bottom:var(--space-3);">
          <div class="mono" style="font-weight:700;">${formatCurrency(team.currentScore || 1000000)}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);">Est. Position</div>
        </div>
      `}

      <!-- Allocation miniview -->
      ${allMass > 0 ? `
        <div style="font-size:0.7rem;color:var(--text-dim);">
          Mass: ${['A','B','C','D','E'].map(c => {
            const v = (team.massAllocation||{})[c]||0;
            return v > 0 ? `${c}:${v}` : '';
          }).filter(Boolean).join(' ')}
        </div>
      ` : ''}
      ${allAgile > 0 ? `
        <div style="font-size:0.7rem;color:var(--teal);margin-top:2px;">
          Agile: ${['A','B','C','D','E'].map(c => {
            const v = (team.agileAllocation||{})[c]||0;
            return v > 0 ? `${c}:${v}` : '';
          }).filter(Boolean).join(' ')}
        </div>
      ` : ''}
    </div>
  `;
}

function getStatusBadgeClass(status) {
  const map = {
    LOBBY: 'badge-medium',
    ROUND1: 'badge-accent',
    SIGNAL_REVEAL: 'badge-accent',
    ROUND2: 'badge-accent',
    LEADERBOARD: 'badge-low',
    ROUND3: 'badge-high',
    ROUND4: 'badge-veryhigh',
    DEMAND_REVEAL: 'badge-high',
    WINNER: 'badge-low',
    DEBRIEF: 'badge-low'
  };
  return map[status] || 'badge-medium';
}
