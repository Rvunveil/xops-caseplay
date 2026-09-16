// =============================================================================
// CASE REVEAL / DEBRIEF
// =============================================================================

import { navigate, clientState } from '../app.js';

export function renderCaseReveal(container) {
  const slides = getSlides();
  let currentSlide = 0;

  container.innerHTML = `
    <div class="page" style="background:var(--bg-deep);">
      <div class="top-bar">
        <div class="top-bar-logo"><span class="x">X</span>-OPS CASEPLAY</div>
        <div class="top-bar-info" style="display:flex;align-items:center;gap:var(--space-3);">
          <button class="btn btn-ghost btn-sm" onclick="window.backToWinner()">🏆 View Results</button>
          <span style="color:var(--accent);font-weight:700;">📚 CASE REVEAL</span>
          <span id="slide-counter" style="color:var(--text-muted);font-size:0.8rem;">1 / ${slides.length}</span>
        </div>
      </div>

      <div class="page-content">
        <div class="slide-container">
          <div id="slide-content" class="slide active">
            <!-- Slides rendered here -->
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-8);">
            <button class="btn btn-ghost" id="prev-btn" onclick="window.prevSlide()" style="visibility:hidden;">
              ← Previous
            </button>

            <div style="display:flex;gap:8px;" id="slide-dots">
              ${slides.map((_, i) => `
                <div style="width:8px;height:8px;border-radius:50%;background:${i === 0 ? 'var(--accent)' : 'var(--bg-elevated)'};"
                  id="dot-${i}"></div>
              `).join('')}
            </div>

            <button class="btn btn-primary" id="next-btn" onclick="window.nextSlide()">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  function renderSlide(index) {
    const slide = slides[index];
    const content = document.getElementById('slide-content');
    const counter = document.getElementById('slide-counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (!content) return;

    content.style.animation = 'none';
    content.offsetHeight; // reflow
    content.style.animation = 'slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    content.innerHTML = slide.html;
    counter.textContent = `${index + 1} / ${slides.length}`;

    prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = index === slides.length - 1 ? '🔄 Play Again' : 'Next →';
    nextBtn.className = `btn ${index === slides.length - 1 ? 'btn-teal' : 'btn-primary'}`;

    // Update dots
    slides.forEach((_, i) => {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.style.background = i === index ? 'var(--accent)' : 'var(--bg-elevated)';
    });
  }

  window.nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      currentSlide++;
      renderSlide(currentSlide);
    } else {
      if (clientState.isAdmin) {
        navigate('admin');
      } else {
        navigate('winner');
      }
    }
  };

  window.prevSlide = () => {
    if (currentSlide > 0) {
      currentSlide--;
      renderSlide(currentSlide);
    }
  };

  window.backToWinner = () => {
    if (clientState.isAdmin) {
      navigate('admin');
    } else {
      navigate('winner');
    }
  };

  renderSlide(0);
  return null;
}

function getSlides() {
  return [
    {
      html: `
        <div class="text-center fade-in">
          <div class="slide-number">SLIDE 01 / 07</div>
          <div style="font-size:4rem;margin:var(--space-6) 0;">🎮</div>
          <h1 class="section-title mb-6">What You Just Experienced</h1>
          <div class="card" style="text-align:left;max-width:700px;margin:0 auto;">
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div style="display:flex;gap:var(--space-4);align-items:start;">
                <span style="font-size:1.5rem;">🏭</span>
                <div><strong>You ran a fashion company</strong> for one season. You had to commit to production before knowing actual demand.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);align-items:start;">
                <span style="font-size:1.5rem;">❓</span>
                <div><strong>You faced genuine uncertainty.</strong> Some products had predictable demand. Others were wildcards.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);align-items:start;">
                <span style="font-size:1.5rem;">⚖️</span>
                <div><strong>You had to choose</strong> between a cheap-but-inflexible factory and an expensive-but-adaptable one.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);align-items:start;">
                <span style="font-size:1.5rem;">🏆</span>
                <div><strong>Strategy mattered.</strong> The winning team didn't just get lucky — they made smarter tradeoffs.</div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="fade-in">
          <div class="slide-number">SLIDE 02 / 07</div>
          <h1 class="section-title mb-6">📊 Demand Uncertainty</h1>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">
            <div class="card card-teal">
              <div style="font-size:2rem;margin-bottom:var(--space-3);">🏔️❄️</div>
              <div style="font-weight:700;color:var(--teal);margin-bottom:var(--space-2);">Alpine & Blizzard</div>
              <div style="font-size:0.9rem;color:var(--text-muted);">LOW UNCERTAINTY</div>
              <div style="margin-top:var(--space-3);">These are <strong>classic winter jackets</strong>. Retailers know roughly how much they sell every year. Demand is relatively predictable.</div>
            </div>
            <div class="card card-danger">
              <div style="font-size:2rem;margin-bottom:var(--space-3);">⚡🌪️</div>
              <div style="font-weight:700;color:var(--red);margin-bottom:var(--space-2);">Eclipse & Drift</div>
              <div style="font-size:0.9rem;color:var(--text-muted);">VERY HIGH UNCERTAINTY</div>
              <div style="margin-top:var(--space-3);">These are <strong>trend-driven fashion pieces</strong>. One viral moment and demand explodes. One wrong trend and inventory piles up.</div>
            </div>
          </div>
          <div class="card mt-6" style="background:var(--bg-elevated);">
            <p style="color:var(--text-secondary);">
              📌 In operations, we measure this uncertainty using a metric called the <strong>Coefficient of Variation (CV)</strong> = standard deviation / mean.
              Higher CV = higher uncertainty = harder decisions.
            </p>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="fade-in">
          <div class="slide-number">SLIDE 03 / 07</div>
          <h1 class="section-title mb-6">🏭 Cheap vs. Flexible Production</h1>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-6);">
            <div class="card" style="border-color:var(--accent);">
              <div class="card-title mb-3" style="color:var(--accent);">🏭 MASS FACTORY</div>
              <div class="mono" style="font-size:1.5rem;font-weight:700;margin-bottom:var(--space-3);">₹10,000 / unit</div>
              <ul style="color:var(--text-muted);font-size:0.9rem;line-height:2;list-style:none;">
                <li>✅ Cheap unit cost</li>
                <li>✅ High volume capacity</li>
                <li>❌ Must commit early</li>
                <li>❌ Cannot change later</li>
              </ul>
            </div>
            <div class="card" style="border-color:var(--teal);">
              <div class="card-title mb-3" style="color:var(--teal);">⚡ AGILE FACTORY</div>
              <div class="mono" style="font-size:1.5rem;font-weight:700;margin-bottom:var(--space-3);">₹15,000 / unit</div>
              <ul style="color:var(--text-muted);font-size:0.9rem;line-height:2;list-style:none;">
                <li>✅ React to new information</li>
                <li>✅ Allocate after signals</li>
                <li>❌ 50% higher cost</li>
                <li>❌ Limited capacity</li>
              </ul>
            </div>
          </div>
          <div class="card" style="background:var(--bg-elevated);">
            <p><strong>The core insight:</strong> You pay a <em>premium for flexibility</em>. The question is — when is that premium worth it?</p>
            <p style="margin-top:var(--space-3);color:var(--text-muted);">
              💡 When demand is predictable, commit early to the cheap factory.<br>
              💡 When demand is uncertain, hold back some capacity for after you get more information.
            </p>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="fade-in">
          <div class="slide-number">SLIDE 04 / 07</div>
          <h1 class="section-title mb-6">⏰ The Value of Waiting</h1>
          <div class="card mb-6" style="background:linear-gradient(135deg,var(--bg-card),rgba(108,99,255,0.05));">
            <div style="font-size:2rem;margin-bottom:var(--space-4);">🤔</div>
            <p style="font-size:1.1rem;line-height:1.8;">
              You had <strong>two information states</strong> during this game:
            </p>
            <ol style="margin-top:var(--space-4);line-height:2.5;padding-left:var(--space-6);">
              <li><strong>Before the trade show:</strong> Only historical ranges. High uncertainty.</li>
              <li><strong>After signals:</strong> Market signals gave you a hint — but not certainty.</li>
            </ol>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="card card-danger">
              <div style="font-weight:700;color:var(--red);margin-bottom:var(--space-3);">❌ Committing Everything Early</div>
              <p style="color:var(--text-muted);font-size:0.9rem;">
                You use all capacity in Round 1. Cheap cost. But zero ability to respond to signals or market events. You're locked in.
              </p>
            </div>
            <div class="card card-teal">
              <div style="font-weight:700;color:var(--teal);margin-bottom:var(--space-3);">✅ Staged Commitment</div>
              <p style="color:var(--text-muted);font-size:0.9rem;">
                Commit cheap capacity for safe products. Wait. Get signals. Then use flexible capacity for uncertain products. Higher cost, better decisions.
              </p>
            </div>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="text-center fade-in">
          <div class="slide-number">SLIDE 05 / 07</div>
          <div style="font-size:4rem;margin:var(--space-6) 0;">🎯</div>
          <h1 class="section-title mb-4">Accurate Response</h1>
          <div class="card mb-6" style="max-width:700px;margin:0 auto var(--space-6);text-align:left;">
            <div style="font-weight:700;font-size:1.2rem;margin-bottom:var(--space-4);">The Strategy You (May Have) Discovered:</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
              <div style="display:flex;gap:var(--space-4);align-items:center;">
                <div style="width:3px;height:40px;background:var(--teal);border-radius:2px;flex-shrink:0;"></div>
                <div><strong style="color:var(--teal);">Predictable Products (Alpine, Blizzard):</strong><br>
                  <span style="color:var(--text-muted);">→ Commit using the cheap Mass Factory. Reward: low cost, high margin.</span>
                </div>
              </div>
              <div style="display:flex;gap:var(--space-4);align-items:center;">
                <div style="width:3px;height:40px;background:var(--accent);border-radius:2px;flex-shrink:0;"></div>
                <div><strong style="color:var(--accent);">Uncertain Products (Eclipse, Drift):</strong><br>
                  <span style="color:var(--text-muted);">→ Reserve Agile Factory capacity. Use signals to decide. Reward: fewer stockouts and less waste.</span>
                </div>
              </div>
            </div>
          </div>
          <div class="card" style="max-width:700px;margin:0 auto;background:linear-gradient(135deg,rgba(108,99,255,0.1),rgba(0,212,170,0.05));">
            <p style="font-size:1.1rem;color:var(--text-secondary);">
              This strategy is called <strong style="color:var(--accent);">Accurate Response</strong>.<br>
              It was pioneered by Marshall Fisher and Ananth Raman at Harvard Business School.
            </p>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="fade-in">
          <div class="slide-number">SLIDE 06 / 07</div>
          <div class="card mb-6" style="background:linear-gradient(135deg,rgba(255,165,2,0.1),rgba(108,99,255,0.05));border-color:var(--amber);">
            <div style="display:flex;gap:var(--space-4);align-items:center;margin-bottom:var(--space-4);">
              <div style="font-size:2.5rem;">🏔️</div>
              <div>
                <div style="font-weight:800;font-size:1.3rem;">Sport Obermeyer</div>
                <div style="color:var(--text-muted);font-size:0.85rem;">Harvard Business School · Case Study</div>
              </div>
              <div style="margin-left:auto;padding:var(--space-2) var(--space-4);background:var(--amber-soft);border-radius:var(--radius-md);color:var(--amber);font-size:0.8rem;font-weight:700;">
                REAL WORLD
              </div>
            </div>
            <p style="color:var(--text-secondary);line-height:1.8;">
              Sport Obermeyer was a Colorado-based ski apparel company. Every year, they had to manufacture winter parkas
              <em>before knowing</em> what retailers would actually order. Their factory in China needed commitments months in advance.
            </p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
            <div class="card">
              <div style="font-weight:700;color:var(--red);margin-bottom:var(--space-3);">❌ The Problem</div>
              <ul style="color:var(--text-muted);font-size:0.9rem;line-height:2;list-style:none;">
                <li>📦 Unsold inventory: marked down or discarded</li>
                <li>⚠️ Stockouts: lost sales, unhappy retailers</li>
                <li>🎲 10+ products, widely varying uncertainty</li>
                <li>🗓️ 6-month lead times</li>
              </ul>
            </div>
            <div class="card">
              <div style="font-weight:700;color:var(--teal);margin-bottom:var(--space-3);">✅ What They Did</div>
              <ul style="color:var(--text-muted);font-size:0.9rem;line-height:2;list-style:none;">
                <li>🏭 Committed predictable styles early</li>
                <li>⏳ Waited for trade show orders on volatile styles</li>
                <li>🇭🇰 Hong Kong factory for late flexibility</li>
                <li>📉 Dramatically reduced costly errors</li>
              </ul>
            </div>
          </div>

          <div class="card mt-4" style="background:var(--bg-elevated);border-left:3px solid var(--accent);">
            <p style="font-style:italic;color:var(--text-secondary);">
              "The real insight was that information has value — and waiting for that information, even at a higher production cost,
              was worth it for uncertain products."
            </p>
          </div>
        </div>
      `
    },
    {
      html: `
        <div class="text-center fade-in">
          <div class="slide-number">SLIDE 07 / 07</div>
          <div style="font-size:4rem;margin:var(--space-6) 0;">🎓</div>
          <h1 class="section-title mb-6">What Your Teams Discovered</h1>
          <div class="card mb-6" style="max-width:700px;margin:0 auto;text-align:left;">
            <div style="display:flex;flex-direction:column;gap:var(--space-5);">
              <div style="display:flex;gap:var(--space-4);">
                <span style="font-size:1.5rem;flex-shrink:0;">💡</span>
                <div><strong>Uncertainty is not the enemy.</strong> Uncertainty that you can react to — with flexible capacity — is manageable. Uncertainty you've locked yourself into is expensive.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);">
                <span style="font-size:1.5rem;flex-shrink:0;">📡</span>
                <div><strong>Information is worth money.</strong> The trade show signals had real financial value — teams who used them well made better decisions in Round 2.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);">
                <span style="font-size:1.5rem;flex-shrink:0;">⚖️</span>
                <div><strong>Efficiency vs. Flexibility.</strong> The cheapest option isn't always best when you're uncertain. Paying a premium for flexibility is a rational business strategy.</div>
              </div>
              <div style="display:flex;gap:var(--space-4);">
                <span style="font-size:1.5rem;flex-shrink:0;">🎲</span>
                <div><strong>Luck exists, but strategy wins in the long run.</strong> Over many games, teams with better allocation logic beat teams who got lucky on one product.</div>
              </div>
            </div>
          </div>

          <div class="card" style="max-width:700px;margin:0 auto;background:linear-gradient(135deg,rgba(108,99,255,0.15),rgba(0,212,170,0.08));">
            <div style="font-weight:800;font-size:1.1rem;margin-bottom:var(--space-3);">The Operations Lesson</div>
            <p style="color:var(--text-secondary);font-size:1rem;line-height:1.8;">
              <strong>Commit cheap capacity to predictable demand.</strong><br>
              <strong>Reserve flexible capacity for uncertain demand.</strong><br>
              This is Accurate Response — and it works.
            </p>
          </div>

          <div style="margin-top:var(--space-8);padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md);max-width:700px;margin-left:auto;margin-right:auto;">
            <div style="font-size:0.7rem;color:var(--text-dim);">
              DEMO SIMULATION · This game is a simplified adaptation inspired by the Sport Obermeyer case.
              Designed for experiential learning. Not affiliated with Harvard Business School.
            </div>
          </div>
        </div>
      `
    }
  ];
}
