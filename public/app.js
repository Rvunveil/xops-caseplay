// =============================================================================
// X-OPS CASEPLAY: THE OBERMEYER GAMBIT
// public/app.js — Frontend SPA: Router, WebSocket Client, Session Manager
// =============================================================================
//
// Session flow:
//   1. On load: check localStorage for saved sessionToken
//   2. If found → send RECONNECT message → server restores identity
//   3. If not found → show landing page → user joins/creates game
//   4. On join/admin: server sends SESSION_CREATED → we save to localStorage
//   5. All subsequent WS messages include sessionToken automatically
//
// ⚠️  SECURITY: This file NEVER uses SUPABASE_SECRET_KEY.
//     All authenticated requests go through the Node.js WebSocket server.
// =============================================================================

import { renderLanding }       from './pages/landing.js';
import { renderJoin }          from './pages/join.js';
import { renderAdmin }         from './pages/admin.js';
import { renderDashboard }     from './pages/dashboard.js';
import { renderRoundDecision } from './pages/round-decision.js';
import { renderWaiting }       from './pages/waiting.js';
import { renderSignalReveal }  from './pages/signal-reveal.js';
import { renderLeaderboard }   from './pages/leaderboard.js';
import { renderDemandReveal }  from './pages/demand-reveal.js';
import { renderWinner }        from './pages/winner.js';
import { renderCaseReveal }    from './pages/case-reveal.js';
import { renderProfile }       from './pages/profile.js';
import { renderSimLab }        from './pages/simulation-lab.js';
import { Session }             from './session.js';

// ─── CLIENT STATE ──────────────────────────────────────────────────────────────
//
// This is the single source of local state for the current tab.
// It is populated by the server on JOIN/RECONNECT — never invented client-side.
//
export const clientState = {
  // Identity (set by server)
  sessionToken : null,
  role         : null,   // 'admin' | 'team'
  gameId       : null,
  teamId       : null,
  teamName     : null,
  symbol       : null,
  isAdmin      : false,

  // Game state mirror (received from server)
  gameState    : null,

  // Connection
  ws           : null,
  connected    : false,
  reconnecting : false,
  reconnectAttempts : 0
};

// ─── WEBSOCKET ─────────────────────────────────────────────────────────────────

let _wsMessageCallback = null;

export function connectWS() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${location.host}`;

  const ws = new WebSocket(url);
  clientState.ws = ws;

  ws.onopen = () => {
    console.log('[WS] Connected');
    clientState.connected = true;
    clientState.reconnectAttempts = 0;

    // Start ping to keep alive
    ws._pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);

    // If we have an active or saved session, immediately re-authenticate
    const token = clientState.sessionToken || Session.load()?.sessionToken;
    if (token) {
      console.log('[WS] Re-authenticating session…');
      ws.send(JSON.stringify({
        type: 'RECONNECT',
        sessionToken: token
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (e) {
      console.error('[WS] Parse error', e);
    }
  };

  ws.onclose = () => {
    console.warn('[WS] Disconnected');
    clientState.connected = false;
    clearInterval(ws._pingInterval);
    clientState.reconnecting = true;

    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
    const delay = Math.min(1000 * Math.pow(2, clientState.reconnectAttempts), 15000);
    clientState.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms…`);
    setTimeout(() => connectWS(), delay);
  };

  ws.onerror = (err) => {
    console.error('[WS] Error', err);
  };

  return ws;
}

/**
 * Send a WebSocket message.
 * Automatically attaches sessionToken from clientState.
 */
export function sendWS(type, payload = {}) {
  if (clientState.ws && clientState.ws.readyState === WebSocket.OPEN) {
    const msg = { type, payload };
    if (clientState.sessionToken) {
      msg.sessionToken = clientState.sessionToken;
    }
    clientState.ws.send(JSON.stringify(msg));
  } else {
    showToast('Connection lost. Reconnecting…', 'warning');
  }
}

// ─── SERVER MESSAGE HANDLER ────────────────────────────────────────────────────

function handleServerMessage(msg) {
  const { type, payload } = msg;

  switch (type) {

    // ── Session established (new join or admin) ─────────────────────────────
    case 'SESSION_CREATED': {
      applySession(payload);

      // Navigate to correct screen
      if (payload.role === 'admin') {
        navigate('admin');
      } else {
        routeToCurrentState();
      }
      break;
    }

    // ── Session restored (browser refresh reconnect) ────────────────────────
    case 'SESSION_RESTORED': {
      applySession(payload);
      showToast('✅ Reconnected successfully', 'success', 2000);

      if (payload.role === 'admin') {
        navigate('admin');
      } else {
        routeToCurrentState();
      }
      break;
    }

    // ── Session invalid (expired or server restarted) ───────────────────────
    case 'SESSION_INVALID': {
      console.log('[Session] Invalid/expired, clearing.');
      Session.clear();
      clearClientIdentity();
      navigate('landing');
      // Only show toast if we had an identity (not first load)
      if (clientState.sessionToken) {
        showToast('Session expired. Please rejoin.', 'warning');
      }
      break;
    }

    // ── Real-time game state update ─────────────────────────────────────────
    case 'GAME_STATE': {
      const prev = clientState.gameState;
      clientState.gameState = payload;

      if (clientState.isAdmin) {
        updateCurrentPage(payload);
      } else {
        handleStateChange(prev, payload);
      }
      break;
    }

    // ── Round submission confirmed ──────────────────────────────────────────
    case 'ROUND_LOCKED': {
      const { round, agileRemaining } = payload;
      const msgs = {
        1: '🔒 Round 1 locked! Waiting for trade show signals…',
        2: `🔒 Trade show allocation locked! Agile remaining: ${agileRemaining ?? '?'} units`,
        3: `🔒 Market shift locked! Agile remaining: ${agileRemaining ?? '?'} units`,
        4: '🔒 Final bet locked! Market is closing…'
      };
      showToast(msgs[round] || '🔒 Locked!', 'success');
      routeToCurrentState();
      break;
    }

    // ── Game reset ─────────────────────────────────────────────────────────
    case 'GAME_RESET': {
      Session.clear();
      clearClientIdentity();
      showToast('⚡ Game was reset. Please rejoin.', 'warning');
      navigate('landing');
      break;
    }

    // ── Error ──────────────────────────────────────────────────────────────
    case 'ERROR': {
      showToast(payload.message || 'Unknown error', 'error');
      // Re-enable any locked buttons
      const lockedBtns = document.querySelectorAll('button:disabled');
      lockedBtns.forEach(btn => {
        if (btn._wasSubmit) { btn.disabled = false; btn.textContent = btn._origText; }
      });
      break;
    }

    case 'PONG':
      break; // heartbeat

    default:
      console.log('[WS] Unhandled message:', type, payload);
  }
}

// ─── APPLY SESSION ─────────────────────────────────────────────────────────────

function applySession(payload) {
  const { sessionToken, role, gameId, teamId, teamName, symbol, gameState } = payload;

  clientState.sessionToken = sessionToken;
  clientState.role         = role;
  clientState.gameId       = gameId;
  clientState.teamId       = teamId || null;
  clientState.teamName     = teamName || null;
  clientState.symbol       = symbol || null;
  clientState.isAdmin      = role === 'admin';
  clientState.gameState    = gameState || null;

  // Persist to localStorage so browser refresh can RECONNECT
  Session.save({ sessionToken, role, gameId, teamId, teamName, symbol });

  if (typeof IS_DEV !== 'undefined' && IS_DEV) {
    console.log('[Session] Applied:', { role, gameId, teamId: teamId || 'admin' });
  }
}

function clearClientIdentity() {
  clientState.sessionToken = null;
  clientState.role         = null;
  clientState.gameId       = null;
  clientState.teamId       = null;
  clientState.teamName     = null;
  clientState.symbol       = null;
  clientState.isAdmin      = false;
  clientState.gameState    = null;
}

// ─── STATE CHANGE ROUTER ───────────────────────────────────────────────────────

function handleStateChange(prev, next) {
  const statusChanged = !prev || prev.status !== next.status;

  if (statusChanged) {
    routeToCurrentState();
    // Toast notification on phase change
    if (prev) {
      const notifications = {
        SIGNAL_REVEAL  : '📡 Trade Show signals are arriving!',
        ROUND2         : '⚡ Round 2 is open — Time to place your bets!',
        LEADERBOARD    : '📊 Mid-game standings are in!',
        ROUND3         : '⚠️ A market event has occurred!',
        ROUND4         : '🎯 Final Round — Last chance to act!',
        DEMAND_REVEAL  : '📦 The market has closed!',
        WINNER         : '🏆 Winner announcement!',
        DEBRIEF        : '📚 Case Reveal — The real story!'
      };
      if (notifications[next.status]) {
        showToast(notifications[next.status], 'info');
      }
    }
  } else {
    // Same status — just update live data (team submission status, etc.)
    updateCurrentPage(next);
  }
}

// ─── ROUTER ────────────────────────────────────────────────────────────────────

let currentPage        = null;
let currentPageUpdater = null;

function routeToCurrentState() {
  const gs = clientState.gameState;
  if (!gs) { navigate('landing'); return; }

  const status    = gs.status;
  const team      = gs.teams?.[clientState.teamId];
  const submitted = (round) => team?.submittedRounds?.includes(round);

  switch (status) {
    case 'LOBBY':
      navigate('waiting', { message: 'Waiting for game to start…', icon: '🎯', sub: 'The host will start the game shortly.' });
      break;

    case 'ROUND1':
      submitted(1)
        ? navigate('waiting', { message: 'Bet locked! Waiting for trade show…', icon: '🔒', sub: 'Signals arriving soon.' })
        : navigate('round-decision', { round: 1 });
      break;

    case 'SIGNAL_REVEAL':
      navigate('signal-reveal');
      break;

    case 'ROUND2':
      submitted(2)
        ? navigate('waiting', { message: 'Allocation locked! Waiting…', icon: '🔒', sub: 'Mid-game leaderboard coming.' })
        : navigate('round-decision', { round: 2 });
      break;

    case 'LEADERBOARD':
      navigate('leaderboard', { midGame: true });
      break;

    case 'ROUND3':
      submitted(3)
        ? navigate('waiting', { message: 'Round 3 locked!', icon: '🔒', sub: 'Final round starting soon.' })
        : navigate('round-decision', { round: 3 });
      break;

    case 'ROUND4':
      submitted(4)
        ? navigate('waiting', { message: 'Final bet placed! Market closing…', icon: '⏳', sub: 'The market will close soon.' })
        : navigate('round-decision', { round: 4 });
      break;

    case 'DEMAND_REVEAL':
      navigate('demand-reveal');
      break;

    case 'WINNER':
      navigate('winner');
      break;

    case 'DEBRIEF':
      navigate('case-reveal');
      break;

    default:
      navigate('landing');
  }
}

export function navigate(page, params = {}) {
  currentPage        = page;
  currentPageUpdater = null;
  const container = document.getElementById('page-container');
  if (!container) return;
  container.className = '';
  container.innerHTML = '';

  switch (page) {
    case 'landing':        currentPageUpdater = renderLanding(container, params);       break;
    case 'join':           currentPageUpdater = renderJoin(container, params);          break;
    case 'admin':          currentPageUpdater = renderAdmin(container, params);         break;
    case 'dashboard':      currentPageUpdater = renderDashboard(container, params);     break;
    case 'round-decision': currentPageUpdater = renderRoundDecision(container, params); break;
    case 'waiting':        currentPageUpdater = renderWaiting(container, params);       break;
    case 'signal-reveal':  currentPageUpdater = renderSignalReveal(container, params);  break;
    case 'leaderboard':    currentPageUpdater = renderLeaderboard(container, params);   break;
    case 'demand-reveal':  currentPageUpdater = renderDemandReveal(container, params);  break;
    case 'winner':         currentPageUpdater = renderWinner(container, params);        break;
    case 'case-reveal':    currentPageUpdater = renderCaseReveal(container, params);    break;
    case 'profile':        currentPageUpdater = renderProfile(container, params);       break;
    case 'sim-lab':        currentPageUpdater = renderSimLab(container, params);        break;
    default:               currentPageUpdater = renderLanding(container, params);
  }
}

function updateCurrentPage(newState) {
  if (currentPage === 'admin') {
    const container = document.getElementById('page-container');
    if (container) {
      try {
        renderAdmin(container);
        return;
      } catch (err) {
        console.error('[Admin Update Error]', err);
      }
    }
  }
  if (typeof currentPageUpdater === 'function') {
    try {
      currentPageUpdater(newState);
    } catch (err) {
      console.error('[Update Error]', err);
    }
  }
}

// ─── TOAST SYSTEM ──────────────────────────────────────────────────────────────

export function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <span>${icons[type] || 'ℹ️'}</span>
      <span style="font-size:0.875rem;font-weight:500;">${message}</span>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── FORMAT UTILITIES ──────────────────────────────────────────────────────────

export function formatCurrency(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatCurrencyFull(amount) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatTimer(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function startTimer(el, totalSeconds, onTick, onEnd) {
  let remaining = totalSeconds;
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      if (el) { el.textContent = '00:00'; el.classList.add('danger'); }
      if (onEnd) onEnd();
      return;
    }
    if (el) {
      el.textContent = formatTimer(remaining);
      el.classList.remove('warning', 'danger');
      if (remaining <= 60)  el.classList.add('danger');
      else if (remaining <= 120) el.classList.add('warning');
    }
    if (onTick) onTick(remaining);
  }, 1000);

  if (el) el.textContent = formatTimer(remaining);
  return () => clearInterval(interval);
}

export function renderRiskBar(riskLevel, color) {
  let html = `<div class="risk-bar" style="color:${color}">`;
  for (let i = 0; i < riskLevel; i++)     html += `<div class="risk-segment filled"></div>`;
  for (let i = 0; i < 4 - riskLevel; i++) html += `<div class="risk-segment empty"></div>`;
  html += `</div>`;
  return html;
}

// ─── INIT ──────────────────────────────────────────────────────────────────────

(function init() {
  const loading = document.getElementById('loading-screen');

    // Brief branded loading screen
  setTimeout(() => {
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => { if (loading) loading.style.display = 'none'; }, 500);
    }

    // Connect WebSocket FIRST (it will attempt RECONNECT if session exists)
    connectWS();

    // Show landing or admin based on hash, unless we have a saved session
    const savedSession = Session.load();
    if (!savedSession) {
      if (window.location.hash === '#admin') {
        const pw = prompt('🔒 Admin Access\n\nEnter admin password:');
        if (pw === 'Chennai-ops') {
          navigate('join', { admin: true });
        } else {
          if (pw !== null) alert('Incorrect password.');
          window.location.hash = '';
          navigate('landing');
        }
      } else {
        navigate('landing');
      }
    }
    // If we have a saved session, connectWS onopen will send RECONNECT,
    // and the server will route us to the correct screen via SESSION_RESTORED.
    // We show nothing here (page-container is empty/loading) until response arrives.
    // Fallback: if server doesn't respond in 3 seconds, show landing.
    else {
      // Show a brief reconnecting state
      const container = document.getElementById('page-container');
      if (container) {
        container.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem;">
            <div style="font-size:2rem;animation:spin 1s linear infinite;">⚙️</div>
            <div style="color:var(--text-muted);font-size:0.9rem;">Reconnecting as ${savedSession.teamName || savedSession.role}…</div>
          </div>
        `;
      }
      // Fallback to landing if reconnect fails
      setTimeout(() => {
        if (!clientState.gameState) {
          console.log('[Init] Reconnect timeout, showing landing');
          Session.clear();
          clearClientIdentity();
          navigate('landing');
        }
      }, 5000);
    }

    // ── Make top-bar logo clickable (navigate home) ────────────────────────
    document.addEventListener('click', (e) => {
      const logo = e.target.closest('.top-bar-logo');
      if (logo) {
        e.preventDefault();
        navigate('landing');
      }
    });
  }, 1200);
})();

// Expose navigate globally (used by inline onclick and join.js)
window.navigate = navigate;
