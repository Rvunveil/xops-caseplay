// =============================================================================
// WAITING / LOCKED PAGE
// =============================================================================

import { clientState } from '../app.js';

const PRODUCTS = [
  { code: 'A', name: 'Alpine',   emoji: '🏔️', risk: 'LOW',       cv: '±15%',  color: '#00d4aa', desc: 'Classic heavy parka. Steady, reliable demand.' },
  { code: 'B', name: 'Blizzard', emoji: '❄️',  risk: 'LOW',       cv: '±18%',  color: '#74b9ff', desc: 'Insulated jacket. Consistent bestseller.' },
  { code: 'C', name: 'Cascade',  emoji: '🌊',  risk: 'MEDIUM',    cv: '±30%',  color: '#fdcb6e', desc: 'Layered shell. Moderate demand swings.' },
  { code: 'D', name: 'Drift',    emoji: '🌪️',  risk: 'HIGH',      cv: '±45%',  color: '#e17055', desc: 'Fashion-forward down jacket. Volatile.' },
  { code: 'E', name: 'Eclipse',  emoji: '⚡',  risk: 'VERY HIGH', cv: '±65%',  color: '#a29bfe', desc: 'Trendsetter limited edition. Extreme uncertainty.' },
];

export function renderWaiting(container, { message = 'Waiting…', icon = '⏳', sub = '' } = {}) {
  const gs = clientState.gameState;
  const teams = gs ? Object.values(gs.teams) : [];
  const round = gs?.round || 0;
  const submitted = gs ? teams.filter(t => t.submittedRounds?.includes(round)).length : 0;
  const isLobby = gs?.status === 'LOBBY';

  if (isLobby) {
    // ─── MISSION BRIEFING (Lobby) ───────────────────────────────────────────
    container.innerHTML = `
      <div class="page" style="background:var(--bg-deep);overflow-y:auto;">
        <div class="top-bar">
          <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
          <div class="top-bar-info">
            ${gs ? `<span style="color:var(--text-muted)">Game: <span class="mono" style="color:var(--accent)">${gs.gameId}</span></span>` : ''}
            <span class="badge badge-medium" style="animation:pulse 2s ease infinite;">● LOBBY — Waiting for host…</span>
          </div>
        </div>

        <div class="page-content" style="max-width:860px;padding:var(--space-8) var(--space-6);">

          <!-- HEADLINE -->
          <div class="fade-in" style="text-align:center;margin-bottom:var(--space-10);">
            <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.15em;color:var(--accent);margin-bottom:var(--space-3);text-transform:uppercase;">
              X-OPS CASEPLAY · XIME Chennai Operations Club
            </div>
            <h1 style="font-size:2.4rem;font-weight:900;line-height:1.1;margin-bottom:var(--space-4);">
              THE OBERMEYER GAMBIT
            </h1>
            <p style="color:var(--text-muted);font-size:1.1rem;max-width:600px;margin:0 auto;">
              You run a fashion company. One season. Limited capacity. Unknown demand. Make your bets. Beat every other team.
            </p>
          </div>

          <!-- YOUR SITUATION -->
          <div class="card fade-in" style="margin-bottom:var(--space-6);border-left:3px solid var(--accent);">
            <div class="card-title mb-4">📋 YOUR SITUATION</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-4);">
              <div style="text-align:center;padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);">
                <div style="font-size:1.8rem;font-weight:900;color:var(--teal);">₹10,00,000</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.1em;">Starting Capital</div>
              </div>
              <div style="text-align:center;padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);">
                <div style="font-size:1.8rem;font-weight:900;color:var(--accent);">4</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.1em;">Rounds to Play</div>
              </div>
              <div style="text-align:center;padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);">
                <div style="font-size:1.8rem;font-weight:900;color:var(--text-primary);">5</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.1em;">Products to Bet On</div>
              </div>
              <div style="text-align:center;padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);">
                <div style="font-size:1.8rem;font-weight:900;color:var(--red);">?</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.1em;">Actual Demand — Unknown</div>
              </div>
            </div>
          </div>

          <!-- PRODUCTS -->
          <div class="card fade-in" style="margin-bottom:var(--space-6);">
            <div class="card-title mb-2">🧥 THE 5 PRODUCTS YOU SELL</div>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:var(--space-4);">Each product sells for <strong>₹30,000</strong>. Costs differ by factory. Unsold stock salvages at ₹5,000. Stockouts (demand you can't fill) cost you ₹5,000 in lost goodwill per unit.</p>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);">
              ${PRODUCTS.map(p => `
                <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);border-left:3px solid ${p.color};">
                  <div style="font-size:1.8rem;min-width:40px;text-align:center;">${p.emoji}</div>
                  <div style="flex:1;">
                    <div style="font-weight:700;">${p.name} <span style="font-family:var(--font-mono);color:var(--text-dim);font-size:0.75rem;">[${p.code}]</span></div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${p.desc}</div>
                  </div>
                  <div style="text-align:right;min-width:90px;">
                    <div style="font-size:0.7rem;font-weight:700;color:${p.color};letter-spacing:0.08em;">${p.risk}</div>
                    <div style="font-size:0.75rem;color:var(--text-dim);">demand swing ${p.cv}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- HOW YOU MAKE MONEY -->
          <div class="card fade-in" style="margin-bottom:var(--space-6);">
            <div class="card-title mb-4">💰 HOW YOU MAKE (OR LOSE) MONEY</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--space-4);">
              <div style="padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);border-top:2px solid var(--teal);">
                <div style="font-weight:700;margin-bottom:var(--space-2);">🏭 Mass Factory</div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Cost: <strong style="color:var(--teal);">₹10,000/unit</strong></div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Capacity: 50 units total</div>
                <div style="font-size:0.8rem;color:var(--text-dim);margin-top:var(--space-2);">Committed in Rounds 1. Max 40% on any single product.</div>
              </div>
              <div style="padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);border-top:2px solid var(--accent);">
                <div style="font-weight:700;margin-bottom:var(--space-2);">⚡ Agile Factory</div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Cost: <strong style="color:var(--accent);">₹15,000/unit</strong></div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Capacity: 50 units total</div>
                <div style="font-size:0.8rem;color:var(--text-dim);margin-top:var(--space-2);">Available in Round 2 & 3. You decide how much to use each round.</div>
              </div>
              <div style="padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);border-top:2px solid var(--red);">
                <div style="font-weight:700;margin-bottom:var(--space-2);">🚨 Emergency Sourcing</div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Cost: <strong style="color:var(--red);">₹20,000/unit</strong></div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Max: 10 units total</div>
                <div style="font-size:0.8rem;color:var(--text-dim);margin-top:var(--space-2);">Last resort in Round 4. Expensive. But sometimes the only move.</div>
              </div>
              <div style="padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);border-top:2px solid var(--text-dim);">
                <div style="font-weight:700;margin-bottom:var(--space-2);">📦 Sell Price</div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Revenue: <strong style="color:var(--text-primary);">₹30,000/unit</strong></div>
                <div style="font-size:0.85rem;color:var(--text-muted);">Salvage (unsold): ₹5,000</div>
                <div style="font-size:0.8rem;color:var(--text-dim);margin-top:var(--space-2);">Stockout penalty: ₹5,000 per unit of unmet demand.</div>
              </div>
            </div>
          </div>

          <!-- GAME STRUCTURE -->
          <div class="card fade-in" style="margin-bottom:var(--space-6);">
            <div class="card-title mb-4">🗺️ HOW THE GAME PLAYS OUT</div>
            <div style="display:flex;flex-direction:column;gap:0;">
              ${[
                ['1','🏭 Round 1 — Mass Factory Bet','Before the trade show. No information. Commit up to 50 units across products using the Mass Factory. 40% max on any single product.','var(--teal)'],
                ['2','📡 Signal Reveal — Trade Show','You get signals (WEAK → TRENDING 🔥) for each product. Are they reliable? That\'s for you to decide.','var(--accent)'],
                ['3','⚡ Round 2 — Agile Allocation','Now you can react. Use some of your 50 Agile units. But save some — you may need them in Round 3.','var(--accent)'],
                ['4','📊 Mid-Game Leaderboard','See where every team stands. The game is not over.','var(--text-muted)'],
                ['5','⚡ Market Shock — Round 3','A random market event changes demand. Celebrity? Cold snap? Price war? You get one more agile adjustment.','var(--red)'],
                ['6','🎯 Round 4 — Final Move','Last chance. Emergency sourcing available at double cost. Commit your final strategy.','var(--red)'],
                ['7','📦 Demand Reveal','Actual demand is revealed. Revenue, costs, salvage, and penalties are calculated. Scores are final.','var(--text-primary)'],
                ['8','🏆 Winner','Highest final cash wins. Simple.','var(--teal)'],
              ].map(([n, title, desc, color], i) => `
                <div style="display:flex;gap:var(--space-4);padding:var(--space-4) 0;${i > 0 ? 'border-top:1px solid var(--border);' : ''}">
                  <div style="width:28px;height:28px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:${color};flex-shrink:0;margin-top:2px;">${n}</div>
                  <div>
                    <div style="font-weight:700;margin-bottom:4px;">${title}</div>
                    <div style="font-size:0.85rem;color:var(--text-muted);">${desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- WHO'S IN -->
          ${teams.length > 0 ? `
            <div class="card fade-in" style="margin-bottom:var(--space-6);" id="lobby-teams">
              <div class="card-title mb-4">👥 TEAMS IN THE LOBBY</div>
              <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
                ${teams.map(t => `
                  <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);
                    background:var(--bg-elevated);border-radius:var(--radius-pill);border:1px solid var(--border);">
                    <span>${t.symbol || '⭐'}</span>
                    <span style="font-weight:600;">${t.name}</span>
                    <span style="width:6px;height:6px;border-radius:50%;background:${t.isConnected ? 'var(--teal)' : 'var(--text-dim)'}"></span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- WAITING PULSE -->
          <div style="text-align:center;padding:var(--space-6);" class="fade-in">
            <div style="font-size:2rem;margin-bottom:var(--space-3);animation:pulse 2s ease infinite;">⏳</div>
            <div style="font-weight:700;margin-bottom:var(--space-2);">Waiting for host to start the game…</div>
            <div style="color:var(--text-dim);font-size:0.85rem;">Read the rules above. You have one season. Make it count.</div>
          </div>

        </div>
      </div>
    `;

    return (newState) => {
      if (!newState) return;
      const lobbyTeams = document.getElementById('lobby-teams');
      if (lobbyTeams) {
        const ts = Object.values(newState.teams);
        lobbyTeams.innerHTML = `
          <div class="card-title mb-4">👥 TEAMS IN THE LOBBY</div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
            ${ts.map(t => `
              <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);
                background:var(--bg-elevated);border-radius:var(--radius-pill);border:1px solid var(--border);">
                <span>${t.symbol || '⭐'}</span>
                <span style="font-weight:600;">${t.name}</span>
                <span style="width:6px;height:6px;border-radius:50%;background:${t.isConnected ? 'var(--teal)' : 'var(--text-dim)'}"></span>
              </div>
            `).join('')}
          </div>
        `;
      }
    };
  }

  // ─── MID-GAME WAITING (after submitting, waiting for other teams) ───────────
  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info">
          ${gs ? `<span style="color:var(--text-muted)">Round ${gs.round} / 4</span>` : ''}
          ${gs ? `<span style="color:var(--text-muted)">Game: <span class="mono" style="color:var(--accent)">${gs.gameId}</span></span>` : ''}
        </div>
      </div>

      <div class="page-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 60px);text-align:center;">
        <div class="fade-in" style="max-width:500px;width:100%;">
          <div style="font-size:5rem;margin-bottom:var(--space-6);animation:pulse 2s ease infinite;">${icon}</div>

          <h1 class="section-title mb-4">${message}</h1>
          ${sub ? `<p style="color:var(--text-muted);margin-bottom:var(--space-8);">${sub}</p>` : ''}

          ${round > 0 && teams.length > 0 ? `
            <div class="card mb-6" style="text-align:left;">
              <div class="card-title mb-4">TEAM STATUS</div>
              <div style="display:flex;flex-direction:column;gap:var(--space-2);" id="team-status-list">
                ${teams.map(t => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;align-items:center;gap:var(--space-3);">
                      <span>${t.symbol || '⭐'}</span>
                      <span style="font-weight:600;">${t.name}</span>
                      ${!t.isConnected ? '<span class="badge badge-medium">OFFLINE</span>' : ''}
                    </div>
                    <div>
                      ${t.submittedRounds?.includes(round)
                        ? '<span class="badge badge-low">✓ LOCKED</span>'
                        : '<span style="color:var(--text-dim);font-size:0.8rem;">Deciding…</span>'}
                    </div>
                  </div>
                `).join('')}
              </div>
              <div style="margin-top:var(--space-4);font-size:0.85rem;color:var(--text-muted);">
                ${submitted} / ${teams.length} teams submitted
              </div>
            </div>
          ` : ''}

          <div style="color:var(--text-dim);font-size:0.85rem;">
            Waiting for the host to advance the game…
          </div>
        </div>
      </div>
    </div>
  `;

  return (newState) => {
    const list = document.getElementById('team-status-list');
    if (!list || !newState) return;
    const ts = Object.values(newState.teams);
    const r = newState.round;
    list.innerHTML = ts.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span>${t.symbol || '⭐'}</span>
          <span style="font-weight:600;">${t.name}</span>
          ${!t.isConnected ? '<span class="badge badge-medium">OFFLINE</span>' : ''}
        </div>
        <div>
          ${t.submittedRounds?.includes(r)
            ? '<span class="badge badge-low">✓ LOCKED</span>'
            : '<span style="color:var(--text-dim);font-size:0.8rem;">Deciding…</span>'}
        </div>
      </div>
    `).join('');
  };
}
