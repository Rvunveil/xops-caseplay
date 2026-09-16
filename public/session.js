// =============================================================================
// public/session.js — Client-Side Session Persistence
// =============================================================================
//
// Persists session identity to localStorage so browser refresh restores
// the team or admin identity without requiring a full re-join.
//
// Session expires after 24 hours to avoid stale state.
//
// ⚠️  SECURITY: This module NEVER touches SUPABASE_SECRET_KEY.
//     It only stores the sessionToken issued by the Node server.
// =============================================================================

const SESSION_KEY = 'xops_session_v2';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const Session = {
  /**
   * Persist session data to localStorage.
   * @param {object} data - { sessionToken, role, gameId, teamId, teamName, symbol }
   */
  save(data) {
    try {
      const payload = { ...data, savedAt: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Session] Could not save to localStorage:', e.message);
    }
  },

  /**
   * Load session from localStorage. Returns null if missing or expired.
   * @returns {object|null}
   */
  load() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);

      // Validate shape
      if (!session.sessionToken || !session.gameId || !session.role) {
        this.clear();
        return null;
      }

      // Check expiry
      if (Date.now() - session.savedAt > SESSION_TTL_MS) {
        console.log('[Session] Expired, clearing.');
        this.clear();
        return null;
      }

      return session;
    } catch (e) {
      console.warn('[Session] Could not load from localStorage:', e.message);
      return null;
    }
  },

  /**
   * Clear the saved session.
   */
  clear() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  },

  /**
   * Check if a valid session is saved.
   */
  isValid() {
    const s = this.load();
    return !!(s && s.sessionToken && s.gameId && s.role);
  },

  /**
   * Update specific fields without overwriting the whole session.
   */
  update(updates) {
    const existing = this.load();
    if (existing) {
      this.save({ ...existing, ...updates });
    }
  }
};
