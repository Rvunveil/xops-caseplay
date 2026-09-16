// =============================================================================
// LANDING PAGE — Operations War Room aesthetic
// =============================================================================

import { navigate } from '../app.js';

export function renderLanding(container) {
  container.innerHTML = `
    <div style="
      min-height:100vh; background:#080810;
      display:flex; flex-direction:column;
      position:relative; overflow:hidden; font-family:var(--font-sans);
    ">

      <!-- Dot-grid background -->
      <div style="position:absolute;inset:0;pointer-events:none;
        background-image:radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size:28px 28px;"></div>

      <!-- Subtle accent glow — top left only -->
      <div style="position:absolute;width:500px;height:500px;border-radius:50%;
        background:radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%);
        top:-150px;left:-150px;pointer-events:none;"></div>
      <!-- Teal glow bottom right -->
      <div style="position:absolute;width:400px;height:400px;border-radius:50%;
        background:radial-gradient(circle,rgba(0,212,170,0.12) 0%,transparent 70%);
        bottom:-100px;right:-80px;pointer-events:none;"></div>

      <!-- Ticker -->
      <div style="position:relative;z-index:2;border-bottom:1px solid rgba(255,255,255,0.07);
        background:rgba(255,255,255,0.02);overflow:hidden;flex-shrink:0;">
        <div class="ticker">${generateTicker()}${generateTicker()}</div>
      </div>

      <!-- Main content — centred -->
      <div style="flex:1;display:flex;align-items:center;justify-content:center;
        padding:2rem;position:relative;z-index:2;">
        <div style="max-width:780px;width:100%;" class="fade-in">

          <!-- Status bar -->
          <div style="display:flex;align-items:center;justify-content:center;
            gap:0.5rem;margin-bottom:2rem;">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;
              background:#00d4aa;box-shadow:0 0 8px #00d4aa;animation:pulse 2s infinite;"></span>
            <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.2em;
              text-transform:uppercase;color:rgba(255,255,255,0.35);">
              X-Ops Operations Club &nbsp;·&nbsp; XIME Chennai &nbsp;·&nbsp; Live Session
            </span>
          </div>

          <!-- Giant title -->
          <h1 style="font-size:clamp(4rem,10vw,7.5rem);font-weight:900;
            letter-spacing:-0.04em;line-height:0.9;text-align:center;margin-bottom:1.25rem;">
            <span style="
              background:linear-gradient(125deg,#818cf8 0%,#c4b5fd 40%,#fff 60%,#818cf8 100%);
              -webkit-background-clip:text;-webkit-text-fill-color:transparent;
              background-clip:text;display:block;">X-OPS</span>
            <span style="color:#fff;display:block;">CASEPLAY</span>
          </h1>

          <!-- Subtitle line -->
          <div style="text-align:center;margin-bottom:2.5rem;">
            <span style="display:inline-block;font-size:0.75rem;font-weight:700;
              letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.3);
              border:1px solid rgba(255,255,255,0.1);border-radius:100px;
              padding:0.4rem 1.2rem;">THE OBERMEYER GAMBIT</span>
          </div>

          <!-- Stats strip -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
            background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);
            border-radius:12px;overflow:hidden;margin-bottom:2rem;">
            ${[
              ['₹10,00,000','Starting Capital'],
              ['5','Products'],
              ['4','Rounds'],
              ['?','Demand'],
            ].map(([val, label]) => `
              <div style="background:#0d0d1a;padding:1.1rem 1rem;text-align:center;">
                <div style="font-size:1.4rem;font-weight:900;color:#fff;
                  font-family:var(--font-mono);letter-spacing:-0.02em;">${val}</div>
                <div style="font-size:0.65rem;color:rgba(255,255,255,0.3);
                  text-transform:uppercase;letter-spacing:0.12em;margin-top:4px;">${label}</div>
              </div>
            `).join('')}
          </div>

          <!-- Tagline -->
          <p style="text-align:center;color:rgba(255,255,255,0.28);font-size:0.92rem;
            font-style:italic;margin-bottom:2.5rem;letter-spacing:0.01em;">
            "Predict the unpredictable. Outplay the market."
          </p>

          <!-- CTA -->
          <div style="display:flex;justify-content:center;">
            <button
              onclick="navigate('join')"
              style="
                position:relative;overflow:hidden;
                background:linear-gradient(135deg,#6366f1,#818cf8);
                color:#fff;border:none;border-radius:10px;
                padding:0.95rem 3.5rem;font-size:1.05rem;font-weight:700;
                cursor:pointer;letter-spacing:0.04em;
                box-shadow:0 0 0 1px rgba(99,102,241,0.4),0 8px 32px rgba(99,102,241,0.35);
                transition:all 0.2s;outline:none;
              "
              onmouseover="this.style.transform='translateY(-2px) scale(1.02)';this.style.boxShadow='0 0 0 1px rgba(99,102,241,0.6),0 12px 40px rgba(99,102,241,0.5)'"
              onmouseout="this.style.transform='';this.style.boxShadow='0 0 0 1px rgba(99,102,241,0.4),0 8px 32px rgba(99,102,241,0.35)'">
              🚀 &nbsp; Join Game
            </button>
          </div>

          <!-- Hidden admin trigger -->
          <div id="admin-tap-zone" style="text-align:center;margin-top:2rem;
            font-size:0.62rem;color:rgba(255,255,255,0.12);cursor:default;user-select:none;
            letter-spacing:0.1em;">
            XIME Chennai Operations Club &nbsp;·&nbsp; Inspired by the Sport Obermeyer case
          </div>

        </div>
      </div>

    </div>
  `;

  // Triple-click disclaimer → admin password
  let tapCount = 0, tapTimer = null;
  document.getElementById('admin-tap-zone').addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
    if (tapCount >= 3) {
      tapCount = 0;
      const pw = prompt('🔒 Admin Access\n\nEnter admin password:');
      if (pw === 'Chennai-ops') {
        navigate('join', { admin: true });
      } else if (pw !== null) {
        alert('Incorrect password.');
      }
    }
  });

  return null;
}

function generateTicker() {
  const items = [
    '🏔️ ALPINE · LOW RISK',
    '❄️ BLIZZARD · STABLE',
    '🌊 CASCADE · MEDIUM RISK',
    '🌪️ DRIFT · HIGH RISK',
    '⚡ ECLIPSE · VERY HIGH RISK',
    '🏭 MASS FACTORY · ₹10K/unit',
    '⚡ AGILE FACTORY · ₹15K/unit',
    '💰 SELL PRICE · ₹30K/unit',
    '📦 SALVAGE · ₹5K/unit',
    '⚠️ STOCKOUT PENALTY · ₹5K/unit',
  ];
  return items.map(i => `<div class="ticker-item"><span style="color:var(--accent)">▶</span><span>${i}</span></div>`).join('');
}
