// =============================================================================
// JOIN PAGE — Team join + Admin join/create
// =============================================================================

import { navigate, clientState, sendWS, showToast } from '../app.js';

const SYMBOLS = ['🌟', '⚡', '🚀', '🦁', '🔥', '🎯', '💎', '🏆', '🌊', '🌪️', '❄️', '☀️'];

export function renderJoin(container, { admin = false } = {}) {
  if (admin) {
    renderAdminJoin(container);
  } else {
    renderTeamJoin(container);
  }
  return null;
}

// =============================================================================
// TEAM JOIN
// =============================================================================

function renderTeamJoin(container) {
  let selectedSymbol = SYMBOLS[0];

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('landing')">← Back</button>
      </div>

      <div class="page-content" style="max-width:520px;display:flex;flex-direction:column;justify-content:center;min-height:calc(100vh - 60px);">
        <div class="fade-in">
          <div class="card-title mb-4">JOIN THE GAME</div>
          <h1 class="section-title mb-8">Enter the Market</h1>

          <div class="card">
            <div style="display:flex;flex-direction:column;gap:var(--space-6);">

              <div class="form-group">
                <label class="form-label">Game ID <span style="color:var(--red);">*</span></label>
                <input type="text" id="input-game-id" class="form-input mono"
                  placeholder="ABC123" maxlength="6"
                  autocomplete="off" autocapitalize="characters" spellcheck="false"
                  style="font-size:1.4rem;text-align:center;letter-spacing:0.2em;">
              </div>

              <div class="form-group">
                <label class="form-label">Team Name <span style="color:var(--red);">*</span></label>
                <input type="text" id="input-team-name" class="form-input"
                  placeholder="e.g. NOVA, TITAN, ORBIT"
                  maxlength="20" autocomplete="off">
              </div>

              <div class="form-group">
                <label class="form-label">Your Name <span style="color:var(--text-muted);font-weight:400;">(optional)</span></label>
                <input type="text" id="input-player-name" class="form-input"
                  placeholder="e.g. Priya, Ravi, Aditya"
                  maxlength="40" autocomplete="off">
              </div>

              <div class="form-group">
                <label class="form-label">Team Symbol</label>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);" id="symbol-grid">
                  ${SYMBOLS.map(s => `
                    <button class="symbol-btn ${s === selectedSymbol ? 'selected' : ''}"
                      style="width:42px;height:42px;font-size:1.4rem;border-radius:var(--radius-md);
                        border:2px solid ${s === selectedSymbol ? 'var(--accent)' : 'var(--border)'};
                        background:${s === selectedSymbol ? 'var(--accent-soft)' : 'var(--bg-elevated)'};
                        cursor:pointer;transition:all 0.15s;"
                      data-symbol="${s}" onclick="window.selectSymbol('${s}')">
                      ${s}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div id="join-error" class="alert-banner alert-danger" style="display:none;"></div>

              <button class="btn btn-primary btn-lg" id="btn-join-submit" onclick="window.submitJoin()">
                🚀 Enter the Market
              </button>

              <p style="font-size:0.8rem;color:var(--text-muted);text-align:center;">
                Get the Game ID from your session organizer.
                <br>If you disconnect, rejoin with the same Team Name to reconnect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Auto-uppercase game ID
  const gameIdInput = document.getElementById('input-game-id');
  if (gameIdInput) {
    gameIdInput.addEventListener('input', e => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.setSelectionRange(pos, pos);
    });
    gameIdInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('input-team-name')?.focus();
    });
  }

  window.selectSymbol = (sym) => {
    selectedSymbol = sym;
    document.querySelectorAll('.symbol-btn').forEach(btn => {
      const s = btn.dataset.symbol;
      btn.style.borderColor = s === sym ? 'var(--accent)' : 'var(--border)';
      btn.style.background  = s === sym ? 'var(--accent-soft)' : 'var(--bg-elevated)';
    });
  };

  window.submitJoin = () => {
    const gameId     = document.getElementById('input-game-id').value.trim().toUpperCase();
    const teamName   = document.getElementById('input-team-name').value.trim();
    const playerName = document.getElementById('input-player-name').value.trim();
    const errEl      = document.getElementById('join-error');

    errEl.style.display = 'none';

    if (!gameId || gameId.length < 4) {
      errEl.textContent = 'Enter a valid Game ID (4-6 characters).';
      errEl.style.display = 'flex';
      return;
    }
    if (!teamName) {
      errEl.textContent = 'Enter a team name.';
      errEl.style.display = 'flex';
      return;
    }

    const btn = document.getElementById('btn-join-submit');
    btn.textContent = '⏳ Joining…';
    btn.disabled = true;

    // Send JOIN_GAME — server responds with SESSION_CREATED
    sendWS('JOIN_GAME', { gameId, teamName, symbol: selectedSymbol, playerName: playerName || teamName });

    // Timeout fallback
    setTimeout(() => {
      const b = document.getElementById('btn-join-submit');
      if (b && b.disabled) {
        b.textContent = '🚀 Enter the Market';
        b.disabled = false;
      }
    }, 8000);
  };
}

// =============================================================================
// ADMIN JOIN / CREATE
// =============================================================================

function renderAdminJoin(container) {
  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <button class="btn btn-ghost btn-sm" onclick="navigate('landing')">← Back</button>
      </div>

      <div class="page-content" style="max-width:520px;display:flex;flex-direction:column;justify-content:center;min-height:calc(100vh - 60px);">
        <div class="fade-in">
          <div class="card-title mb-4" style="color:var(--red);">ADMIN ACCESS</div>
          <h1 class="section-title mb-8">⚙️ Game Control</h1>

          <div class="card">
            <div style="display:flex;flex-direction:column;gap:var(--space-6);">

              <div class="alert-banner alert-warning">
                ⚠️ Admin can control all game phases. Keep this window private.
              </div>

              <!-- CREATE NEW GAME -->
              <div>
                <div class="card-title mb-4">CREATE A NEW GAME</div>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                  <div class="form-group">
                    <label class="form-label">Admin PIN</label>
                    <input type="text" id="new-admin-pin" class="form-input mono" placeholder="1234" value="1234" maxlength="10">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Max Teams</label>
                    <input type="number" id="new-max-teams" class="form-input" min="2" max="20" value="8">
                  </div>
                  <div id="create-error" class="alert-banner alert-danger" style="display:none;"></div>
                  <button class="btn btn-teal btn-lg" id="btn-create" onclick="window.createNewGame()">
                    ➕ Create Game
                  </button>
                </div>
              </div>

              <div class="divider" style="margin:var(--space-2) 0;"></div>

              <!-- JOIN EXISTING GAME -->
              <div>
                <div class="card-title mb-4">JOIN EXISTING GAME</div>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                  <div class="form-group">
                    <label class="form-label">Game ID</label>
                    <input type="text" id="admin-game-id" class="form-input mono"
                      placeholder="ABC123" maxlength="6" autocapitalize="characters" spellcheck="false"
                      style="font-size:1.4rem;text-align:center;letter-spacing:0.2em;">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Admin PIN</label>
                    <input type="password" id="admin-pin" class="form-input mono"
                      placeholder="••••" maxlength="10"
                      style="font-size:1.4rem;text-align:center;letter-spacing:0.2em;">
                  </div>
                  <div id="admin-join-error" class="alert-banner alert-danger" style="display:none;"></div>
                  <button class="btn btn-primary btn-lg" id="btn-admin-join" onclick="window.submitAdminJoin()">
                    ⚙️ Enter Admin Dashboard
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Auto-uppercase game ID
  const gameIdInput = document.getElementById('admin-game-id');
  if (gameIdInput) {
    gameIdInput.addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  window.createNewGame = async () => {
    const pin      = document.getElementById('new-admin-pin').value.trim() || '1234';
    const maxTeams = parseInt(document.getElementById('new-max-teams').value) || 8;
    const errEl    = document.getElementById('create-error');
    const btn      = document.getElementById('btn-create');

    errEl.style.display = 'none';
    btn.textContent = '⏳ Creating…';
    btn.disabled    = true;

    try {
      const res = await fetch('/api/game/create', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ adminPin: pin, maxTeams })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { gameId } = await res.json();

      // Auto-fill join fields
      const gField = document.getElementById('admin-game-id');
      const pField = document.getElementById('admin-pin');
      if (gField) gField.value = gameId;
      if (pField) pField.value = pin;

      showToast(`✅ Game created! Code: ${gameId}`, 'success', 8000);
      btn.textContent = '✅ Created! Now click Join →';
      btn.disabled    = false;
    } catch (e) {
      errEl.textContent = 'Failed to create game. Is the server running?';
      errEl.style.display = 'flex';
      btn.textContent = '➕ Create Game';
      btn.disabled    = false;
    }
  };

  window.submitAdminJoin = () => {
    const gameId = document.getElementById('admin-game-id').value.trim().toUpperCase();
    const pin    = document.getElementById('admin-pin').value.trim();
    const errEl  = document.getElementById('admin-join-error');
    const btn    = document.getElementById('btn-admin-join');

    errEl.style.display = 'none';
    if (!gameId) { errEl.textContent = 'Enter Game ID.'; errEl.style.display = 'flex'; return; }
    if (!pin)    { errEl.textContent = 'Enter Admin PIN.'; errEl.style.display = 'flex'; return; }

    btn.textContent = '⏳ Connecting…';
    btn.disabled = true;

    // Server responds with SESSION_CREATED (role:'admin') → app.js routes to admin page
    sendWS('JOIN_ADMIN', { gameId, adminPin: pin });

    setTimeout(() => {
      const b = document.getElementById('btn-admin-join');
      if (b && b.disabled) { b.textContent = '⚙️ Enter Admin Dashboard'; b.disabled = false; }
    }, 8000);
  };
}

// Expose navigate globally for inline onclick
import { navigate as _nav } from '../app.js';
window.navigate = (page, params) => _nav(page, params);
