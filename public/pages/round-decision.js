// =============================================================================
// ROUND DECISION PAGE — Handles Rounds 1, 2, 3, and 4
// =============================================================================

import { clientState, sendWS, showToast, formatCurrency, renderRiskBar, startTimer } from '../app.js';

const PRODUCTS = [
  { code: 'A', name: 'Alpine',   emoji: '🏔️', mean: 21, min: 15, max: 28, risk: 'LOW',       riskLevel: 1, color: '#00d4aa' },
  { code: 'B', name: 'Blizzard', emoji: '❄️',  mean: 19, min: 12, max: 26, risk: 'LOW',       riskLevel: 1, color: '#74b9ff' },
  { code: 'C', name: 'Cascade',  emoji: '🌊', mean: 20, min: 8,  max: 32, risk: 'MEDIUM',    riskLevel: 2, color: '#fdcb6e' },
  { code: 'D', name: 'Drift',    emoji: '🌪️', mean: 20, min: 4,  max: 38, risk: 'HIGH',      riskLevel: 3, color: '#e17055' },
  { code: 'E', name: 'Eclipse',  emoji: '⚡',  mean: 20, min: 0,  max: 45, risk: 'VERY HIGH', riskLevel: 4, color: '#a29bfe' }
];

const ROUND_INFO = {
  1: {
    title: 'THE BLIND BET',
    subtitle: 'Commit your Mass Factory capacity.',
    description: 'You see historical demand ranges but not actual demand. Allocate 50 Mass Factory units wisely.',
    capacity: 50,
    type: 'mass',
    duration: 7 * 60,
    maxSinglePct: 0.40,
    icon: '🏭',
    costPerUnit: 10000
  },
  2: {
    title: 'THE TRADE SHOW',
    subtitle: 'You have new market signals. Use your Agile Factory capacity.',
    description: 'Trade show signals have arrived. Allocate some of your Agile Factory units. Save some for later!',
    type: 'agile',
    duration: 7 * 60,
    icon: '📡',
    costPerUnit: 15000
  },
  3: {
    title: 'MARKET SHIFT',
    subtitle: 'A market event has occurred. Reallocate remaining Agile capacity.',
    description: 'The market shifted. Use your remaining flexible capacity to respond.',
    type: 'agile',
    duration: 7 * 60,
    icon: '⚡',
    costPerUnit: 15000
  },
  4: {
    title: 'THE LAST BET',
    subtitle: 'Final round. Use remaining Agile and Emergency sourcing.',
    description: 'Last chance. Use any remaining Agile capacity plus Emergency sourcing (expensive!). Every unit counts.',
    type: 'final',
    duration: 8 * 60,
    icon: '🎯',
    costPerUnit: 15000
  }
};

const ECON = { MASS_COST: 10000, AGILE_COST: 15000, EMERGENCY_COST: 20000, SELLING_PRICE: 30000, SALVAGE: 5000, PENALTY: 5000 };

export function renderRoundDecision(container, { round } = {}) {
  const gs = clientState.gameState;
  const team = gs?.teams?.[clientState.teamId];
  const info = ROUND_INFO[round];

  if (!gs || !team || !info) {
    container.innerHTML = '<div class="page-content"><p class="text-muted">Loading…</p></div>';
    return null;
  }

  const agileRemaining = 50 - (team.agileUsed || 0);
  const allocation = {};
  PRODUCTS.forEach(p => { allocation[p.code] = 0; });

  // Calculate costs deducted so far
  const massCost = Object.values(team.massAllocation || {}).reduce((a,b)=>a+b,0) * ECON.MASS_COST;
  const agileCost = (team.agileUsed || 0) * ECON.AGILE_COST;
  const estimatedCash = 1000000 - massCost - agileCost;

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <!-- TOP BAR -->
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          <span style="font-size:0.8rem;color:var(--text-muted);">ROUND ${round}/4</span>
          <span class="timer-display" id="round-timer" style="font-size:1.1rem;"></span>
          <span style="font-size:0.8rem;color:var(--teal);">${team.symbol} ${team.name}</span>
        </div>
      </div>

      <div class="page-content-wide">
        <!-- Round Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-6);">
          <div>
            <div class="card-title mb-2">ROUND ${round} — ${info.title}</div>
            <h1 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;margin-bottom:var(--space-2);">${info.icon} ${info.subtitle}</h1>
            <p style="color:var(--text-muted);font-size:0.9rem;max-width:600px;">${info.description}</p>
          </div>
          <div class="card" style="text-align:right;min-width:200px;">
            <div class="stat-label">Available Cash</div>
            <div class="stat-value text-teal" id="cash-display">${formatCurrency(estimatedCash)}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">estimated</div>
          </div>
        </div>

        <!-- Market Event Banner (Round 3) -->
        ${round === 3 && gs.currentEvent ? `
          <div class="shock-banner mb-6">
            <div style="font-size:2rem;margin-bottom:var(--space-2);">📰</div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--red);margin-bottom:var(--space-2);">MARKET EVENT</div>
            <div style="font-size:1.3rem;font-weight:700;margin-bottom:var(--space-2);">${gs.currentEvent.title}</div>
            <div style="color:var(--text-secondary);">${gs.currentEvent.headline}</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:var(--space-2);">${gs.currentEvent.description}</div>
          </div>
        ` : ''}

        <!-- Trade Show Signals (Round 2+) -->
        ${round >= 2 && gs.signals ? `
          <div class="card mb-6">
            <div class="card-title mb-4">📡 TRADE SHOW SIGNALS</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3);">
              ${PRODUCTS.map(p => {
                const sig = gs.signals[p.code];
                return sig ? `
                  <div style="text-align:center;padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid ${sig.color}33;">
                    <div style="font-size:1.4rem;">${p.emoji}</div>
                    <div style="font-size:0.8rem;font-weight:600;margin:4px 0;">${p.name}</div>
                    <div style="font-weight:800;font-size:0.85rem;color:${sig.color};">${sig.label}</div>
                  </div>
                ` : '';
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display:grid;grid-template-columns:1fr 320px;gap:var(--space-6);align-items:start;">
          <!-- Product Allocation Table -->
          <div class="card">
            <div class="card-title mb-4">
              ${round === 1 ? '🏭 MASS FACTORY ALLOCATION' :
                round === 4 ? '⚡ AGILE + 🚨 EMERGENCY ALLOCATION' :
                '⚡ AGILE FACTORY ALLOCATION'}
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-4);" id="product-allocations">
              ${PRODUCTS.map(p => renderProductRow(p, round, gs, team)).join('')}
            </div>

            <!-- Capacity meters -->
            <div class="divider"></div>
            ${round === 1 ? renderCapacityMeter('mass', 50) : ''}
            ${round >= 2 && round <= 4 ? renderCapacityMeter('agile', agileRemaining, agileRemaining) : ''}
            ${round === 4 ? renderCapacityMeter('emergency', 10) : ''}
          </div>

          <!-- Right Panel -->
          <div style="display:flex;flex-direction:column;gap:var(--space-4);">
            <!-- Lock Button -->
            <div class="card card-accent">
              <div class="card-title mb-3">READY TO COMMIT?</div>
              <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-4);">
                Once locked, you cannot change your allocation.
              </div>
              <div id="lock-error" class="alert-banner alert-danger" style="display:none;margin-bottom:var(--space-3);font-size:0.85rem;"></div>
              <button class="btn btn-primary btn-lg" style="width:100%;" id="lock-btn" onclick="window.lockRound()">
                🔒 LOCK MY BET
              </button>
            </div>

            <!-- Current Committed -->
            <div class="card">
              <div class="card-title mb-4">CURRENT COMMITTED</div>
              ${PRODUCTS.map(p => {
                const massU = (team.massAllocation || {})[p.code] || 0;
                const agileU = (team.agileAllocation || {})[p.code] || 0;
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
                    <span>${p.emoji} ${p.name}</span>
                    <div style="display:flex;gap:var(--space-3);">
                      ${massU > 0 ? `<span style="color:var(--accent);" title="Mass">🏭${massU}</span>` : ''}
                      ${agileU > 0 ? `<span style="color:var(--teal);" title="Agile">⚡${agileU}</span>` : ''}
                      ${(massU + agileU) === 0 ? `<span style="color:var(--text-dim);">—</span>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Economics Quick Ref -->
            <div class="card">
              <div class="card-title mb-3">ECONOMICS</div>
              <div style="display:flex;flex-direction:column;gap:var(--space-2);font-size:0.8rem;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">🏭 Mass Factory</span>
                  <span class="mono">₹10K/unit</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">⚡ Agile Factory</span>
                  <span class="mono">₹15K/unit</span>
                </div>
                ${round === 4 ? `<div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--red);">🚨 Emergency</span>
                  <span class="mono text-red">₹20K/unit</span>
                </div>` : ''}
                <div class="divider" style="margin:var(--space-2) 0;"></div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">💰 Selling Price</span>
                  <span class="mono text-teal">₹30K/unit</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--text-muted);">📦 Salvage Value</span>
                  <span class="mono">₹5K/unit</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--red);">⚠️ Stockout Penalty</span>
                  <span class="mono text-red">₹5K/unit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Start timer
  const timerEl = document.getElementById('round-timer');
  if (timerEl && gs.roundStartedAt) {
    const elapsed = Math.floor((Date.now() - gs.roundStartedAt) / 1000);
    const remaining = Math.max(0, info.duration - elapsed);
    startTimer(timerEl, remaining, null, null);
  }

  // Wire up number inputs
  PRODUCTS.forEach(p => {
    allocation[p.code] = 0;
    wireInput(p.code, 'mass', allocation);
    wireInput(p.code, 'agile', allocation);
    wireInput(p.code, 'emergency', allocation);
  });

  window.lockRound = () => {
    const errEl = document.getElementById('lock-error');
    errEl.style.display = 'none';

    if (round === 1) {
      const massAlloc = {};
      PRODUCTS.forEach(p => { massAlloc[p.code] = parseInt(document.getElementById(`mass-${p.code}`)?.value || '0') || 0; });
      const total = Object.values(massAlloc).reduce((a,b)=>a+b,0);
      const maxSingle = 50 * 0.40; // 20
      const overLimit = PRODUCTS.filter(p => massAlloc[p.code] > maxSingle);
      if (total > 50) { errEl.textContent = `Total (${total}) exceeds 50 units capacity.`; errEl.style.display = 'flex'; return; }
      if (overLimit.length > 0) { errEl.textContent = `Max 20 units per product (40% rule). Check: ${overLimit.map(p=>p.name).join(', ')}.`; errEl.style.display = 'flex'; return; }
      sendWS('SUBMIT_ROUND1', { allocation: massAlloc });
    } else if (round === 2) {
      const agileAlloc = {};
      PRODUCTS.forEach(p => { agileAlloc[p.code] = parseInt(document.getElementById(`agile-${p.code}`)?.value || '0') || 0; });
      const total = Object.values(agileAlloc).reduce((a,b)=>a+b,0);
      if (total > agileRemaining) { errEl.textContent = `You only have ${agileRemaining} agile units remaining.`; errEl.style.display = 'flex'; return; }
      sendWS('SUBMIT_ROUND2', { allocation: agileAlloc });
    } else if (round === 3) {
      const agileAlloc = {};
      PRODUCTS.forEach(p => { agileAlloc[p.code] = parseInt(document.getElementById(`agile-${p.code}`)?.value || '0') || 0; });
      const total = Object.values(agileAlloc).reduce((a,b)=>a+b,0);
      if (total > agileRemaining) { errEl.textContent = `You only have ${agileRemaining} agile units remaining.`; errEl.style.display = 'flex'; return; }
      sendWS('SUBMIT_ROUND3', { allocation: agileAlloc });
    } else if (round === 4) {
      const agileAlloc = {};
      const emergencyAlloc = {};
      PRODUCTS.forEach(p => {
        agileAlloc[p.code] = parseInt(document.getElementById(`agile-${p.code}`)?.value || '0') || 0;
        emergencyAlloc[p.code] = parseInt(document.getElementById(`emergency-${p.code}`)?.value || '0') || 0;
      });
      const agileTotal = Object.values(agileAlloc).reduce((a,b)=>a+b,0);
      const emergencyTotal = Object.values(emergencyAlloc).reduce((a,b)=>a+b,0);
      if (agileTotal > agileRemaining) { errEl.textContent = `You only have ${agileRemaining} agile units remaining.`; errEl.style.display = 'flex'; return; }
      if (emergencyTotal > 10) { errEl.textContent = `Max 10 emergency units allowed.`; errEl.style.display = 'flex'; return; }
      sendWS('SUBMIT_ROUND4', { agileAllocation: agileAlloc, emergencyAllocation: emergencyAlloc });
    }

    document.getElementById('lock-btn').textContent = '⏳ Submitting…';
    document.getElementById('lock-btn').disabled = true;
  };

  return null;
}

function renderProductRow(product, round, gs, team) {
  const sig = gs.signals?.[product.code];
  const riskBadgeClass = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', 'VERY HIGH': 'badge-veryhigh' }[product.risk];
  const showMass = round === 1;
  const showAgile = round >= 2;
  const showEmergency = round === 4;

  return `
    <div class="product-card" style="border-color:${product.color}33;">
      <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
        <span style="font-size:2rem;">${product.emoji}</span>
        <div style="flex:1;min-width:150px;">
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
            <span style="font-weight:700;font-size:1.05rem;">${product.name}</span>
            <span class="badge ${riskBadgeClass}">${product.risk}</span>
            ${sig ? `<span style="font-size:0.8rem;font-weight:700;color:${sig.color};">● ${sig.label}</span>` : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
            Expected: ${product.min}–${product.max} units
          </div>
          <div style="margin-top:var(--space-2);">
            ${renderRiskBar(product.riskLevel, product.color)}
          </div>
        </div>

        <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;">
          ${showMass ? `
            <div style="text-align:center;">
              <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Mass (₹10K)</div>
              <div class="number-input-wrap">
                <button class="num-btn" onclick="window.adjustNum('mass-${product.code}', -1, 0, 20)">−</button>
                <input class="num-input" id="mass-${product.code}" type="number" value="0" min="0" max="20"
                  onchange="window.updateCapMeter()">
                <button class="num-btn" onclick="window.adjustNum('mass-${product.code}', 1, 0, 20)">+</button>
              </div>
            </div>
          ` : ''}

          ${showAgile ? `
            <div style="text-align:center;">
              <div style="font-size:0.65rem;color:var(--teal);text-transform:uppercase;margin-bottom:4px;">Agile (₹15K)</div>
              <div class="number-input-wrap">
                <button class="num-btn" onclick="window.adjustNum('agile-${product.code}', -1, 0, 50)">−</button>
                <input class="num-input" id="agile-${product.code}" type="number" value="0" min="0" max="50"
                  onchange="window.updateCapMeter()">
                <button class="num-btn" onclick="window.adjustNum('agile-${product.code}', 1, 0, 50)">+</button>
              </div>
            </div>
          ` : ''}

          ${showEmergency ? `
            <div style="text-align:center;">
              <div style="font-size:0.65rem;color:var(--red);text-transform:uppercase;margin-bottom:4px;">Emergency (₹20K)</div>
              <div class="number-input-wrap">
                <button class="num-btn" onclick="window.adjustNum('emergency-${product.code}', -1, 0, 10)">−</button>
                <input class="num-input" id="emergency-${product.code}" type="number" value="0" min="0" max="10"
                  onchange="window.updateCapMeter()">
                <button class="num-btn" onclick="window.adjustNum('emergency-${product.code}', 1, 0, 10)">+</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderCapacityMeter(type, maxCap, remaining) {
  const colors = { mass: 'accent', agile: 'teal', emergency: 'red' };
  const labels = { mass: '🏭 Mass Capacity', agile: '⚡ Agile Remaining', emergency: '🚨 Emergency Capacity' };
  const cap = remaining !== undefined ? remaining : maxCap;

  return `
    <div style="margin-top:var(--space-4);">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:var(--space-2);">
        <span style="color:var(--text-muted);">${labels[type]}</span>
        <span class="mono" id="${type}-cap-text">0 / ${cap} units</span>
      </div>
      <div class="capacity-bar-wrap">
        <div class="capacity-bar-fill ${colors[type]}" id="${type}-cap-bar" style="width:0%;"></div>
      </div>
    </div>
  `;
}

function wireInput(productCode, type, allocation) {
  const el = document.getElementById(`${type}-${productCode}`);
  if (!el) return;
  el.addEventListener('input', () => window.updateCapMeter());
}

window.adjustNum = function(id, delta, min, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const val = Math.max(min, Math.min(max, (parseInt(el.value) || 0) + delta));
  el.value = val;
  window.updateCapMeter();
};

window.updateCapMeter = function() {
  // Mass
  let massTotal = 0;
  PRODUCTS.forEach(p => { massTotal += parseInt(document.getElementById(`mass-${p.code}`)?.value || '0') || 0; });
  const massBar = document.getElementById('mass-cap-bar');
  const massText = document.getElementById('mass-cap-text');
  if (massBar) {
    const pct = Math.min(100, (massTotal / 50) * 100);
    massBar.style.width = pct + '%';
    massBar.className = `capacity-bar-fill ${pct > 100 ? 'over' : 'accent'}`;
  }
  if (massText) massText.textContent = `${massTotal} / 50 units`;

  // Agile
  const gs = clientState.gameState;
  const team = gs?.teams?.[clientState.teamId];
  const agileRemaining = 50 - (team?.agileUsed || 0);
  let agileTotal = 0;
  PRODUCTS.forEach(p => { agileTotal += parseInt(document.getElementById(`agile-${p.code}`)?.value || '0') || 0; });
  const agileBar = document.getElementById('agile-cap-bar');
  const agileText = document.getElementById('agile-cap-text');
  if (agileBar) {
    const pct = Math.min(100, (agileTotal / agileRemaining) * 100);
    agileBar.style.width = pct + '%';
    agileBar.className = `capacity-bar-fill ${pct > 100 ? 'over' : 'teal'}`;
  }
  if (agileText) agileText.textContent = `${agileTotal} / ${agileRemaining} units`;

  // Emergency
  let emTotal = 0;
  PRODUCTS.forEach(p => { emTotal += parseInt(document.getElementById(`emergency-${p.code}`)?.value || '0') || 0; });
  const emBar = document.getElementById('emergency-cap-bar');
  const emText = document.getElementById('emergency-cap-text');
  if (emBar) {
    const pct = Math.min(100, (emTotal / 10) * 100);
    emBar.style.width = pct + '%';
    emBar.className = `capacity-bar-fill ${pct > 100 ? 'over' : 'red'}`;
  }
  if (emText) emText.textContent = `${emTotal} / 10 units`;
};
