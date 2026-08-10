import { getGameConfig } from './runtimeConfig.js';

export function freshState({ name, companyName, gender, sector, traitId, challengeId } = {}) {
  const cfg = getGameConfig();
  const STARTING_CASH    = cfg.STARTING_CASH;
  const STARTING_AGE     = cfg.STARTING_AGE;
  const STARTING_STRESS  = cfg.STARTING_STRESS;
  const GAME_OVER_MAX_AGE = cfg.GAME_OVER_MAX_AGE;
  return {
    // Meta
    name:         name        ?? 'Joueur',
    companyName:  companyName ?? 'Mon Entreprise',
    gender:       gender      ?? { id: 'H', emoji: '🙋‍♂️', name: 'Un homme', label: 'Fondateur' },
    sector:       sector      ?? { id: 'immo', emoji: '🏘️', name: 'Entrepreneur Immobilier', desc: '' },
    traitId:      traitId     ?? 'chanceux',
    challengeId:  challengeId ?? null,

    // Core stats
    year:         1,
    age:          STARTING_AGE,
    cash:         STARTING_CASH,
    personalCash: 0,
    stress:       STARTING_STRESS,
    valuation:    0,

    // Portfolio
    propertyList: [],
    propertiesOwned: 0,
    loans:        [],
    luxuryItems:  [],
    nextPropertyId: 1,

    // Progression
    flags:        {},
    achievements: [],
    eventLog:     [],

    // Market
    marketListings: [],
    economicCycle:  (['hausse', 'neutre', 'neutre', 'baisse', 'hausse'])[Math.floor(Math.random() * 5)],

    // Rival
    rival: null,
    teamRelation: 50,

    // Salary
    salary: 'none',

    // Bank
    bankOpsThisYear: 0,

    // Finance tracking
    currentYearFinance: { loyers: 0, ventes: 0, achats: 0, credits: 0, renovations: 0, evenements: 0, banque: 0, patrimoine: 0, taxes: 0, ir: 0, gestion: 0 },
    priorYearsFinance:  { loyers: 0, ventes: 0, achats: 0, credits: 0, renovations: 0, evenements: 0, banque: 0, patrimoine: 0, taxes: 0, ir: 0, gestion: 0 },

    // End-game
    over:       false,
    endingKind: null,

    // Events per year (randomized each year)
    eventsPerYear: 3 + Math.floor(Math.random() * 3),

    // UI helpers
    maxAge: GAME_OVER_MAX_AGE,

    // Criminal actions
    crimeUsedThisYear: false,
    hasInsurance:      false,

    // Session timing
    sessionStart: Date.now(),
    runId: crypto.randomUUID(),
  };
}

const ENDING_MULT = {
  age_limit:   1.00,
  fatal_event: 0.90,
  burnout:     0.85,
  insolvency:  0.70,
};

// Bonus retraite anticipée — plus tôt = plus grand multiplicateur
function retirementMult(years) {
  const age = 18 + years;
  if (age <= 62) return 2.2;
  if (age <= 67) return 1.8;
  if (age <= 72) return 1.5;
  if (age <= 77) return 1.3;
  return 1.1;
}

/**
 * Multi-dimensional game score:
 *  - Wealth (sqrt scaling so money doesn't dominate)
 *  - Efficiency (wealth per year played)
 *  - Achievements (mastery)
 *  - Portfolio size (diversification)
 *  - Ending multiplier (early retirement heavily rewarded, bankruptcy penalised)
 */
export function computeScore({ finalVal = 0, finalCash = 0, personalCash = 0,
                               years = 1, achievements = [], propertiesOwned = 0,
                               endingKind = 'age_limit' }) {
  const W   = Math.max(0, finalVal + finalCash + personalCash);
  const yrs = Math.max(1, years);

  const wealthScore     = Math.sqrt(W)           * 100;
  const efficiencyScore = Math.sqrt(W / yrs)     * 50;
  const achievementScore = (achievements?.length ?? 0) * 400;
  const portfolioScore  = (propertiesOwned ?? 0) * 120;

  const mult = endingKind === 'retirement' ? retirementMult(yrs) : (ENDING_MULT[endingKind] ?? 1.0);
  return Math.max(0, Math.round((wealthScore + efficiencyScore + achievementScore + portfolioScore) * mult));
}

export function retirementScoreMult(years) { return retirementMult(years); }

export function scoreGrade(score) {
  if (score >= 15000) return { label: 'S+', color: '#C084FC' };
  if (score >= 10000) return { label: 'S',  color: '#F59E0B' };
  if (score >=  7500) return { label: 'A+', color: '#34D399' };
  if (score >=  5000) return { label: 'A',  color: '#60A5FA' };
  if (score >=  3000) return { label: 'B',  color: '#94A3B8' };
  if (score >=  1500) return { label: 'C',  color: '#9CA3AF' };
  return                       { label: 'D',  color: '#6B7280' };
}

export function buildRunSummary(state) {
  const summary = {
    name:         state.name,
    companyName:  state.companyName,
    gender:       state.gender,
    sector:       state.sector,
    traitId:      state.traitId,
    finalVal:     state.valuation,
    finalCash:    state.cash,
    personalCash: state.personalCash,
    years:        state.year,
    age:          state.age,
    achievements: [...(state.achievements ?? [])],
    endingKind:   state.endingKind,
    propertiesOwned: state.propertiesOwned,
    propertyList: (state.propertyList ?? []).map(p => ({
      id: p.id, type: p.type, place: p.place,
      value: p.value ?? p.baseValue ?? 0,
      condition: p.condition, rented: !!p.rented,
    })),
    luxuryItems:  (state.luxuryItems ?? []).map(i => ({
      id: i.id, name: i.name, category: i.category, icon: i.icon,
      image: i.image ?? null, purchasePrice: i.purchasePrice ?? i.price,
      currentValue: i.currentValue ?? i.price,
    })),
    date:         Date.now(),
    durationMs:   state.sessionStart ? Date.now() - state.sessionStart : null,
    runId:        state.runId ?? crypto.randomUUID(),
  };
  summary.score = computeScore(summary);
  return summary;
}
