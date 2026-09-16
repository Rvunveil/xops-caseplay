// =============================================================================
// lib/session.js — Server-Side Session Store
// =============================================================================
//
// Manages secure session tokens for both admin and team identities.
// Sessions are cached in-memory for fast access, and persisted to Supabase
// to survive server restarts.
//
// Token format: "xops_<random-uuid-without-hyphens>"
// Session lifetime: 24 hours (configurable via SESSION_TTL_MS)
// =============================================================================

'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Map<token, SessionObject> (Write-through cache)
const sessions = new Map();

/**
 * Create a new session and return the session object (including token).
 */
async function createSession({ role, gameId, teamId = null, teamName = null }) {
  const token = 'xops_' + uuidv4().replace(/-/g, '');
  const session = {
    token,
    role,
    gameId,
    teamId,
    teamName,
    createdAt: Date.now()
  };
  sessions.set(token, session);
  await db.upsertSession(session).catch(e => console.error('[Session] DB Persist error:', e));
  return session;
}

/**
 * Verify a session token and return the session, or null if invalid/expired.
 */
async function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  
  // 1. Check in-memory cache
  let session = sessions.get(token);
  
  // 2. If not in memory, try DB
  if (!session) {
    try {
      session = await db.getSession(token);
      if (session) {
        sessions.set(token, session); // Restore to memory
      }
    } catch (e) {
      console.error('[Session] DB getSession error:', e);
      return null;
    }
  }
  
  if (!session) return null;

  // 3. Check expiry
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    await destroySession(token);
    return null;
  }

  return session;
}

/**
 * Update fields on an existing session.
 */
async function updateSession(token, updates) {
  const session = await verifySession(token);
  if (!session) return null;
  Object.assign(session, updates);
  await db.upsertSession(session).catch(console.error);
  return session;
}

/**
 * Remove a session explicitly.
 */
async function destroySession(token) {
  sessions.delete(token);
  await db.deleteSession(token).catch(e => console.error('[Session] DB delete error:', e));
}

/**
 * Revoke ALL sessions for a specific game.
 */
async function deleteAllForGame(gameId) {
  // Remove from memory
  sessions.forEach((session, token) => {
    if (session.gameId === gameId) {
      sessions.delete(token);
    }
  });
  // Remove from DB
  await db.deleteSessionsForGame(gameId).catch(e => console.error('[Session] DB deleteAllForGame error:', e));
  console.log(`[Session] Revoked all sessions for game ${gameId}`);
}

/**
 * Cleanup expired sessions from memory periodically.
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let removed = 0;
  sessions.forEach((session, token) => {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(token);
      // We don't necessarily need to hammer DB for cleanup, but we can try
      db.deleteSession(token).catch(() => {});
      removed++;
    }
  });
  if (removed > 0) console.log(`[Session] Cleaned up ${removed} expired sessions from memory.`);
}

setInterval(cleanupExpiredSessions, 30 * 60 * 1000);

module.exports = {
  createSession,
  verifySession,
  updateSession,
  destroySession,
  deleteAllForGame,
  sessions // exported for diagnostics
};
