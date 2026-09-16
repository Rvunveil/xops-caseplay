// =============================================================================
// X-OPS CASEPLAY: THE OBERMEYER GAMBIT
// Game Engine — Core Logic, Demand Generation, Calculations
// =============================================================================

'use strict';

// ─── SEEDED PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── PRODUCT DEFINITIONS ──────────────────────────────────────────────────────
const PRODUCTS = [
  {
    code: 'A',
    name: 'Alpine',
    emoji: '🏔️',
    mean: 21,
    min: 15,
    max: 28,
    risk: 'LOW',
    riskLevel: 1,
    cv: 0.15,
    description: 'Classic heavy parka. Steady, reliable demand.',
    color: '#00d4aa'
  },
  {
    code: 'B',
    name: 'Blizzard',
    emoji: '❄️',
    mean: 19,
    min: 12,
    max: 26,
    risk: 'LOW',
    riskLevel: 1,
    cv: 0.18,
    description: 'Insulated jacket. Consistent bestseller.',
    color: '#74b9ff'
  },
  {
    code: 'C',
    name: 'Cascade',
    emoji: '🌊',
    mean: 20,
    min: 8,
    max: 32,
    risk: 'MEDIUM',
    riskLevel: 2,
    cv: 0.30,
    description: 'Layered shell. Moderate demand swings.',
    color: '#fdcb6e'
  },
  {
    code: 'D',
    name: 'Drift',
    emoji: '🌪️',
    mean: 20,
    min: 4,
    max: 38,
    risk: 'HIGH',
    riskLevel: 3,
    cv: 0.45,
    description: 'Fashion-forward down jacket. Volatile demand.',
    color: '#e17055'
  },
  {
    code: 'E',
    name: 'Eclipse',
    emoji: '⚡',
    mean: 20,
    min: 0,
    max: 45,
    risk: 'VERY HIGH',
    riskLevel: 4,
    cv: 0.65,
    description: 'Trendsetter limited edition. Extreme uncertainty.',
    color: '#a29bfe'
  }
];

// ─── ECONOMICS ────────────────────────────────────────────────────────────────
const ECONOMICS = {
  SELLING_PRICE: 30000,
  MASS_COST: 10000,
  AGILE_COST: 15000,
  EMERGENCY_COST: 20000,
  SALVAGE_VALUE: 5000,
  STOCKOUT_PENALTY: 5000,
  STARTING_CAPITAL: 1000000,
  MASS_CAPACITY: 50,
  AGILE_CAPACITY: 50,
  MAX_EMERGENCY: 10,
  MASS_MAX_SINGLE_PCT: 0.40  // 40% cap per product in Round 1
};

// ─── MARKET EVENTS ────────────────────────────────────────────────────────────
const MARKET_EVENTS = [
  {
    id: 'celebrity',
    title: '🌟 Celebrity Endorsement',
    headline: 'A-list celebrity spotted wearing Eclipse & Drift at Sundance!',
    description: 'Social media explodes. Eclipse and Drift demand surges.',
    effects: { E: 1.35, D: 1.20 },
    hostScript: 'BREAKING: A viral celebrity moment has sent two of your products trending. The question is — did you bet on them?'
  },
  {
    id: 'warm_winter',
    title: '☀️ Warm Winter Warning',
    headline: 'Meteorologists predict the warmest December in 30 years!',
    description: 'Demand for heavy winter jackets drops sharply.',
    effects: { A: 0.70, B: 0.75, C: 0.88 },
    hostScript: 'BREAKING: Climate surprise. Teams that went heavy on traditional jackets will feel the pain.'
  },
  {
    id: 'competitor',
    title: '💥 Competitor Price War',
    headline: 'Rival brand launches aggressive discounting campaign!',
    description: 'All product demand drops as competitors undercut on price.',
    effects: { A: 0.88, B: 0.88, C: 0.90, D: 0.92, E: 0.92 },
    hostScript: 'BREAKING: The market just got crowded. Efficiency matters more than ever now.'
  },
  {
    id: 'viral',
    title: '📱 Social Media Explosion',
    headline: 'Eclipse jacket goes viral on Instagram. 10 million views overnight!',
    description: 'Eclipse demand skyrockets. Every influencer wants one.',
    effects: { E: 1.50, D: 1.15 },
    hostScript: 'BREAKING: The internet has spoken. One product is on fire. Did your team see this coming?'
  },
  {
    id: 'cold_snap',
    title: '🏔️ Record Cold Snap',
    headline: 'Polar vortex hits unexpectedly. Temperatures crash across region!',
    description: 'Demand for all winter jackets surges across the board.',
    effects: { A: 1.28, B: 1.22, C: 1.15, D: 1.08, E: 1.05 },
    hostScript: 'BREAKING: Winter arrived harder than anyone expected. The whole market heats up.'
  },
  {
    id: 'retail_drop',
    title: '🏪 Retail Partner Drops',
    headline: 'Major retail chain cancels orders for Cascade and Drift!',
    description: 'Distribution channel collapses for mid-range products.',
    effects: { C: 0.65, D: 0.72 },
    hostScript: 'BREAKING: A distribution shock. Teams that diversified their product mix are protected.'
  },
  {
    id: 'sustainability',
    title: '🌍 Sustainability Surge',
    headline: 'Eco-conscious buyers drive demand for premium sustainable products!',
    description: 'Trend-forward products see unexpected demand boost.',
    effects: { D: 1.25, E: 1.30, C: 1.10 },
    hostScript: 'BREAKING: Sustainability is trending. Premium, trend-forward products are winning.'
  },
  {
    id: 'boom',
    title: '💰 Economic Boom',
    headline: 'Consumer confidence hits 5-year high! Discretionary spending soars!',
    description: 'All products see stronger-than-expected demand.',
    effects: { A: 1.15, B: 1.12, C: 1.18, D: 1.20, E: 1.22 },
    hostScript: 'BREAKING: Great news for everyone — the economy is booming. But who positioned for it best?'
  }
];

// ─── SIGNAL GENERATION ───────────────────────────────────────────────────────
const SIGNAL_LABELS = ['WEAK', 'MODERATE', 'STABLE', 'STRONG', 'TRENDING 🔥'];
const SIGNAL_COLORS = ['#ff4757', '#ffa502', '#74b9ff', '#00d4aa', '#a29bfe'];
const SIGNAL_DESCRIPTIONS = {
  'WEAK': 'Buyer interest is below expectations.',
  'MODERATE': 'Some interest, but buyers are cautious.',
  'STABLE': 'Interest tracking to normal patterns.',
  'STRONG': 'Retailers are ordering ahead. Solid interest.',
  'TRENDING 🔥': 'This product is the talk of the trade show!'
};

function generateSignal(product, actualDemand, rng) {
  const range = product.max - product.min;
  const normalized = (actualDemand - product.min) / range; // 0..1
  // Add noise (±0.25 on normalized scale)
  const noise = (rng() - 0.5) * 0.5;
  const signalValue = Math.max(0, Math.min(1, normalized + noise));
  const index = Math.min(4, Math.floor(signalValue * 5));
  return {
    label: SIGNAL_LABELS[index],
    color: SIGNAL_COLORS[index],
    description: SIGNAL_DESCRIPTIONS[SIGNAL_LABELS[index]]
  };
}

// ─── DEMAND GENERATION ───────────────────────────────────────────────────────
function generateDemand(gameSeed, eventMultipliers = {}) {
  const rng = mulberry32(seedFromString(gameSeed + '_demand'));
  const demands = {};
  PRODUCTS.forEach(product => {
    // Use a triangular-like distribution biased toward mean
    const r1 = rng();
    const r2 = rng();
    const r3 = rng();
    const avg = (r1 + r2 + r3) / 3; // Central Limit Theorem-like, 0..1
    // Scale to product range
    const raw = product.min + avg * (product.max - product.min);
    // Apply event multiplier if any
    const multiplier = eventMultipliers[product.code] || 1.0;
    const final = Math.round(Math.max(0, raw * multiplier));
    demands[product.code] = final;
  });
  return demands;
}

// ─── SIGNAL GENERATION FOR ALL PRODUCTS ─────────────────────────────────────
function generateAllSignals(gameSeed, actualDemands) {
  const rng = mulberry32(seedFromString(gameSeed + '_signals'));
  const signals = {};
  PRODUCTS.forEach(product => {
    signals[product.code] = generateSignal(product, actualDemands[product.code], rng);
  });
  return signals;
}

// ─── SELECT RANDOM EVENT ─────────────────────────────────────────────────────
function selectEvent(gameSeed) {
  const rng = mulberry32(seedFromString(gameSeed + '_event'));
  const index = Math.floor(rng() * MARKET_EVENTS.length);
  return MARKET_EVENTS[index];
}

// ─── P&L CALCULATION ─────────────────────────────────────────────────────────
function calculateTeamPnL(team, actualDemands) {
  const results = {};
  let totalRevenue = 0;
  let totalProductionCost = 0;
  let totalSalvage = 0;
  let totalPenalty = 0;

  PRODUCTS.forEach(product => {
    const code = product.code;
    const massUnits = (team.massAllocation || {})[code] || 0;
    const agileUnits = (team.agileAllocation || {})[code] || 0;
    const emergencyUnits = (team.emergencyAllocation || {})[code] || 0;
    const totalProduced = massUnits + agileUnits + emergencyUnits;
    const demand = actualDemands[code];

    const unitsSold = Math.min(totalProduced, demand);
    const unsoldUnits = Math.max(0, totalProduced - demand);
    const stockout = Math.max(0, demand - totalProduced);

    const revenue = unitsSold * ECONOMICS.SELLING_PRICE;
    const massCost = massUnits * ECONOMICS.MASS_COST;
    const agileCost = agileUnits * ECONOMICS.AGILE_COST;
    const emergencyCost = emergencyUnits * ECONOMICS.EMERGENCY_COST;
    const productionCost = massCost + agileCost + emergencyCost;
    const salvage = unsoldUnits * ECONOMICS.SALVAGE_VALUE;
    const penalty = stockout * ECONOMICS.STOCKOUT_PENALTY;

    const productProfit = revenue + salvage - productionCost - penalty;

    results[code] = {
      massUnits,
      agileUnits,
      emergencyUnits,
      totalProduced,
      demand,
      unitsSold,
      unsoldUnits,
      stockout,
      revenue,
      massCost,
      agileCost,
      emergencyCost,
      productionCost,
      salvage,
      penalty,
      productProfit
    };

    totalRevenue += revenue;
    totalProductionCost += productionCost;
    totalSalvage += salvage;
    totalPenalty += penalty;
  });

  const totalProfit = totalRevenue + totalSalvage - totalProductionCost - totalPenalty;
  const finalCash = ECONOMICS.STARTING_CAPITAL + totalProfit;

  return {
    products: results,
    totalRevenue,
    totalProductionCost,
    totalSalvage,
    totalPenalty,
    totalProfit,
    finalCash
  };
}

// ─── STRATEGY ARCHETYPE CLASSIFICATION ──────────────────────────────────────
function classifyStrategy(team, actualDemands) {
  const massTotal = Object.values(team.massAllocation || {}).reduce((a, b) => a + b, 0);
  const agileTotal = Object.values(team.agileAllocation || {}).reduce((a, b) => a + b, 0);
  const emergencyTotal = Object.values(team.emergencyAllocation || {}).reduce((a, b) => a + b, 0);
  const totalUnits = massTotal + agileTotal + emergencyTotal;

  if (totalUnits === 0) return 'BALANCED_OPERATOR';

  const agileRatio = agileTotal / totalUnits;
  const massRatio = massTotal / totalUnits;
  const emergencyRatio = emergencyTotal / totalUnits;

  // High-risk allocation
  const highRiskMass = ((team.massAllocation || {})['D'] || 0) + ((team.massAllocation || {})['E'] || 0);
  const highRiskRatio = highRiskMass / Math.max(1, massTotal);

  // Low-risk allocation
  const lowRiskMass = ((team.massAllocation || {})['A'] || 0) + ((team.massAllocation || {})['B'] || 0);
  const lowRiskRatio = lowRiskMass / Math.max(1, massTotal);

  // High-risk agile
  const highRiskAgile = ((team.agileAllocation || {})['D'] || 0) + ((team.agileAllocation || {})['E'] || 0);
  const highRiskAgileRatio = highRiskAgile / Math.max(1, agileTotal);

  if (emergencyRatio > 0.15) return 'RISK_HUNTER';
  if (agileRatio > 0.65) return 'AGILITY_MASTER';
  if (massRatio > 0.75 && lowRiskRatio > 0.55) return 'COST_MAXIMIZER';
  if (highRiskRatio > 0.4) return 'DEMAND_GAMBLER';
  if (agileRatio > 0.35 && highRiskAgileRatio > 0.5 && lowRiskRatio > 0.4) return 'ACCURATE_RESPONSE';
  return 'BALANCED_OPERATOR';
}

const STRATEGY_PROFILES = {
  ACCURATE_RESPONSE: {
    name: 'Accurate Response',
    emoji: '🎯',
    title: 'PRECISION OPERATOR',
    description: 'You used cheap capacity for safe bets and flexible capacity for uncertain products. This is exactly what the best supply chain managers do.',
    strength: 'Excellent allocation between cheap and flexible production.',
    weakness: 'May be too conservative in extreme upside scenarios.'
  },
  DEMAND_GAMBLER: {
    name: 'Demand Gambler',
    emoji: '🎲',
    title: 'RISK HUNTER',
    description: 'You went all-in on high-risk products. Bold strategy. When it works, it really works.',
    strength: 'Maximizes upside when volatile products perform.',
    weakness: 'Heavy exposure when high-risk products underdeliver.'
  },
  COST_MAXIMIZER: {
    name: 'Cost Maximizer',
    emoji: '💰',
    title: 'COST ENGINEER',
    description: 'You prioritized cheap production costs. Safe, efficient, but potentially inflexible.',
    strength: 'Low production costs, high margins on sold units.',
    weakness: 'Committed early, less ability to react to new information.'
  },
  AGILITY_MASTER: {
    name: 'Agility Master',
    emoji: '⚡',
    title: 'AGILITY MASTER',
    description: 'You preferred expensive but flexible capacity. Higher costs, but maximum adaptability.',
    strength: 'Responded well to market signals and uncertainty.',
    weakness: 'Higher costs reduce margins even when demand is correct.'
  },
  BALANCED_OPERATOR: {
    name: 'Balanced Operator',
    emoji: '⚖️',
    title: 'BALANCED OPERATOR',
    description: 'You balanced risk across products and production options. Solid fundamentals.',
    strength: 'Diversified risk, resilient to market shocks.',
    weakness: 'Missed opportunities to capitalize on strong signals.'
  },
  RISK_HUNTER: {
    name: 'Risk Hunter',
    emoji: '🦁',
    title: 'COMEBACK SPECIALIST',
    description: 'You used emergency sourcing aggressively. Expensive, but sometimes the boldest bet pays off.',
    strength: 'Ability to capture last-minute demand surges.',
    weakness: 'Emergency costs significantly erode margins.'
  }
};

// ─── GAME STATE FACTORY ───────────────────────────────────────────────────────
function createGameState(gameId, options = {}) {
  const seed = options.seed || (gameId + '_' + Date.now());
  const event = selectEvent(seed);
  const preEventDemands = generateDemand(seed);
  const actualDemands = generateDemand(seed, event.effects);
  const signals = generateAllSignals(seed, actualDemands);

  return {
    gameId,
    seed,
    status: 'LOBBY', // LOBBY, ROUND1, SIGNAL_REVEAL, ROUND2, LEADERBOARD, ROUND3, ROUND4, DEMAND_REVEAL, WINNER, DEBRIEF
    round: 0,
    currentEvent: null, // Revealed in Round 3
    event,             // Known internally
    actualDemands,
    preEventDemands,
    signals,
    teams: {},
    createdAt: Date.now(),
    roundStartedAt: null,
    adminPin: options.adminPin || '1234',
    maxTeams: options.maxTeams || 12,
    roundDurations: {
      1: 7 * 60,
      2: 7 * 60,
      3: 7 * 60,
      4: 8 * 60
    }
  };
}

function createTeam(teamId, name, symbol) {
  return {
    teamId,
    name,
    symbol: symbol || '⭐',
    cash: ECONOMICS.STARTING_CAPITAL,
    massAllocation: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    agileAllocation: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    emergencyAllocation: { A: 0, B: 0, C: 0, D: 0, E: 0 },
    massUsed: 0,      // committed in Round 1
    agileUsed: 0,     // committed in Rounds 2, 3, 4 (max 50 total)
    emergencyUsed: 0, // committed in Round 4 (max 10)
    submittedRounds: [],
    pnl: null,
    rank: null,
    strategyProfile: null,
    isConnected: false,
    joinedAt: Date.now()
  };
}

// ─── CONSTRAINT VALIDATION ────────────────────────────────────────────────────
function validateMassAllocation(allocation) {
  const errors = [];
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const maxSingle = ECONOMICS.MASS_CAPACITY * ECONOMICS.MASS_MAX_SINGLE_PCT;

  if (total > ECONOMICS.MASS_CAPACITY) {
    errors.push(`Total mass allocation (${total}) exceeds capacity (${ECONOMICS.MASS_CAPACITY}).`);
  }
  PRODUCTS.forEach(p => {
    if ((allocation[p.code] || 0) > maxSingle) {
      errors.push(`${p.name}: max ${maxSingle} units per product (40% rule).`);
    }
    if ((allocation[p.code] || 0) < 0) {
      errors.push(`${p.name}: cannot be negative.`);
    }
  });

  return errors;
}

function validateAgileAllocation(allocation, agileUsedSoFar) {
  const errors = [];
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const remaining = ECONOMICS.AGILE_CAPACITY - agileUsedSoFar;

  if (total > remaining) {
    errors.push(`Agile allocation (${total}) exceeds remaining capacity (${remaining}).`);
  }
  PRODUCTS.forEach(p => {
    if ((allocation[p.code] || 0) < 0) {
      errors.push(`${p.name}: cannot be negative.`);
    }
  });

  return errors;
}

function validateEmergencyAllocation(allocation) {
  const errors = [];
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);

  if (total > ECONOMICS.MAX_EMERGENCY) {
    errors.push(`Emergency allocation (${total}) exceeds limit (${ECONOMICS.MAX_EMERGENCY}).`);
  }
  PRODUCTS.forEach(p => {
    if ((allocation[p.code] || 0) < 0) {
      errors.push(`${p.name}: cannot be negative.`);
    }
  });

  return errors;
}

// ─── LEADERBOARD CALCULATION ─────────────────────────────────────────────────
function computeLeaderboard(gameState) {
  const teams = Object.values(gameState.teams);
  
  teams.forEach(team => {
    if (gameState.status === 'WINNER' || gameState.status === 'DEBRIEF') {
      // Use final PnL
      team.currentScore = team.pnl ? team.pnl.finalCash : ECONOMICS.STARTING_CAPITAL;
    } else {
      // Estimate based on committed production costs so far
      const massCost = Object.values(team.massAllocation).reduce((a, b) => a + b, 0) * ECONOMICS.MASS_COST;
      const agileCost = Object.values(team.agileAllocation).reduce((a, b) => a + b, 0) * ECONOMICS.AGILE_COST;
      const emergencyCost = Object.values(team.emergencyAllocation).reduce((a, b) => a + b, 0) * ECONOMICS.EMERGENCY_COST;
      team.currentScore = ECONOMICS.STARTING_CAPITAL - massCost - agileCost - emergencyCost;
    }
  });

  teams.sort((a, b) => b.currentScore - a.currentScore);
  teams.forEach((team, idx) => {
    const oldRank = team.rank;
    team.rank = idx + 1;
    team.rankChange = oldRank ? oldRank - team.rank : 0;
  });

  return teams;
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
module.exports = {
  PRODUCTS,
  ECONOMICS,
  MARKET_EVENTS,
  STRATEGY_PROFILES,
  mulberry32,
  seedFromString,
  generateDemand,
  generateAllSignals,
  selectEvent,
  calculateTeamPnL,
  classifyStrategy,
  createGameState,
  createTeam,
  validateMassAllocation,
  validateAgileAllocation,
  validateEmergencyAllocation,
  computeLeaderboard,
  SIGNAL_LABELS,
  SIGNAL_COLORS,
  SIGNAL_DESCRIPTIONS
};
