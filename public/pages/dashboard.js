// =============================================================================
// DASHBOARD PAGE (redirects to round-decision or waiting based on game state)
// This is a passthrough; actual dashboard content is in round-decision.js
// =============================================================================

import { navigate, clientState } from '../app.js';

export function renderDashboard(container, params) {
  // The dashboard routes back to current state
  const gs = clientState.gameState;
  if (!gs) {
    navigate('landing');
    return null;
  }
  navigate('waiting', { message: 'Connected to game', icon: '🎯', sub: 'Waiting for the host to start.' });
  return null;
}
