// =============================================================================
// X-OPS CASEPLAY: THE OBERMEYER GAMBIT
// server.js — Authoritative Game Server (Node.js + WebSocket + Supabase)
// =============================================================================
//
// Architecture:
//   Browser (admin/team) → WebSocket → THIS SERVER → Supabase (persistence)
//
// Authority: This server is the single source of truth for all game state.
//   - Team identity is verified via sessionToken on every action
//   - Admin identity is verified via sessionToken on every admin action
//   - Clients NEVER set their own score, cash, or round state
//   - Demand values are hidden from clients until DEMAND_REVEAL phase
//
// Session tokens:
//   - Issued by this server on JOIN_GAME / JOIN_ADMIN
//   - Stored client-side in localStorage (public/session.js)
//   - Sent with every subsequent WS message
//   - Verified server-side (lib/session.js)
//   - Allow browser refresh without losing identity
// =============================================================================

'use strict';

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── Server modules ────────────────────────────────────────────────────────────
const sessionStore = require('./lib/session');
const db           = require('./lib/db');

// ─── Game engine (shared logic) ────────────────────────────────────────────────
const {
  PRODUCTS,
  ECONOMICS,
  generateDemand,
  generateAllSignals,
  selectEvent,
  calculateTeamPnL,
  classifyStrategy,
  createGameState,
  createTeam,
  validateMassAllocation,
  validateAgileAllocation,
  validateEmergencyAllocation,
  computeLeaderboard
} = require('./public/game-engine.js');

// ─── Config ────────────────────────────────────────────────────────────────────
const PORT              = process.env.PORT || 3000;
const DEFAULT_ADMIN_PIN = process.env.DEFAULT_ADMIN_PIN || '1234';
const IS_DEV            = process.env.NODE_ENV !== 'production';

// ─── In-Memory State ────────────────────────────────────────────────────────────
//
// games{}      — gameId → full game state object (source of truth)
// clientMap    — WeakMap(ws → { sessionToken, gameId, teamId, isAdmin })
// gameClients  — gameId → Set<ws>  (all connected websockets for a game)
//
const games      = {};
const clientMap  = new WeakMap();
const gameClients = {};

// ─── Express + HTTP + WS ────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    games: Object.keys(games).length,
    port: PORT,
    env: IS_DEV ? 'development' : 'production'
    // SECURITY: Never include SUPABASE_SECRET_KEY in any response
  });
});

app.get('/api/game/:gameId', (req, res) => {
  const game = games[req.params.gameId.toUpperCase()];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json({
    gameId: game.gameId,
    status: game.status,
    round: game.round,
    teamCount: Object.keys(game.teams).length,
    maxTeams: game.maxTeams
  });
});

// Create game via REST (returns gameId for admin to use)
app.post('/api/game/create', async (req, res) => {
  const { adminPin, maxTeams, seed } = req.body || {};
  const gameId   = generateGameCode();
  const gameSeed = seed || gameId;
  const state    = createGameState(gameId, {
    adminPin : adminPin || DEFAULT_ADMIN_PIN,
    maxTeams : parseInt(maxTeams) || 12,
    seed     : gameSeed
  });
  games[gameId]      = state;
  gameClients[gameId] = new Set();

  try {
    await db.upsertGame(state);
    await db.logEvent(gameId, 'GAME_CREATED', 0, { seed: gameSeed, maxTeams: state.maxTeams });
  } catch (err) {
    console.error(`[GAME CREATE ERROR] ${err.message}`);
    delete games[gameId];
    delete gameClients[gameId];
    return res.status(500).json({ error: 'Failed to persist game to database' });
  }

  console.log(`[GAME CREATED] ${gameId}`);
  res.json({ gameId, seed: gameSeed });
});

// ─── WEBSOCKET ─────────────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return sendError(ws, 'Invalid message format');
    }
    try {
      await handleMessage(ws, msg);
    } catch (err) {
      console.error('[WS Handler Error]', err.message, err.stack);
      sendError(ws, err.message || 'Server error processing your request');
    }
  });

  ws.on('close', () => {
    const ctx = clientMap.get(ws);
    if (ctx) {
      const { gameId, teamId } = ctx;
      if (teamId && games[gameId]?.teams[teamId]) {
        games[gameId].teams[teamId].isConnected = false;
        broadcastGameState(gameId);
      }
      if (gameClients[gameId]) gameClients[gameId].delete(ws);
      clientMap.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('[WS Error]', err.message);
  });
});

// Heartbeat: remove dead connections every 30 seconds
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
wss.on('close', () => clearInterval(heartbeatInterval));

// ─── MESSAGE DISPATCHER ────────────────────────────────────────────────────────

async function handleMessage(ws, msg) {
  const { type, sessionToken, payload = {} } = msg;

  if (IS_DEV) {
    console.log(`[WS MSG] ${type} | token=${sessionToken ? sessionToken.slice(0,16) + '…' : 'none'}`);
  }

  // Auto-bind any authenticated socket that reconnected without explicit RECONNECT
  if (sessionToken && !clientMap.has(ws)) {
    try {
      const session = await sessionStore.verifySession(sessionToken);
      if (session && games[session.gameId]) {
        if (!gameClients[session.gameId]) gameClients[session.gameId] = new Set();
        gameClients[session.gameId].add(ws);
        clientMap.set(ws, {
          sessionToken,
          gameId   : session.gameId,
          teamId   : session.teamId || null,
          isAdmin  : session.role === 'admin',
          role     : session.role
        });
        console.log(`[WS Auto-Bind] Associated socket with ${session.role} in game ${session.gameId}`);
      }
    } catch (e) {
      // non-fatal
    }
  }

  switch (type) {
    // ── Public (no auth required) ──────────────────────────────────────────
    case 'JOIN_GAME':    return await handleJoinGame(ws, payload);
    case 'JOIN_ADMIN':   return await handleJoinAdmin(ws, payload);
    case 'RECONNECT':    return await handleReconnect(ws, sessionToken);
    case 'PING':         return send(ws, { type: 'PONG' });

    // ── Authenticated ──────────────────────────────────────────────────────
    case 'SUBMIT_ROUND1':  return await handleSubmitRound(ws, sessionToken, 1, payload);
    case 'SUBMIT_ROUND2':  return await handleSubmitRound(ws, sessionToken, 2, payload);
    case 'SUBMIT_ROUND3':  return await handleSubmitRound(ws, sessionToken, 3, payload);
    case 'SUBMIT_ROUND4':  return await handleSubmitRound(ws, sessionToken, 4, payload);
    case 'ADMIN_ACTION':   return await handleAdminAction(ws, sessionToken, payload);
    case 'GET_STATE':      return handleGetState(ws, sessionToken);

    default:
      sendError(ws, `Unknown message type: ${type}`);
  }
}

// ─── JOIN GAME (Team) ──────────────────────────────────────────────────────────

async function handleJoinGame(ws, { gameId, teamName, symbol, playerName }) {
  if (!gameId || !teamName) return sendError(ws, 'gameId and teamName are required.');

  gameId = gameId.trim().toUpperCase();
  teamName = teamName.trim();

  const game = games[gameId];
  if (!game) return sendError(ws, 'Game not found. Check your Game ID.');
  if (game.status === 'WINNER' || game.status === 'DEBRIEF') {
    return sendError(ws, 'This game has already ended.');
  }

  // Find or create team (allows reconnect by name)
  let team = findTeamByName(game, teamName);
  const isNewTeam = !team;

  if (!team) {
    if (Object.keys(game.teams).length >= game.maxTeams) {
      return sendError(ws, 'Game is full.');
    }
    const teamId = 'T_' + uuidv4().slice(0, 6).toUpperCase();
    team = createTeam(teamId, teamName, symbol);
    game.teams[teamId] = team;

    // Persist new team
    try {
      await db.upsertGame(game);
      await db.upsertTeam(team, gameId);
      await db.logEvent(gameId, 'TEAM_JOINED', game.round, { teamId: team.teamId, teamName });
    } catch (err) {
      delete game.teams[teamId];
      throw err;
    }
  }

  team.isConnected = true;
  if (symbol && isNewTeam) {
    team.symbol = symbol;
    await db.upsertTeam(team, gameId); // Fire and forget for symbol update is fine here since it's cosmetic
  }

  // Create server session
  const session = await sessionStore.createSession({
    role     : 'team',
    gameId,
    teamId   : team.teamId,
    teamName : team.name
  });

  // Register ws
  if (!gameClients[gameId]) gameClients[gameId] = new Set();
  gameClients[gameId].add(ws);
  clientMap.set(ws, {
    sessionToken : session.token,
    gameId,
    teamId       : team.teamId,
    isAdmin      : false,
    role         : 'team'
  });

  // Persist player if name provided
  if (playerName) {
    await db.upsertPlayer(team.teamId, session.token, playerName).catch(console.error);
  }

  // Respond with session token (client stores in localStorage)
  send(ws, {
    type: 'SESSION_CREATED',
    payload: {
      sessionToken : session.token,
      role         : 'team',
      gameId,
      teamId       : team.teamId,
      teamName     : team.name,
      symbol       : team.symbol,
      gameState    : sanitizeStateForTeam(game, team.teamId)
    }
  });

  broadcastGameState(gameId);
  console.log(`[JOIN] ${teamName} joined game ${gameId} (${isNewTeam ? 'new' : 'reconnect'})`);
}

// ─── JOIN ADMIN ────────────────────────────────────────────────────────────────

async function handleJoinAdmin(ws, { gameId, adminPin }) {
  if (!gameId) return sendError(ws, 'gameId is required.');
  gameId = gameId.trim().toUpperCase();

  const game = games[gameId];
  if (!game) return sendError(ws, 'Game not found.');
  if (game.adminPin !== adminPin) return sendError(ws, 'Incorrect admin PIN.');

  // Create admin session
  const session = await sessionStore.createSession({ role: 'admin', gameId });

  // Register ws
  if (!gameClients[gameId]) gameClients[gameId] = new Set();
  gameClients[gameId].add(ws);
  clientMap.set(ws, {
    sessionToken : session.token,
    gameId,
    teamId       : null,
    isAdmin      : true,
    role         : 'admin'
  });

  send(ws, {
    type: 'SESSION_CREATED',
    payload: {
      sessionToken : session.token,
      role         : 'admin',
      gameId,
      gameState    : game // Admin gets full state
    }
  });

  console.log(`[ADMIN] Joined game ${gameId}`);
}

// ─── RECONNECT ─────────────────────────────────────────────────────────────────
//
// Called when a browser refreshes and has a saved sessionToken.
// Verifies the token, re-binds the new WebSocket to the existing session,
// and sends the current game state.
//
async function handleReconnect(ws, sessionToken) {
  if (!sessionToken) {
    return send(ws, { type: 'SESSION_INVALID', payload: { reason: 'No token provided' } });
  }

  const session = await sessionStore.verifySession(sessionToken);
  if (!session) {
    return send(ws, { type: 'SESSION_INVALID', payload: { reason: 'Session expired or not found' } });
  }

  const { gameId, teamId, role, teamName } = session;
  const game = games[gameId];

  if (!game) {
    // Game not in memory (server restarted). Clear session.
    await sessionStore.destroySession(sessionToken);
    return send(ws, { type: 'SESSION_INVALID', payload: { reason: 'Game no longer active. Please rejoin.' } });
  }

  // Re-bind this new ws to the existing session
  if (!gameClients[gameId]) gameClients[gameId] = new Set();
  gameClients[gameId].add(ws);
  clientMap.set(ws, {
    sessionToken,
    gameId,
    teamId   : teamId || null,
    isAdmin  : role === 'admin',
    role
  });

  // Re-mark team as connected
  if (teamId && game.teams[teamId]) {
    game.teams[teamId].isConnected = true;
    broadcastGameState(gameId); // notify others this team is back online
  }

  const gameState = role === 'admin'
    ? game
    : sanitizeStateForTeam(game, teamId);

  send(ws, {
    type: 'SESSION_RESTORED',
    payload: {
      sessionToken,
      role,
      gameId,
      teamId      : teamId || null,
      teamName    : teamName || null,
      symbol      : teamId && game.teams[teamId] ? game.teams[teamId].symbol : null,
      gameState
    }
  });

  console.log(`[RECONNECT] role=${role} gameId=${gameId} teamId=${teamId || 'admin'}`);
}

// ─── SUBMIT ROUND (Unified handler for rounds 1-4) ────────────────────────────

async function handleSubmitRound(ws, sessionToken, round, payload) {
  // Verify session
  const session = await sessionStore.verifySession(sessionToken);
  if (!session) return sendError(ws, 'Session invalid. Please rejoin.');
  if (session.role !== 'team') return sendError(ws, 'Only teams can submit decisions.');

  const { gameId, teamId } = session;
  const game = games[gameId];
  const team = game?.teams[teamId];

  if (!game) return sendError(ws, 'Game not found.');
  if (!team) return sendError(ws, 'Team not found.');

  // Verify it's the right round
  const expectedStatus = round === 4 ? 'ROUND4' : `ROUND${round}`;
  if (game.status !== expectedStatus) {
    return sendError(ws, `Round ${round} is not currently active (current: ${game.status}).`);
  }
  if (team.submittedRounds.includes(round)) {
    return sendError(ws, `Already submitted Round ${round}.`);
  }

  let errors = [];

  if (round === 1) {
    // Mass allocation
    const { allocation } = payload;
    errors = validateMassAllocation(allocation);
    if (errors.length) return sendError(ws, errors.join(' '));

    const oldAllocation = { ...team.massAllocation };
    const oldUsed = team.massUsed;
    const oldRounds = [...team.submittedRounds];

    team.massAllocation = allocation;
    team.massUsed = Object.values(allocation).reduce((a, b) => a + b, 0);
    team.submittedRounds.push(1);

    try {
      await db.upsertDecision(gameId, 1, teamId, { massAllocation: allocation });
      await db.upsertTeam(team, gameId);
    } catch (err) {
      team.massAllocation = oldAllocation;
      team.massUsed = oldUsed;
      team.submittedRounds = oldRounds;
      throw err;
    }
    
    send(ws, { type: 'ROUND_LOCKED', payload: { round: 1, massUsed: team.massUsed } });

  } else if (round === 2 || round === 3) {
    // Agile allocation
    const { allocation } = payload;
    errors = validateAgileAllocation(allocation, team.agileUsed);
    if (errors.length) return sendError(ws, errors.join(' '));

    const oldAllocation = { ...team.agileAllocation };
    const oldUsed = team.agileUsed;
    const oldRounds = [...team.submittedRounds];

    PRODUCTS.forEach(p => {
      team.agileAllocation[p.code] = (team.agileAllocation[p.code] || 0) + (allocation[p.code] || 0);
    });
    const used = Object.values(allocation).reduce((a, b) => a + b, 0);
    team.agileUsed += used;
    team.submittedRounds.push(round);

    try {
      await db.upsertDecision(gameId, round, teamId, { agileAllocation: allocation, agileUsedTotal: team.agileUsed });
      await db.upsertTeam(team, gameId);
    } catch (err) {
      team.agileAllocation = oldAllocation;
      team.agileUsed = oldUsed;
      team.submittedRounds = oldRounds;
      throw err;
    }

    const remaining = ECONOMICS.AGILE_CAPACITY - team.agileUsed;
    send(ws, { type: 'ROUND_LOCKED', payload: { round, agileUsed: team.agileUsed, agileRemaining: remaining } });

  } else if (round === 4) {
    // Final: agile + emergency
    const { agileAllocation = {}, emergencyAllocation = {} } = payload;
    const agileErrors     = validateAgileAllocation(agileAllocation, team.agileUsed);
    const emergencyErrors = validateEmergencyAllocation(emergencyAllocation);
    errors = [...agileErrors, ...emergencyErrors];
    if (errors.length) return sendError(ws, errors.join(' '));

    const oldAgile = { ...team.agileAllocation };
    const oldEmergency = { ...team.emergencyAllocation };
    const oldAgileUsed = team.agileUsed;
    const oldEmergencyUsed = team.emergencyUsed;
    const oldRounds = [...team.submittedRounds];

    PRODUCTS.forEach(p => {
      team.agileAllocation[p.code] = (team.agileAllocation[p.code] || 0) + (agileAllocation[p.code] || 0);
    });
    team.agileUsed += Object.values(agileAllocation).reduce((a, b) => a + b, 0);
    team.emergencyAllocation = emergencyAllocation;
    team.emergencyUsed = Object.values(emergencyAllocation).reduce((a, b) => a + b, 0);
    team.submittedRounds.push(4);

    try {
      await db.upsertDecision(gameId, 4, teamId, { agileAllocation, emergencyAllocation });
      await db.upsertTeam(team, gameId);
    } catch (err) {
      team.agileAllocation = oldAgile;
      team.emergencyAllocation = oldEmergency;
      team.agileUsed = oldAgileUsed;
      team.emergencyUsed = oldEmergencyUsed;
      team.submittedRounds = oldRounds;
      throw err;
    }

    send(ws, { type: 'ROUND_LOCKED', payload: { round: 4, agileUsed: team.agileUsed, emergencyUsed: team.emergencyUsed } });
  }

  broadcastGameState(gameId);
  console.log(`[ROUND${round}] ${team.name} submitted`);
}

// ─── ADMIN ACTION ──────────────────────────────────────────────────────────────

async function handleAdminAction(ws, sessionToken, { action, params = {} }) {
  // Verify admin session
  const session = await sessionStore.verifySession(sessionToken);
  if (!session) return sendError(ws, 'Session invalid. Please rejoin as admin.');
  if (session.role !== 'admin') return sendError(ws, 'Admin access required.');

  const { gameId } = session;
  const game = games[gameId];
  if (!game) return sendError(ws, 'Game not found.');

  console.log(`[ADMIN] ${action} on game ${gameId}`);

  switch (action) {

    case 'START_GAME':
      if (game.status !== 'LOBBY') return sendError(ws, 'Game already started.');
      await db.updateGameStatus(gameId, 'ROUND1', 1);
      await db.upsertRound(gameId, 1, 'ROUND1');
      await db.logEvent(gameId, 'GAME_STARTED', 1, {});
      game.status = 'ROUND1';
      game.round  = 1;
      game.roundStartedAt = Date.now();
      break;

    case 'REVEAL_SIGNALS':
      if (game.status !== 'ROUND1') return sendError(ws, 'Can only reveal signals after Round 1.');
      await db.updateGameStatus(gameId, 'SIGNAL_REVEAL', 1);
      await db.logEvent(gameId, 'SIGNALS_REVEALED', 1, { signals: game.signals });
      game.status = 'SIGNAL_REVEAL';
      break;

    case 'START_ROUND2':
      if (game.status !== 'SIGNAL_REVEAL') return sendError(ws, 'Must reveal signals first.');
      await db.updateGameStatus(gameId, 'ROUND2', 2);
      await db.upsertRound(gameId, 2, 'ROUND2');
      await db.logEvent(gameId, 'ROUND_STARTED', 2, {});
      game.status = 'ROUND2';
      game.round  = 2;
      game.roundStartedAt = Date.now();
      break;

    case 'SHOW_LEADERBOARD':
      computeLeaderboard(game);
      await db.updateGameStatus(gameId, 'LEADERBOARD', 2);
      await db.logEvent(gameId, 'LEADERBOARD_SHOWN', 2, {});
      game.status = 'LEADERBOARD';
      break;

    case 'TRIGGER_EVENT':
      if (game.status !== 'LEADERBOARD') return sendError(ws, 'Show leaderboard first.');
      await db.updateGameStatus(gameId, 'ROUND3', 3);
      await db.upsertRound(gameId, 3, 'ROUND3');
      await db.logEvent(gameId, 'MARKET_EVENT_TRIGGERED', 3, { event: game.event });
      game.status       = 'ROUND3';
      game.round        = 3;
      game.currentEvent = game.event; // reveal the event
      game.roundStartedAt = Date.now();
      break;

    case 'START_ROUND4':
      if (game.status !== 'ROUND3') return sendError(ws, 'Must complete Round 3 first.');
      await db.updateGameStatus(gameId, 'ROUND4', 4);
      await db.upsertRound(gameId, 4, 'ROUND4');
      await db.logEvent(gameId, 'ROUND_STARTED', 4, {});
      game.status = 'ROUND4';
      game.round  = 4;
      game.roundStartedAt = Date.now();
      break;

    case 'REVEAL_DEMAND':
      if (game.status !== 'ROUND4') return sendError(ws, 'Must complete Round 4 first.');
      // Calculate final results for ALL teams (server-authoritative)
      for (const team of Object.values(game.teams)) {
        team.pnl             = calculateTeamPnL(team, game.actualDemands);
        team.strategyProfile = classifyStrategy(team, game.actualDemands);
        team.currentScore    = team.pnl.finalCash;
        team.cash            = team.pnl.finalCash;

        // Persist results synchronously to ensure integrity before state change
        await db.upsertResult(gameId, 4, team.teamId, team.pnl);
        await db.upsertTeam(team, gameId);
      }
      computeLeaderboard(game);
      await db.updateGameStatus(gameId, 'DEMAND_REVEAL', 4);
      await db.logEvent(gameId, 'DEMAND_REVEALED', 4, { actualDemands: game.actualDemands });
      game.status = 'DEMAND_REVEAL';
      break;

    case 'SHOW_WINNER':
      await db.updateGameStatus(gameId, 'WINNER', 4);
      await db.logEvent(gameId, 'WINNER_REVEALED', 4, {});
      game.status = 'WINNER';
      break;

    case 'START_DEBRIEF':
      await db.updateGameStatus(gameId, 'DEBRIEF', 4);
      await db.logEvent(gameId, 'DEBRIEF_STARTED', 4, {});
      game.status = 'DEBRIEF';
      // Do NOT delete sessions here so players can explore the Case Reveal & Operations Profile
      break;

    case 'PAUSE_GAME':
      game.paused = !game.paused;
      break;

    case 'RESET_GAME': {
      const newSeed  = (params.seed) || (game.gameId + '_' + Date.now());
      const newState = createGameState(game.gameId, {
        adminPin : game.adminPin,
        maxTeams : game.maxTeams,
        seed     : newSeed
      });
      await db.upsertGame(newState);
      await db.logEvent(gameId, 'GAME_RESET', 0, {});
      games[gameId] = newState;
      // Invalidate all existing sessions for this game
      await sessionStore.deleteAllForGame(gameId);
      broadcastToGame(gameId, { type: 'GAME_RESET', payload: { message: 'Game was reset. Please rejoin.' } });
      return;
    }

    case 'KICK_TEAM':
      if (params.teamId && game.teams[params.teamId]) {
        await db.logEvent(gameId, 'TEAM_KICKED', game.round, { teamId: params.teamId });
        delete game.teams[params.teamId];
      }
      break;

    default:
      return sendError(ws, `Unknown admin action: ${action}`);
  }

  broadcastGameState(gameId);
}

// ─── GET STATE ─────────────────────────────────────────────────────────────────

async function handleGetState(ws, sessionToken) {
  const session = await sessionStore.verifySession(sessionToken);
  if (!session) return send(ws, { type: 'SESSION_INVALID', payload: {} });

  const { gameId, teamId, role } = session;
  const game = games[gameId];
  if (!game) return sendError(ws, 'Game not found.');

  const state = role === 'admin' ? game : sanitizeStateForTeam(game, teamId);
  send(ws, { type: 'GAME_STATE', payload: state });
}

// ─── STATE SANITIZER ───────────────────────────────────────────────────────────
//
// Removes private data from game state before sending to team clients.
// Teams see:
//   - Their own allocations
//   - Other teams' names, symbols, ranks, connection status (public info)
//   - Signals (after SIGNAL_REVEAL)
//   - Market event (after ROUND3)
//   - Actual demands + PnL (after DEMAND_REVEAL)
//
// Teams do NOT see:
//   - Other teams' allocation decisions (before DEMAND_REVEAL)
//   - Actual demand values (before DEMAND_REVEAL)
//   - Full admin event details before reveal
//
function sanitizeStateForTeam(game, teamId) {
  const isPostReveal = ['DEMAND_REVEAL', 'WINNER', 'DEBRIEF'].includes(game.status);
  const isPostDebrief = game.status === 'DEBRIEF';

  const teams = {};
  Object.values(game.teams).forEach(t => {
    teams[t.teamId] = {
      teamId         : t.teamId,
      name           : t.name,
      symbol         : t.symbol,
      rank           : t.rank,
      rankChange     : t.rankChange,
      currentScore   : t.currentScore,
      isConnected    : t.isConnected,
      submittedRounds: t.submittedRounds,
      massUsed       : t.massUsed,
      agileUsed      : t.agileUsed,
      emergencyUsed  : t.emergencyUsed,
      // Own team sees its allocations; others don't (until post-reveal)
      massAllocation      : (t.teamId === teamId || isPostReveal) ? t.massAllocation : null,
      agileAllocation     : (t.teamId === teamId || isPostReveal) ? t.agileAllocation : null,
      emergencyAllocation : (t.teamId === teamId || isPostReveal) ? t.emergencyAllocation : null,
      // P&L only shown after DEMAND_REVEAL
      pnl             : isPostReveal ? t.pnl : null,
      // Strategy profile only after DEBRIEF
      strategyProfile : isPostDebrief ? t.strategyProfile : null
    };
  });

  return {
    gameId          : game.gameId,
    status          : game.status,
    round           : game.round,
    paused          : game.paused || false,
    roundStartedAt  : game.roundStartedAt,
    roundDurations  : game.roundDurations,
    teams,
    // Signals visible after SIGNAL_REVEAL
    signals         : (game.status !== 'LOBBY' && game.status !== 'ROUND1') ? game.signals : null,
    // Event visible after ROUND3
    currentEvent    : game.currentEvent || null,
    // Demands only after DEMAND_REVEAL
    actualDemands   : isPostReveal ? game.actualDemands : null,
    // Client's own identity
    myTeamId        : teamId
  };
}

// ─── BROADCAST ─────────────────────────────────────────────────────────────────

function broadcastGameState(gameId) {
  const game = games[gameId];
  if (!game || !gameClients[gameId]) return;

  gameClients[gameId].forEach(ws => {
    if (ws.readyState !== WebSocket.OPEN) {
      gameClients[gameId].delete(ws);
      return;
    }
    const ctx = clientMap.get(ws);
    if (!ctx) return;

    if (ctx.isAdmin) {
      send(ws, { type: 'GAME_STATE', payload: game });
    } else if (ctx.teamId) {
      send(ws, { type: 'GAME_STATE', payload: sanitizeStateForTeam(game, ctx.teamId) });
    }
  });
}

function broadcastToGame(gameId, msg) {
  if (!gameClients[gameId]) return;
  gameClients[gameId].forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) send(ws, msg);
  });
}

// ─── UTILITY ───────────────────────────────────────────────────────────────────

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendError(ws, message) {
  send(ws, { type: 'ERROR', payload: { message } });
}

function findTeamByName(game, name) {
  return Object.values(game.teams)
    .find(t => t.name.toLowerCase() === name.trim().toLowerCase()) || null;
}

function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Ensure uniqueness
  return games[code] ? generateGameCode() : code;
}

// ─── START ─────────────────────────────────────────────────────────────────────

async function startServer() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   X-OPS CASEPLAY: THE OBERMEYER GAMBIT       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Server  → http://localhost:${PORT}              ║`);
  console.log(`║  Admin   → http://localhost:${PORT}/#admin        ║`);
  console.log(`║  ENV     → ${process.env.NODE_ENV || 'development'}                       ║`);
  
  // 1. Health check
  process.stdout.write('║  Database→ ');
  const dbStatus = await db.testConnection();
  if (dbStatus === 'OK') {
    console.log('✅ Connected and schema available      ║');
  } else if (dbStatus === 'MISSING_SCHEMA') {
    console.log('❌ Connected, but required tables missing║');
    console.log('╚══════════════════════════════════════════════╝\n');
    console.error('ERROR: You must run supabase/migrations/001_initial_schema.sql');
    process.exit(1);
  } else if (dbStatus === 'UNCONFIGURED') {
    console.log('⚠️  Not configured. IN-MEMORY ONLY!       ║');
  } else {
    console.log('❌ Connection failed!                    ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    console.error('ERROR: Database connection failed. Check SUPABASE_URL and SUPABASE_SECRET_KEY.');
    process.exit(1);
  }
  console.log('╚══════════════════════════════════════════════╝\n');

  // 2. Restart recovery
  if (dbStatus === 'OK') {
    console.log('[Recovery] Loading active games from database...');
    try {
      const activeGames = await db.loadActiveGames() || [];
      console.log(`[Recovery] Fetched ${activeGames.length} active games from DB.`);
      let recoveredCount = 0;
      for (const row of activeGames) {
        // Reconstruct game
        const gameId = row.game_code;
        const state = createGameState(gameId, {
          adminPin: row.admin_pin,
          maxTeams: row.max_teams,
          seed: row.seed
        });
        
        state.status = row.status;
        state.round = row.current_round;
        if (row.config?.event) state.event = row.config.event;
        if (row.config?.actualDemands) state.actualDemands = row.config.actualDemands;
        if (row.config?.roundDurations) state.roundDurations = row.config.roundDurations;
        
        // Reconstruct teams
        if (row.teams) {
          for (const tRow of row.teams) {
            const team = createTeam(tRow.team_code, tRow.team_name, tRow.symbol);
            team.cash = parseInt(tRow.cash) || 1000000;
            team.currentScore = parseInt(tRow.score) || 1000000;
            team.massAllocation = tRow.mass_allocation || {};
            team.agileAllocation = tRow.agile_allocation || {};
            team.emergencyAllocation = tRow.emergency_allocation || {};
            team.pnl = tRow.pnl_data;
            team.strategyProfile = tRow.strategy_profile;
            team.submittedRounds = tRow.submitted_rounds || [];
            
            // Recompute used fields
            team.massUsed = Object.values(team.massAllocation).reduce((a, b) => a + b, 0);
            team.agileUsed = Object.values(team.agileAllocation).reduce((a, b) => a + b, 0);
            team.emergencyUsed = Object.values(team.emergencyAllocation).reduce((a, b) => a + b, 0);
            
            state.teams[team.teamId] = team;
          }
        }
        
        games[gameId] = state;
        gameClients[gameId] = new Set();
        recoveredCount++;
      }
      console.log(`[Recovery] Successfully recovered ${recoveredCount} active game(s).`);
    } catch (err) {
      console.error('[Recovery] Failed to load active games:', err);
    }
  }

  // 3. Start HTTP server
  server.listen(PORT, () => {
    console.log(`[Server] Ready to accept WebSocket connections on port ${PORT}.`);
  });
}

startServer();
