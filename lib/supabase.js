// =============================================================================
// lib/supabase.js — Server-Side Supabase Client
// =============================================================================
//
// ⚠️  SECURITY: This module is SERVER-SIDE ONLY.
//     - It uses SUPABASE_SECRET_KEY which must NEVER be sent to the browser.
//     - Never import this file from frontend/public/ code.
//     - Never include SUPABASE_SECRET_KEY in API responses, logs, or HTTP headers.
//
// The game works in memory even if Supabase is not configured.
// DB operations fail gracefully with a console warning.
// =============================================================================

'use strict';

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Validate that we're not accidentally using the publishable key
if (SUPABASE_SECRET_KEY && SUPABASE_SECRET_KEY.includes('publishable')) {
  console.error('[SECURITY] SUPABASE_SECRET_KEY appears to be a publishable key. Check your .env file.');
  process.exit(1);
}

let _client = null;
let _initAttempted = false;

function getClient() {
  if (_client) return _client;
  if (_initAttempted) return null;
  _initAttempted = true;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.warn('[Supabase] ⚠️  No credentials found. Game runs in-memory only (no persistence).');
    console.warn('[Supabase]    Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env to enable persistence.');
    return null;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const WebSocket = require('ws');
    _client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
      global: { fetch: fetch.bind(globalThis), headers: { 'x-my-custom-header': 'xops-caseplay' } },
      realtime: {
        transport: WebSocket // Provide ws for older Node versions
      }
    });
    console.log('[Supabase] ✅ Client initialized.');
    return _client;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err.message);
    return null;
  }
}

module.exports = { getClient };
