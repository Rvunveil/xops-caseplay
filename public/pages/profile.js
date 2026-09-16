// =============================================================================
// OPERATIONS PROFILE PAGE
// =============================================================================

import { clientState, formatCurrency, navigate } from '../app.js';

const STRATEGY_PROFILES = {
  ACCURATE_RESPONSE: {
    name: 'Accurate Response',
    emoji: '🎯',
    title: 'PRECISION OPERATOR',
    color: '#00d4aa',
    description: 'You used cheap capacity for safe bets and flexible capacity for uncertain products. This is exactly what the best supply chain managers do.',
    strength: 'Excellent allocation between cheap and flexible production.',
    weakness: 'May be too conservative in extreme upside scenarios.',
    insight: 'You discovered the core principle of Accurate Response without being told what it was called.'
  },
  DEMAND_GAMBLER: {
    name: 'Demand Gambler',
    emoji: '🎲',
    title: 'RISK HUNTER',
    color: '#a29bfe',
    description: 'You went all-in on high-risk products. Bold strategy. When it works, it really works.',
    strength: 'Maximizes upside when volatile products perform.',
    weakness: 'Heavy exposure when high-risk products underdeliver.',
    insight: 'High-variance strategies win sometimes. But in the long run, structured risk management beats gut feel.'
  },
  COST_MAXIMIZER: {
    name: 'Cost Maximizer',
    emoji: '💰',
    title: 'COST ENGINEER',
    color: '#fdcb6e',
    description: 'You prioritized cheap production costs. Safe, efficient, but potentially inflexible.',
    strength: 'Low production costs, high margins on sold units.',
    weakness: 'Committed early, less ability to react to new information.',
    insight: 'Cost efficiency matters — but when demand is uncertain, flexibility is worth its premium.'
  },
  AGILITY_MASTER: {
    name: 'Agility Master',
    emoji: '⚡',
    title: 'AGILITY MASTER',
    color: '#74b9ff',
    description: 'You preferred expensive but flexible capacity. Higher costs, but maximum adaptability.',
    strength: 'Responded well to market signals and uncertainty.',
    weakness: 'Higher costs reduce margins even when demand is correct.',
    insight: 'Agility is powerful. But committing predictable products to cheap factories first would have boosted your margin.'
  },
  BALANCED_OPERATOR: {
    name: 'Balanced Operator',
    emoji: '⚖️',
    title: 'BALANCED OPERATOR',
    color: '#6c63ff',
    description: 'You balanced risk across products and production options. Solid fundamentals.',
    strength: 'Diversified risk, resilient to market shocks.',
    weakness: 'Missed opportunities to capitalize on strong signals.',
    insight: 'Diversification is good — but Accurate Response would sharpen your edge further.'
  },
  RISK_HUNTER: {
    name: 'Risk Hunter',
    emoji: '🦁',
    title: 'COMEBACK SPECIALIST',
    color: '#ff4757',
    description: 'You used emergency sourcing aggressively. Expensive, but sometimes the boldest bet pays off.',
    strength: 'Ability to capture last-minute demand surges.',
    weakness: 'Emergency costs significantly erode margins.',
    insight: 'Emergency sourcing is a useful escape valve — but if it\'s your main strategy, margins suffer.'
  }
};

export function renderProfile(container) {
  const gs = clientState.gameState;
  const myTeam = gs?.teams?.[clientState.teamId];

  if (!myTeam) {
    container.innerHTML = `
      <div class="page-content text-center mt-8">
        <h2>No profile data available</h2>
        <p class="text-muted mt-4">Complete the game first to see your operations profile.</p>
        <button class="btn btn-primary mt-6" onclick="window.history.back()">← Go Back</button>
      </div>
    `;
    return null;
  }

  const profileKey = myTeam.strategyProfile || 'BALANCED_OPERATOR';
  const profile = STRATEGY_PROFILES[profileKey] || STRATEGY_PROFILES.BALANCED_OPERATOR;
  const pnl = myTeam.pnl;

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          <span style="color:var(--text-muted);">Your Operations Profile</span>
        </div>
      </div>

      <div class="page-content" style="max-width:800px;">
        <!-- Profile Card -->
        <div class="champion-card mb-8 fade-in" style="text-align:center;border-color:${profile.color};">
          <div style="font-size:4rem;margin-bottom:var(--space-4);">${myTeam.symbol || '⭐'}</div>
          <div style="font-size:0.8rem;font-weight:700;letter-spacing:0.2em;color:${profile.color};margin-bottom:var(--space-3);">
            ${myTeam.name}
          </div>
          <div style="font-size:clamp(1.5rem,5vw,2.5rem);font-weight:900;color:${profile.color};margin-bottom:var(--space-2);">
            ${profile.emoji} ${profile.title}
          </div>
          <p style="color:var(--text-secondary);max-width:500px;margin:0 auto var(--space-6);line-height:1.7;">
            ${profile.description}
          </p>
          ${pnl ? `
            <div class="mono" style="font-size:2rem;font-weight:700;color:${pnl.finalCash >= 1000000 ? 'var(--teal)' : 'var(--red)'};">
              ${formatCurrency(pnl.finalCash)}
            </div>
            <div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">Final Company Value</div>
          ` : ''}
        </div>

        <!-- Strengths and Weaknesses -->
        <div class="grid-2 mb-6">
          <div class="card card-teal">
            <div style="font-weight:700;color:var(--teal);margin-bottom:var(--space-3);">💪 Your Strength</div>
            <p style="color:var(--text-secondary);">${profile.strength}</p>
          </div>
          <div class="card card-danger">
            <div style="font-weight:700;color:var(--red);margin-bottom:var(--space-3);">⚠️ What to Watch</div>
            <p style="color:var(--text-secondary);">${profile.weakness}</p>
          </div>
        </div>

        <!-- Insight -->
        <div class="card mb-6" style="border-left:3px solid ${profile.color};background:linear-gradient(135deg,var(--bg-card),${profile.color}10);">
          <div class="card-title mb-3">💡 OPERATIONS INSIGHT</div>
          <p style="color:var(--text-secondary);line-height:1.8;">${profile.insight}</p>
        </div>

        <!-- All profiles -->
        <div class="card mb-8">
          <div class="card-title mb-4">ALL STRATEGY ARCHETYPES</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3);">
            ${Object.entries(STRATEGY_PROFILES).map(([key, p]) => `
              <div style="padding:var(--space-3);border-radius:var(--radius-md);
                background:${key === profileKey ? `${p.color}20` : 'var(--bg-elevated)'};
                border:1px solid ${key === profileKey ? p.color : 'var(--border)'};
                text-align:center;">
                <div style="font-size:1.5rem;">${p.emoji}</div>
                <div style="font-weight:700;font-size:0.8rem;color:${p.color};margin-top:4px;">${p.title}</div>
                ${key === profileKey ? '<div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">← You</div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;gap:var(--space-4);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary btn-lg" onclick="window.history.back()">← Back to Results</button>
          <button class="btn btn-ghost btn-lg" onclick="window.location.reload()">🔄 Play Again</button>
        </div>
      </div>
    </div>
  `;

  return null;
}
