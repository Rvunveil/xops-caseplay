// =============================================================================
// DEMAND REVEAL PAGE
// =============================================================================

import { clientState, formatCurrency, formatCurrencyFull } from '../app.js';

const PRODUCTS = [
  { code: 'A', name: 'Alpine',   emoji: '🏔️', color: '#00d4aa' },
  { code: 'B', name: 'Blizzard', emoji: '❄️',  color: '#74b9ff' },
  { code: 'C', name: 'Cascade',  emoji: '🌊', color: '#fdcb6e' },
  { code: 'D', name: 'Drift',    emoji: '🌪️', color: '#e17055' },
  { code: 'E', name: 'Eclipse',  emoji: '⚡',  color: '#a29bfe' }
];

export function renderDemandReveal(container) {
  const gs = clientState.gameState;
  const demands = gs?.actualDemands || {};
  const myTeam = gs?.teams?.[clientState.teamId];

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          <span class="badge badge-danger" style="animation:pulse 1s ease infinite;">MARKET CLOSED</span>
        </div>
      </div>

      <div class="page-content">
        <div class="text-center mb-8 fade-in">
          <div class="card-title mb-3" style="color:var(--red);">SEASON OVER</div>
          <h1 class="section-title" style="font-size:clamp(2rem,6vw,4rem);">
            📦 THE MARKET HAS SPOKEN
          </h1>
          <p style="color:var(--text-muted);margin-top:var(--space-3);">
            Actual demand is revealed. Let's see how your bets paid off.
          </p>
        </div>

        <!-- Demand cards reveal one by one -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
          ${PRODUCTS.map((p, i) => `
            <div id="demand-card-${p.code}"
              style="opacity:0;transform:scale(0.5);transition:all 0.7s cubic-bezier(0.34,1.56,0.64,1);
                text-align:center;background:var(--bg-card);border:1px solid ${p.color}33;
                border-radius:var(--radius-xl);padding:var(--space-6);">
              <div style="font-size:2.5rem;margin-bottom:var(--space-3);">${p.emoji}</div>
              <div style="font-weight:700;margin-bottom:var(--space-2);">${p.name}</div>
              <div id="demand-num-${p.code}"
                style="font-family:var(--font-mono);font-size:3rem;font-weight:900;color:${p.color};line-height:1;">
                ?
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:var(--space-2);">units demanded</div>
            </div>
          `).join('')}
        </div>

        <!-- Team P&L breakdown (if available) -->
        ${myTeam?.pnl ? renderTeamPnL(myTeam, demands) : ''}

        <div style="text-align:center;margin-top:var(--space-8);color:var(--text-dim);font-size:0.85rem;" id="demand-waiting-msg">
          ⏳ Waiting for the host to reveal the winner…
        </div>
      </div>
    </div>
  `;

  // Reveal demand one by one with delay
  PRODUCTS.forEach((p, i) => {
    setTimeout(() => {
      const card = document.getElementById(`demand-card-${p.code}`);
      const numEl = document.getElementById(`demand-num-${p.code}`);
      if (card) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      }

      // Count up animation
      setTimeout(() => {
        if (numEl && demands[p.code] !== undefined) {
          animateCounter(numEl, 0, demands[p.code], 800);
        }
      }, 300);
    }, 600 + i * 900);
  });

  return null;
}

function animateCounter(el, from, to, duration) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + (to - from) * ease);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = to;
  }
  requestAnimationFrame(update);
}

function renderTeamPnL(team, demands) {
  const pnl = team.pnl;
  if (!pnl) return '';

  const isProfit = pnl.totalProfit >= 0;

  return `
    <div class="card card-${isProfit ? 'teal' : 'danger'} mt-6">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-6);">
        <div>
          <div class="card-title mb-2">${team.symbol} ${team.name} — YOUR RESULT</div>
          <div style="font-family:var(--font-mono);font-size:2.5rem;font-weight:900;color:${isProfit ? 'var(--teal)' : 'var(--red)'};">
            ${formatCurrencyFull(pnl.finalCash)}
          </div>
          <div style="color:var(--text-muted);font-size:0.85rem;">Final Company Value</div>
        </div>
        <div style="font-size:3rem;">${isProfit ? '📈' : '📉'}</div>
      </div>

      <!-- P&L breakdown -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3);margin-bottom:var(--space-4);">
        <div style="text-align:center;padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);">
          <div class="stat-label">Revenue</div>
          <div class="mono" style="color:var(--teal);font-weight:700;">${formatCurrency(pnl.totalRevenue)}</div>
        </div>
        <div style="text-align:center;padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);">
          <div class="stat-label">Production Cost</div>
          <div class="mono" style="color:var(--red);font-weight:700;">−${formatCurrency(pnl.totalProductionCost)}</div>
        </div>
        <div style="text-align:center;padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);">
          <div class="stat-label">Salvage</div>
          <div class="mono" style="color:var(--amber);font-weight:700;">+${formatCurrency(pnl.totalSalvage)}</div>
        </div>
        <div style="text-align:center;padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);">
          <div class="stat-label">Stockout Penalty</div>
          <div class="mono" style="color:var(--red);font-weight:700;">−${formatCurrency(pnl.totalPenalty)}</div>
        </div>
      </div>

      <!-- Explain button -->
      <button class="btn btn-ghost" onclick="window.togglePnLBreakdown()">
        📋 Why did we gain/lose money? →
      </button>

      <div id="pnl-breakdown" style="display:none;margin-top:var(--space-4);">
        <div class="divider"></div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Produced</th>
                <th>Demand</th>
                <th>Sold</th>
                <th>Unsold</th>
                <th>Stockout</th>
                <th>Revenue</th>
                <th>Cost</th>
                <th>Salvage</th>
                <th>Penalty</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${PRODUCTS.map(p => {
                const r = pnl.products[p.code];
                if (!r) return '';
                const isGood = r.productProfit >= 0;
                return `
                  <tr>
                    <td>${p.emoji} ${p.name}</td>
                    <td class="mono">${r.totalProduced}</td>
                    <td class="mono" style="color:${p.color};">${demands[p.code] ?? '?'}</td>
                    <td class="mono text-teal">${r.unitsSold}</td>
                    <td class="mono" style="color:${r.unsoldUnits > 0 ? 'var(--amber)' : 'var(--text-muted)'};">${r.unsoldUnits}</td>
                    <td class="mono" style="color:${r.stockout > 0 ? 'var(--red)' : 'var(--text-muted)'};">${r.stockout}</td>
                    <td class="mono text-teal">₹${(r.revenue/1000).toFixed(0)}K</td>
                    <td class="mono text-red">₹${(r.productionCost/1000).toFixed(0)}K</td>
                    <td class="mono">₹${(r.salvage/1000).toFixed(0)}K</td>
                    <td class="mono text-red">₹${(r.penalty/1000).toFixed(0)}K</td>
                    <td class="mono" style="color:${isGood ? 'var(--teal)' : 'var(--red)'};">
                      ${isGood ? '+' : ''}₹${(r.productProfit/1000).toFixed(0)}K
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border);">
                <td colspan="6" style="font-weight:700;">TOTAL</td>
                <td class="mono text-teal font-bold">₹${(pnl.totalRevenue/1000).toFixed(0)}K</td>
                <td class="mono text-red font-bold">₹${(pnl.totalProductionCost/1000).toFixed(0)}K</td>
                <td class="mono font-bold">₹${(pnl.totalSalvage/1000).toFixed(0)}K</td>
                <td class="mono text-red font-bold">₹${(pnl.totalPenalty/1000).toFixed(0)}K</td>
                <td class="mono font-bold" style="color:${isProfit ? 'var(--teal)' : 'var(--red)'};">
                  ${isProfit ? '+' : ''}₹${(pnl.totalProfit/1000).toFixed(0)}K
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="card mt-4" style="background:var(--bg-elevated);">
          <div style="font-weight:700;margin-bottom:var(--space-3);">📊 How is your score calculated?</div>
          <div class="mono" style="font-size:0.85rem;color:var(--text-secondary);line-height:2;">
            Starting Capital: ₹10,00,000<br>
            + Revenue (units sold × ₹30K) = <span class="text-teal">+${formatCurrency(pnl.totalRevenue)}</span><br>
            + Salvage (unsold × ₹5K) = <span style="color:var(--amber);">+${formatCurrency(pnl.totalSalvage)}</span><br>
            − Production Cost = <span class="text-red">−${formatCurrency(pnl.totalProductionCost)}</span><br>
            − Stockout Penalty = <span class="text-red">−${formatCurrency(pnl.totalPenalty)}</span><br>
            <strong>= Final Company Value: ${formatCurrencyFull(pnl.finalCash)}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.togglePnLBreakdown = function() {
  const el = document.getElementById('pnl-breakdown');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
