// =============================================================================
// SIMULATION LAB — 1,000-Game Strategy Balancer
// Runs entirely in the browser using the same game-engine logic
// =============================================================================

import { navigate, formatCurrency } from '../app.js';

// ─── MINI PRNG (mulberry32) ───────────────────────────────────────────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seedFromStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { code: 'A', name: 'Alpine',   mean: 21, min: 15, max: 28 },
  { code: 'B', name: 'Blizzard', mean: 19, min: 12, max: 26 },
  { code: 'C', name: 'Cascade',  mean: 20, min: 8,  max: 32 },
  { code: 'D', name: 'Drift',    mean: 20, min: 4,  max: 38 },
  { code: 'E', name: 'Eclipse',  mean: 20, min: 0,  max: 45 }
];

const EVENTS = [
  { id: 'celebrity', effects: { E: 1.35, D: 1.20 } },
  { id: 'warm_winter', effects: { A: 0.70, B: 0.75, C: 0.88 } },
  { id: 'competitor', effects: { A: 0.88, B: 0.88, C: 0.90, D: 0.92, E: 0.92 } },
  { id: 'viral', effects: { E: 1.50, D: 1.15 } },
  { id: 'cold_snap', effects: { A: 1.28, B: 1.22, C: 1.15, D: 1.08, E: 1.05 } },
  { id: 'retail_drop', effects: { C: 0.65, D: 0.72 } },
  { id: 'sustainability', effects: { D: 1.25, E: 1.30, C: 1.10 } },
  { id: 'boom', effects: { A: 1.15, B: 1.12, C: 1.18, D: 1.20, E: 1.22 } }
];

const ECON = {
  SELL: 30000, MASS: 10000, AGILE: 15000, EMERGENCY: 20000,
  SALVAGE: 5000, PENALTY: 5000, START: 1000000
};

// ─── STRATEGIES ──────────────────────────────────────────────────────────────
const STRATEGIES = [
  {
    name: 'Equal Allocation',
    id: 'equal',
    color: '#74b9ff',
    desc: 'Spread capacity equally across all products. 10 mass + 10 agile each.',
    allocate: (demands, signals, event) => ({
      mass: { A:10, B:10, C:10, D:10, E:10 },
      agile: { A:6, B:6, C:6, D:16, E:16 },
      emergency: { A:0, B:0, C:0, D:0, E:0 }
    })
  },
  {
    name: 'Always Mass (Conservative)',
    id: 'mass',
    color: '#fdcb6e',
    desc: 'Commit everything to cheap Mass Factory. Equal spread across products.',
    allocate: (demands, signals, event) => ({
      mass: { A:15, B:14, C:11, D:6, E:4 }, // skewed to safer products
      agile: { A:0, B:0, C:5, D:5, E:5 },
      emergency: { A:0, B:0, C:0, D:0, E:0 }
    })
  },
  {
    name: 'Always Agile',
    id: 'agile',
    color: '#6c63ff',
    desc: 'Avoid committing in Round 1. Use almost all Agile capacity.',
    allocate: (demands, signals, event) => ({
      mass: { A:5, B:5, C:5, D:5, E:5 }, // minimal mass
      agile: { A:5, B:5, C:10, D:15, E:15 },
      emergency: { A:0, B:0, C:0, D:0, E:0 }
    })
  },
  {
    name: 'Aggressive',
    id: 'aggressive',
    color: '#ff4757',
    desc: 'Go heavy on high-risk products (Drift, Eclipse). Max risk/reward.',
    allocate: (demands, signals, event) => ({
      mass: { A:5, B:5, C:10, D:15, E:15 }, // max to risky products
      agile: { A:2, B:2, C:6, D:20, E:20 },
      emergency: { A:0, B:0, C:0, D:2, E:2 }
    })
  },
  {
    name: 'Conservative',
    id: 'conservative',
    color: '#00d4aa',
    desc: 'Focus on low-risk products (Alpine, Blizzard). Safe and steady.',
    allocate: (demands, signals, event) => ({
      mass: { A:18, B:16, C:10, D:4, E:2 },
      agile: { A:10, B:10, C:15, D:8, E:7 },
      emergency: { A:0, B:0, C:0, D:0, E:0 }
    })
  },
  {
    name: 'Accurate Response',
    id: 'accurate',
    color: '#a29bfe',
    desc: 'Commit low-risk products (Alpine, Blizzard) to cheap Mass. Reserve Agile for uncertain products. Adjust based on signals.',
    allocate: (demands, signals, event) => {
      // Use signals to weight agile allocation
      const mass = { A:16, B:14, C:8, D:7, E:5 };
      const agile = { A:3, B:3, C:9, D:17, E:18 };
      // Signal adjustment: shift up to 5 units toward trending products
      if (signals) {
        const ORDER = ['E','D','C','B','A'];
        for (const code of ORDER) {
          const sig = signals[code];
          if (sig && sig.label.includes('TRENDING') && agile[code] < 22) {
            const transfer = Math.min(3, 22 - agile[code]);
            agile[code] += transfer;
            // Take from weakest signal
            for (const code2 of [...ORDER].reverse()) {
              if (agile[code2] >= transfer) { agile[code2] -= transfer; break; }
            }
          }
        }
      }
      return { mass, agile, emergency: { A:0, B:0, C:0, D:0, E:0 } };
    }
  }
];

// ─── SIMULATION ENGINE ────────────────────────────────────────────────────────
function generateDemand(seed, eventEffects = {}) {
  const rng = mulberry32(seedFromStr(seed + '_d'));
  const demands = {};
  PRODUCTS.forEach(p => {
    const avg = (rng() + rng() + rng()) / 3;
    const raw = p.min + avg * (p.max - p.min);
    const mult = eventEffects[p.code] || 1.0;
    demands[p.code] = Math.round(Math.max(0, raw * mult));
  });
  return demands;
}

function generateSignals(seed, demands) {
  const rng = mulberry32(seedFromStr(seed + '_sig'));
  const LABELS = ['WEAK', 'MODERATE', 'STABLE', 'STRONG', 'TRENDING 🔥'];
  const signals = {};
  PRODUCTS.forEach(p => {
    const range = p.max - p.min;
    const norm = (demands[p.code] - p.min) / range;
    const noise = (rng() - 0.5) * 0.5;
    const idx = Math.max(0, Math.min(4, Math.floor((norm + noise) * 5)));
    signals[p.code] = { label: LABELS[idx] };
  });
  return signals;
}

function calcPnL(mass, agile, emergency, demands) {
  let totalRevenue = 0, totalCost = 0, totalSalvage = 0, totalPenalty = 0;
  PRODUCTS.forEach(p => {
    const c = p.code;
    const produced = (mass[c]||0) + (agile[c]||0) + (emergency[c]||0);
    const dem = demands[c];
    const sold = Math.min(produced, dem);
    const unsold = Math.max(0, produced - dem);
    const stockout = Math.max(0, dem - produced);
    totalRevenue += sold * ECON.SELL;
    totalCost += (mass[c]||0) * ECON.MASS + (agile[c]||0) * ECON.AGILE + (emergency[c]||0) * ECON.EMERGENCY;
    totalSalvage += unsold * ECON.SALVAGE;
    totalPenalty += stockout * ECON.PENALTY;
  });
  const profit = totalRevenue + totalSalvage - totalCost - totalPenalty;
  return {
    finalCash: ECON.START + profit,
    profit, totalRevenue, totalCost, totalSalvage, totalPenalty,
    stockout: totalPenalty / ECON.PENALTY
  };
}

function runOneGame(gameIndex) {
  const seed = 'sim_' + gameIndex;
  const rng = mulberry32(seedFromStr(seed));
  const eventIdx = Math.floor(rng() * EVENTS.length);
  const event = EVENTS[eventIdx];

  // Generate pre-event demands for signals
  const preEventDemands = generateDemand(seed);
  const signals = generateSignals(seed, preEventDemands);

  // Final demands with event
  const finalDemands = generateDemand(seed, event.effects);

  const results = {};
  let winnerScore = -Infinity;
  let winnerId = null;

  STRATEGIES.forEach(strategy => {
    const { mass, agile, emergency } = strategy.allocate(finalDemands, signals, event);
    const pnl = calcPnL(mass, agile, emergency, finalDemands);
    results[strategy.id] = pnl;
    if (pnl.finalCash > winnerScore) {
      winnerScore = pnl.finalCash;
      winnerId = strategy.id;
    }
  });

  return { results, winnerId };
}

function runSimulations(n = 1000) {
  const stats = {};
  STRATEGIES.forEach(s => {
    stats[s.id] = {
      wins: 0,
      totalProfit: 0,
      totalStockout: 0,
      totalSalvage: 0,
      profits: []
    };
  });

  for (let i = 0; i < n; i++) {
    const { results, winnerId } = runOneGame(i);
    stats[winnerId].wins++;
    STRATEGIES.forEach(s => {
      const r = results[s.id];
      stats[s.id].totalProfit += r.profit;
      stats[s.id].totalStockout += r.stockout;
      stats[s.id].totalSalvage += r.totalSalvage;
      stats[s.id].profits.push(r.finalCash);
    });
  }

  // Compute averages and variance
  STRATEGIES.forEach(s => {
    const st = stats[s.id];
    st.avgProfit = st.totalProfit / n;
    st.avgFinalCash = ECON.START + st.avgProfit;
    st.winRate = (st.wins / n * 100).toFixed(1);
    st.avgStockout = (st.totalStockout / n).toFixed(1);
    st.avgSalvage = (st.totalSalvage / n).toFixed(0);
    const mean = st.profits.reduce((a,b)=>a+b,0) / n;
    const variance = st.profits.reduce((a,b)=>a+(b-mean)**2,0) / n;
    st.stdDev = Math.sqrt(variance);
  });

  return { stats, n };
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
export function renderSimLab(container) {
  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          <span style="color:var(--accent);">🧪 Simulation Lab</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window.history.back()">← Back</button>
      </div>

      <div class="page-content-wide">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4);margin-bottom:var(--space-8);">
          <div>
            <div class="card-title mb-2">STRATEGY VALIDATION</div>
            <h1 class="section-title">🧪 1,000-Game Simulation</h1>
            <p style="color:var(--text-muted);margin-top:var(--space-3);max-width:600px;">
              Run 1,000 simulated games with all possible market scenarios and events.
              Compares 6 strategies to validate game balance.
            </p>
          </div>
          <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
            <div class="form-group" style="min-width:150px;">
              <label class="form-label">Number of Games</label>
              <select id="sim-count" class="form-input">
                <option value="100">100 games (fast)</option>
                <option value="500">500 games</option>
                <option value="1000" selected>1,000 games</option>
                <option value="5000">5,000 games (slow)</option>
              </select>
            </div>
            <div style="display:flex;align-items:flex-end;">
              <button class="btn btn-primary btn-lg" id="run-sim-btn" onclick="window.runSim()">
                ▶ Run Simulation
              </button>
            </div>
          </div>
        </div>

        <!-- Strategy descriptions -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-3);margin-bottom:var(--space-8);">
          ${STRATEGIES.map(s => `
            <div class="card" style="border-color:${s.color}44;">
              <div style="font-weight:700;color:${s.color};margin-bottom:var(--space-2);">${s.name}</div>
              <p style="color:var(--text-muted);font-size:0.8rem;">${s.desc}</p>
            </div>
          `).join('')}
        </div>

        <!-- Results area -->
        <div id="sim-results" style="display:none;">
          <div class="divider"></div>
          <h2 style="font-weight:800;font-size:1.3rem;margin:var(--space-6) 0;">Results</h2>
          <div id="sim-results-content"></div>
        </div>

        <div id="sim-loading" style="display:none;text-align:center;padding:var(--space-12);">
          <div style="font-size:3rem;margin-bottom:var(--space-4);animation:spin 1s linear infinite;">⚙️</div>
          <div style="color:var(--text-muted);">Running simulations…</div>
          <div id="sim-progress" style="color:var(--accent);font-family:var(--font-mono);margin-top:var(--space-3);">0%</div>
        </div>
      </div>
    </div>
  `;

  window.runSim = () => {
    const n = parseInt(document.getElementById('sim-count').value);
    const btn = document.getElementById('run-sim-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Running…';

    document.getElementById('sim-results').style.display = 'none';
    document.getElementById('sim-loading').style.display = 'block';

    // Run in chunks to keep UI responsive
    setTimeout(() => {
      const { stats } = runSimulations(n);
      displayResults(stats, n);
      btn.disabled = false;
      btn.textContent = '▶ Run Again';
      document.getElementById('sim-loading').style.display = 'none';
      document.getElementById('sim-results').style.display = 'block';
    }, 50);
  };

  return null;
}

function displayResults(stats, n) {
  const container = document.getElementById('sim-results-content');
  if (!container) return;

  // Sort by win rate
  const sorted = [...STRATEGIES].sort((a, b) =>
    parseFloat(stats[b.id].winRate) - parseFloat(stats[a.id].winRate)
  );

  const maxWinRate = parseFloat(sorted[0] ? stats[sorted[0].id].winRate : 100);

  container.innerHTML = `
    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
      ${sorted.map((s, i) => {
        const st = stats[s.id];
        const isWinner = i === 0;
        return `
          <div class="strategy-result-card ${isWinner ? 'winner' : ''}" style="border-color:${isWinner ? s.color : 'var(--border)'};">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
              <div style="font-weight:700;color:${s.color};">${s.name}</div>
              ${isWinner ? '<span class="badge" style="background:rgba(255,165,2,0.2);color:var(--amber);">🏆 BEST</span>' : ''}
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-3);">
              <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:var(--space-2);text-align:center;">
                <div style="font-size:0.65rem;color:var(--text-muted);">WIN RATE</div>
                <div class="mono" style="font-weight:700;font-size:1.1rem;color:${s.color};">${st.winRate}%</div>
              </div>
              <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:var(--space-2);text-align:center;">
                <div style="font-size:0.65rem;color:var(--text-muted);">AVG PROFIT</div>
                <div class="mono" style="font-weight:700;font-size:0.85rem;">${formatCurrency(st.avgFinalCash)}</div>
              </div>
            </div>

            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-2);">Win Rate</div>
            <div class="win-bar">
              <div class="win-bar-fill" style="width:${(parseFloat(st.winRate)/maxWinRate*100).toFixed(1)}%;background:${s.color};"></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-3);font-size:0.75rem;color:var(--text-muted);">
              <div>Avg Stockout: <span class="mono">${st.avgStockout}</span></div>
              <div>Std Dev: <span class="mono">${formatCurrency(Math.round(st.stdDev))}</span></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Detailed table -->
    <div class="card">
      <div class="card-title mb-4">DETAILED COMPARISON — ${n.toLocaleString()} GAMES</div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Strategy</th>
              <th>Win Rate</th>
              <th>Avg Final Cash</th>
              <th>Avg Profit</th>
              <th>Avg Stockout</th>
              <th>Avg Salvage</th>
              <th>Std Dev</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((s, i) => {
              const st = stats[s.id];
              return `
                <tr>
                  <td style="font-weight:700;color:${i===0?'var(--amber)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--text-muted)'};">
                    #${i+1}
                  </td>
                  <td style="font-weight:600;color:${s.color};">${s.name}</td>
                  <td class="mono">${st.winRate}%</td>
                  <td class="mono">${formatCurrency(st.avgFinalCash)}</td>
                  <td class="mono" style="color:${st.avgProfit>=0?'var(--teal)':'var(--red)'};">
                    ${st.avgProfit>=0?'+':''}${formatCurrency(Math.round(st.avgProfit))}
                  </td>
                  <td class="mono">${st.avgStockout} units</td>
                  <td class="mono">${formatCurrency(parseInt(st.avgSalvage))}</td>
                  <td class="mono" style="color:var(--text-muted);">${formatCurrency(Math.round(st.stdDev))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Balance assessment -->
    <div class="card mt-6" style="background:var(--bg-elevated);">
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-4);">📊 Balance Assessment</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${assessBalance(stats, sorted, n)}
      </div>
    </div>
  `;

  // Animate win bars
  setTimeout(() => {
    document.querySelectorAll('.win-bar-fill').forEach(bar => {
      bar.style.transition = 'width 1s ease';
    });
  }, 100);
}

function assessBalance(stats, sorted, n) {
  const items = [];
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const bestWR = parseFloat(stats[best.id].winRate);
  const allWR = sorted.map(s => parseFloat(stats[s.id].winRate));
  const spread = Math.max(...allWR) - Math.min(...allWR);

  if (bestWR < 40) {
    items.push(`✅ <strong>Well balanced:</strong> No strategy dominates. Best win rate is ${bestWR}% (expected ~17% for 6 strategies if truly random).`);
  } else if (bestWR < 60) {
    items.push(`⚠️ <strong>Moderate advantage:</strong> ${best.name} wins ${bestWR}% of games. Some edge, but other strategies can still win.`);
  } else {
    items.push(`❌ <strong>Dominant strategy detected:</strong> ${best.name} wins ${bestWR}% of games. Consider rebalancing.`);
  }

  if (spread > 30) {
    items.push(`⚠️ <strong>High spread:</strong> Win rate difference between best and worst is ${spread.toFixed(1)}%. Some strategies may feel futile.`);
  } else {
    items.push(`✅ <strong>Good spread:</strong> Win rates are within ${spread.toFixed(1)}% of each other. All strategies feel competitive.`);
  }

  const accurateStats = stats['accurate'];
  if (accurateStats) {
    const ar = STRATEGIES.find(s => s.id === 'accurate');
    const arRank = sorted.findIndex(s => s.id === 'accurate') + 1;
    items.push(`📌 <strong>Accurate Response (Rank #${arRank}):</strong> Win rate ${accurateStats.winRate}%, Avg profit ${formatCurrency(Math.round(accurateStats.avgProfit))}. ${arRank <= 2 ? 'Teaching value confirmed: the correct strategy performs well.' : 'Consider tuning parameters if you want this strategy to perform better.'}`);
  }

  items.push(`<span style="color:var(--text-muted);font-size:0.85rem;">Simulated ${n.toLocaleString()} games across all 8 market events. Demand generated using seeded PRNG matching game engine.</span>`);

  return items.map(item => `<div style="font-size:0.9rem;line-height:1.8;">${item}</div>`).join('');
}
