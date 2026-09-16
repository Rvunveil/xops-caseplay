// =============================================================================
// WINNER SCREEN
// =============================================================================

import { clientState, formatCurrencyFull, formatCurrency, navigate } from '../app.js';

export function renderWinner(container) {
  const gs = clientState.gameState;
  const teams = gs ? Object.values(gs.teams).sort((a, b) => (a.rank || 99) - (b.rank || 99)) : [];
  const winner = teams[0];
  const runnerUp = teams.slice(1);

  // Awards
  const awards = computeAwards(teams, gs);

  container.innerHTML = `
    <div class="winner-page">
      <div class="confetti-wrap" id="confetti-wrap"></div>

      <div class="page-content" style="max-width:900px;">
        <!-- Build-up: show ranks 5..2 first -->
        <div id="buildup-section" class="fade-in">
          <div class="card-title text-center mb-8" style="color:var(--amber);letter-spacing:0.2em;">FINAL RESULTS</div>

          ${runnerUp.slice().reverse().map((t, i) => {
            const rank = t.rank;
            const pnl = t.pnl;
            return `
              <div class="leaderboard-row rank-${rank}" id="bu-${t.teamId}"
                style="opacity:0;transition:all 0.6s ease;margin-bottom:var(--space-3);">
                <div class="rank-number">#${rank}</div>
                <div class="rank-team-symbol">${t.symbol || '⭐'}</div>
                <div class="rank-team-name">${t.name}</div>
                <div class="rank-score">${formatCurrency(pnl?.finalCash || t.currentScore || 1000000)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Champion reveal -->
        <div id="champion-section" style="opacity:0;transform:scale(0.8);transition:all 1s cubic-bezier(0.34,1.56,0.64,1);">
          <div style="text-align:center;margin:var(--space-12) 0;">
            <div style="font-size:0.9rem;font-weight:700;letter-spacing:0.25em;color:var(--amber);margin-bottom:var(--space-6);">
              ◆ X-OPS CASEPLAY CHAMPION ◆
            </div>

            <div class="champion-card">
              <div style="font-size:5rem;margin-bottom:var(--space-4);">${winner?.symbol || '🏆'}</div>
              <div style="font-size:clamp(2rem,8vw,4.5rem);font-weight:900;letter-spacing:-0.02em;margin-bottom:var(--space-4);">
                ${winner?.name || 'CHAMPION'}
              </div>

              <div style="font-family:var(--font-mono);font-size:clamp(1.5rem,5vw,3rem);font-weight:700;
                background:var(--grad-teal);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
                margin-bottom:var(--space-6);">
                ${formatCurrencyFull(winner?.pnl?.finalCash || winner?.currentScore || 0)}
              </div>

              <div style="font-size:0.85rem;color:var(--text-muted);">Final Company Value</div>
            </div>
          </div>
        </div>

        <!-- Secondary awards -->
        <div id="awards-section" style="opacity:0;transition:opacity 0.8s ease;">
          <div class="divider"></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
            ${awards.map(a => `
              <div class="card text-center">
                <div style="font-size:2rem;margin-bottom:var(--space-2);">${a.icon}</div>
                <div style="font-weight:700;font-size:0.85rem;color:var(--accent);margin-bottom:var(--space-1);">${a.title}</div>
                <div style="font-weight:600;">${a.team}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${a.reason}</div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex;justify-content:center;gap:var(--space-4);flex-wrap:wrap;">
            <button class="btn btn-primary btn-lg" onclick="window.location.reload()">
              📚 See Case Reveal →
            </button>
            ${clientState.teamId ? `
              <button class="btn btn-ghost btn-lg" onclick="window.goProfile()">
                🎭 My Operations Profile
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Launch confetti
  launchConfetti();

  // Staggered reveal animation
  // First, show runner-up positions
  runnerUp.slice().reverse().forEach((t, i) => {
    setTimeout(() => {
      const el = document.getElementById(`bu-${t.teamId}`);
      if (el) el.style.opacity = '1';
    }, 500 + i * 400);
  });

  // Then champion reveal
  setTimeout(() => {
    const champ = document.getElementById('champion-section');
    if (champ) { champ.style.opacity = '1'; champ.style.transform = 'scale(1)'; }
    launchConfetti(true);
  }, 1000 + runnerUp.length * 400);

  // Then awards
  setTimeout(() => {
    const awards = document.getElementById('awards-section');
    if (awards) awards.style.opacity = '1';
  }, 2500 + runnerUp.length * 400);

  window.goProfile = () => navigate('profile');

  return null;
}

function computeAwards(teams, gs) {
  const awards = [];

  if (!teams.length) return awards;

  // Highest profit already = winner
  // Best Risk Management: lowest penalty
  const byPenalty = [...teams].sort((a, b) => (a.pnl?.totalPenalty || 0) - (b.pnl?.totalPenalty || 0));
  if (byPenalty[0] && byPenalty[0].teamId !== teams[0].teamId) {
    awards.push({
      icon: '🛡️',
      title: 'BEST RISK MANAGEMENT',
      team: byPenalty[0].name,
      reason: `Lowest stockout penalty: ${formatCurrency(byPenalty[0].pnl?.totalPenalty || 0)}`
    });
  }

  // Best Comeback: biggest positive rank change
  const byComeback = [...teams].sort((a, b) => (b.rankChange || 0) - (a.rankChange || 0));
  if (byComeback[0] && (byComeback[0].rankChange || 0) > 0) {
    awards.push({
      icon: '🚀',
      title: 'BEST COMEBACK',
      team: byComeback[0].name,
      reason: `Climbed ${byComeback[0].rankChange} positions`
    });
  }

  // Best Strategist: highest revenue
  const byRevenue = [...teams].sort((a, b) => (b.pnl?.totalRevenue || 0) - (a.pnl?.totalRevenue || 0));
  if (byRevenue[0]) {
    awards.push({
      icon: '🧠',
      title: 'BEST STRATEGIST',
      team: byRevenue[0].name,
      reason: `Highest revenue: ${formatCurrency(byRevenue[0].pnl?.totalRevenue || 0)}`
    });
  }

  return awards.slice(0, 3);
}

function launchConfetti(big = false) {
  const wrap = document.getElementById('confetti-wrap');
  if (!wrap) return;

  const colors = ['#6c63ff', '#00d4aa', '#ffa502', '#ff4757', '#a29bfe', '#74b9ff'];
  const count = big ? 120 : 40;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = Math.random() * 3 + 2;
      const rotate = Math.random() * 360;

      el.style.cssText = `
        position: absolute;
        top: -20px;
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: confettiFall ${duration}s ease ${delay}s forwards;
        transform: rotate(${rotate}deg);
        opacity: 0.9;
      `;

      wrap.appendChild(el);
    }, Math.random() * 500);
  }

  // Add confetti animation if not already
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
