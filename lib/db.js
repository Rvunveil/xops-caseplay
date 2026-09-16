// =============================================================================
// lib/db.js — Supabase Database Operations
// =============================================================================
//
// ⚠️  SECURITY: This module imports lib/supabase.js which uses SUPABASE_SECRET_KEY.
//     Never import this file from frontend code.
//
// STRICT ERROR HANDLING:
// Operations now THROW errors if Supabase writes fail.
// This ensures the server can abort state transitions if persistence fails.
// =============================================================================

'use strict';

const { getClient } = require('./supabase');

// ---------------------------------------------------------------------------
// Helper: run a DB operation, throw on error
// ---------------------------------------------------------------------------
async function run(fn) {
  const client = getClient();
  if (!client) {
    throw new Error('Supabase client not initialized (missing config)');
  }

  try {
    const result = await fn(client);
    if (result.error) {
      console.error('[DB ERROR]', result.error.message || result.error);
      throw new Error(`DB Error: ${result.error.message || JSON.stringify(result.error)}`);
    }
    return result.data;
  } catch (err) {
    console.error('[DB EXCEPTION]', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

async function testConnection() {
  const client = getClient();
  if (!client) return 'UNCONFIGURED';
  try {
    const { data, error } = await client.from('games').select('id').limit(1);
    if (error) {
      if (error.message && (error.message.includes('schema cache') || error.message.includes('relation "public.games" does not exist'))) {
        return 'MISSING_SCHEMA';
      }
      console.error('[DB HEALTH CHECK ERROR]', error);
      return 'ERROR';
    }
    return 'OK';
  } catch (err) {
    console.error('[DB HEALTH CHECK EXCEPTION]', err);
    return 'ERROR';
  }
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

async function upsertGame(gameState) {
  return run(async (db) => db.from('games').upsert({
    game_code: gameState.gameId,
    status: gameState.status,
    current_round: gameState.round,
    seed: gameState.seed,
    admin_pin: gameState.adminPin,
    max_teams: gameState.maxTeams,
    config: {
      event: gameState.event,
      actualDemands: gameState.actualDemands,
      roundDurations: gameState.roundDurations
    }
  }, { onConflict: 'game_code' }).select('id').single());
}

async function updateGameStatus(gameId, status, round) {
  return run(async (db) => db.from('games')
    .update({ status, current_round: round, ...(status === 'DEBRIEF' ? { ended_at: new Date().toISOString() } : {}) })
    .eq('game_code', gameId));
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

async function upsertTeam(team, gameId) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', gameId).single();
    if (gameError || !game) throw new Error(`Game ${gameId} not found in DB`);

    return db.from('teams').upsert({
      game_id: game.id,
      team_code: team.teamId,
      team_name: team.name,
      symbol: team.symbol,
      cash: team.cash || 1000000,
      score: team.currentScore || 1000000,
      status: 'active',
      mass_allocation: team.massAllocation || {},
      agile_allocation: team.agileAllocation || {},
      emergency_allocation: team.emergencyAllocation || {},
      pnl_data: team.pnl || null,
      strategy_profile: team.strategyProfile || null,
      submitted_rounds: team.submittedRounds || [],
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'game_id,team_name' });
  });
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

async function upsertDecision(gameId, roundNumber, teamId, decisionData) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', gameId).single();
    const { data: team, error: teamError } = await db.from('teams').select('id').eq('team_code', teamId).single();
    if (gameError || teamError || !game || !team) throw new Error('Game or team not found for decision');

    return db.from('decisions').upsert({
      game_id: game.id,
      round_number: roundNumber,
      team_id: team.id,
      decision_data: decisionData,
      submitted_at: new Date().toISOString()
    }, { onConflict: 'game_id,round_number,team_id' });
  });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

async function upsertResult(gameId, roundNumber, teamId, pnl) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', gameId).single();
    const { data: team, error: teamError } = await db.from('teams').select('id').eq('team_code', teamId).single();
    if (gameError || teamError || !game || !team) throw new Error('Game or team not found for result');

    return db.from('results').upsert({
      game_id: game.id,
      round_number: roundNumber,
      team_id: team.id,
      revenue: pnl.totalRevenue || 0,
      cost: pnl.totalProductionCost || 0,
      profit: pnl.totalProfit || 0,
      score: pnl.finalCash || 1000000,
      result_data: pnl
    }, { onConflict: 'game_id,round_number,team_id' });
  });
}

// ---------------------------------------------------------------------------
// Rounds
// ---------------------------------------------------------------------------

async function upsertRound(gameId, roundNumber, phase) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', gameId).single();
    if (gameError || !game) throw new Error('Game not found for round');

    return db.from('rounds').upsert({
      game_id: game.id,
      round_number: roundNumber,
      phase,
      started_at: new Date().toISOString()
    }, { onConflict: 'game_id,round_number' });
  });
}

// ---------------------------------------------------------------------------
// Game Events (audit log)
// ---------------------------------------------------------------------------

async function logEvent(gameId, eventType, roundNumber, payload = {}) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', gameId).single();
    if (gameError || !game) throw new Error('Game not found for event');

    return db.from('game_events').insert({
      game_id: game.id,
      event_type: eventType,
      round_number: roundNumber,
      payload
    });
  });
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

async function upsertPlayer(teamId, sessionToken, displayName) {
  return run(async (db) => {
    const { data: team, error: teamError } = await db.from('teams').select('id').eq('team_code', teamId).single();
    if (teamError || !team) throw new Error('Team not found for player');

    return db.from('players').upsert({
      team_id: team.id,
      session_id: sessionToken,
      display_name: displayName,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'team_id,session_id' });
  });
}

// ---------------------------------------------------------------------------
// Recovery: Load active games from DB for server restart
// ---------------------------------------------------------------------------

async function loadActiveGames() {
  return run(async (db) => {
    const { data: games, error } = await db.from('games')
      .select('*, teams(*)');
      
    if (error) throw error;
    return { data: games.filter(g => g.status !== 'DEBRIEF' && g.status !== 'WINNER') };
  });
}

// =============================================================================
// SESSIONS
// =============================================================================

async function upsertSession(session) {
  return run(async (db) => {
    const { data: game, error: gameError } = await db.from('games').select('id').eq('game_code', session.gameId).single();
    if (gameError || !game) throw new Error(`Game ${session.gameId} not found in DB for session`);

    let teamIdUuid = null;
    if (session.teamId) {
      const { data: team } = await db.from('teams').select('id').eq('team_code', session.teamId).single();
      if (team) teamIdUuid = team.id;
    }

    return db.from('sessions').upsert({
      token: session.token,
      role: session.role,
      game_id: game.id,
      team_id: teamIdUuid,
      team_name: session.teamName,
      created_at: new Date(session.createdAt).toISOString(),
      last_seen_at: new Date().toISOString()
    });
  });
}

async function getSession(token) {
  return run(async (db) => {
    const { data, error } = await db.from('sessions')
      .select('*, games(game_code), teams(team_code)')
      .eq('token', token)
      .single();
    if (error && error.code === 'PGRST116') return { data: null }; // Not found (PGRST116)
    if (error) throw error;
    if (!data) return { data: null };
    return {
      data: {
        token: data.token,
        role: data.role,
        gameId: data.games ? data.games.game_code : null,
        teamId: data.teams ? data.teams.team_code : null,
        teamName: data.team_name,
        createdAt: new Date(data.created_at).getTime()
      }
    };
  });
}

async function deleteSession(token) {
  return run(async (db) => db.from('sessions').delete().eq('token', token));
}

async function deleteSessionsForGame(gameId) {
  return run(async (db) => {
    const { data: game } = await db.from('games').select('id').eq('game_code', gameId).single();
    if (game) {
      return db.from('sessions').delete().eq('game_id', game.id);
    }
    return { data: null };
  });
}

module.exports = {
  testConnection,
  upsertGame,
  updateGameStatus,
  upsertTeam,
  upsertDecision,
  upsertResult,
  upsertRound,
  logEvent,
  upsertPlayer,
  loadActiveGames,
  upsertSession,
  getSession,
  deleteSession,
  deleteSessionsForGame
};
