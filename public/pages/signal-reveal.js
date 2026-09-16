// =============================================================================
// SIGNAL REVEAL PAGE
// =============================================================================

import { clientState, renderRiskBar } from '../app.js';

const PRODUCTS = [
  { code: 'A', name: 'Alpine',   emoji: '🏔️', min: 15, max: 28, risk: 'LOW',       riskLevel: 1, color: '#00d4aa' },
  { code: 'B', name: 'Blizzard', emoji: '❄️',  min: 12, max: 26, risk: 'LOW',       riskLevel: 1, color: '#74b9ff' },
  { code: 'C', name: 'Cascade',  emoji: '🌊', min: 8,  max: 32, risk: 'MEDIUM',    riskLevel: 2, color: '#fdcb6e' },
  { code: 'D', name: 'Drift',    emoji: '🌪️', min: 4,  max: 38, risk: 'HIGH',      riskLevel: 3, color: '#e17055' },
  { code: 'E', name: 'Eclipse',  emoji: '⚡',  min: 0,  max: 45, risk: 'VERY HIGH', riskLevel: 4, color: '#a29bfe' }
];

export function renderSignalReveal(container) {
  const gs = clientState.gameState;
  const signals = gs?.signals || {};

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          <span style="color:var(--text-muted);font-size:0.8rem;">Trade Show Signals</span>
        </div>
      </div>

      <div class="page-content">
        <div class="text-center mb-8 fade-in">
          <div class="card-title mb-3" style="color:var(--accent);">MARKET INTELLIGENCE</div>
          <h1 class="section-title">📡 Trade Show Signals Arriving…</h1>
          <p style="color:var(--text-muted);margin-top:var(--space-3);max-width:600px;margin-left:auto;margin-right:auto;">
            These signals narrow your uncertainty — but they're not perfect.
            Trust them wisely. Round 2 opens next.
          </p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);">
          ${PRODUCTS.map((p, i) => {
            const sig = signals[p.code];
            if (!sig) return '';
            return `
              <div class="signal-card" id="signal-card-${p.code}"
                style="opacity:0;transform:scale(0.8) rotateY(90deg);transition:all 0.6s cubic-bezier(0.34,1.56,0.64,1);transition-delay:${i * 0.35}s;">
                <div style="font-size:3rem;margin-bottom:var(--space-3);">${p.emoji}</div>
                <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-2);">${p.name}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:var(--space-4);">${p.min}–${p.max} units range</div>
                <div style="margin-bottom:var(--space-3);">${renderRiskBar(p.riskLevel, p.color)}</div>
                <div class="signal-label" style="color:${sig.color};text-shadow:0 0 20px ${sig.color}40;">
                  ${sig.label}
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:var(--space-2);">
                  ${sig.description}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="card mt-8" style="max-width:700px;margin-left:auto;margin-right:auto;">
          <div style="display:flex;gap:var(--space-6);flex-wrap:wrap;justify-content:center;">
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:1.5rem;">🔥</div>
              <div style="font-weight:700;color:var(--purple);margin:4px 0;">TRENDING</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Demand is surging</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:1.5rem;">💚</div>
              <div style="font-weight:700;color:var(--teal);margin:4px 0;">STRONG</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Above expectations</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:1.5rem;">🔵</div>
              <div style="font-weight:700;color:var(--blue);margin:4px 0;">STABLE</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Tracking to normal</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:1.5rem;">🟡</div>
              <div style="font-weight:700;color:var(--amber);margin:4px 0;">MODERATE</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Below expectations</div>
            </div>
            <div style="text-align:center;flex:1;min-width:120px;">
              <div style="font-size:1.5rem;">🔴</div>
              <div style="font-weight:700;color:var(--red);margin:4px 0;">WEAK</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Demand is soft</div>
            </div>
          </div>
        </div>

        <div style="text-align:center;margin-top:var(--space-8);color:var(--text-dim);font-size:0.85rem;">
          ⏳ Waiting for the host to open Round 2…
        </div>
      </div>
    </div>
  `;

  // Animate cards in sequence
  PRODUCTS.forEach((p, i) => {
    setTimeout(() => {
      const card = document.getElementById(`signal-card-${p.code}`);
      if (card) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1) rotateY(0deg)';
      }
    }, 200 + i * 350);
  });

  return null;
}
