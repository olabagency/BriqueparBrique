// ============================================================
// FICHIER DE CONFIGURATION — BRIQUE PAR BRIQUE
// Modifiez ces valeurs pour ajuster le gameplay
// ============================================================

export const GAME_CONFIG = {
  // --- Économie de départ ---
  STARTING_CASH: 25,
  STARTING_AGE: 18,
  STARTING_STRESS: 20,
  STARTING_VALUATION: 0,

  // --- Seuils de crise ---
  CASH_CRISIS_THRESHOLD: -50,
  STRESS_CRISIS_THRESHOLD: 80,
  TEAM_CRISIS_THRESHOLD: 20,

  // --- Multiplicateurs de stade ---
  STAGE_MULTIPLIERS: {
    'IDÉE':      1,
    'LANCEMENT': 1.4,
    'CROISSANCE': 2.2,
    'EXPANSION': 3.5,
    'MATURITÉ':  9,
    'HÉRITAGE':  18,
  },

  // --- Événements par année ---
  EVENTS_PER_YEAR_MIN: 3,
  EVENTS_PER_YEAR_MAX: 5,

  // --- Marché immobilier ---
  MARKET_SIZE: 6,
  MARKET_MAX_REFRESH: 3,
  BANK_OPS_PER_YEAR_MAX: 3,

  // --- Biens ---
  PROPERTY_CONDITION_VALUES: { 'aRenover': 0.55, 'bonEtat': 0.85, 'renove': 1.05 },
  PROPERTY_LOAN_RATE: 0.35,
  PROPERTY_LOAN_INTEREST: 0.02,
  PROPERTY_RENT_RATIO: 0.09,

  // --- Finances ---
  GOLD_INGOT_PRICE: 60,
  GOLD_INGOT_MIN_RETURN: 0.90,
  GOLD_INGOT_MAX_RETURN: 1.15,

  // --- Leaderboard / Historique ---
  MAX_PAST_LIVES: 5,
  LEADERBOARD_SIZE: 10,

  // --- Cycles économiques ---
  ECONOMIC_CYCLE_FIRST_YEAR_MIN: 8,
  ECONOMIC_CYCLE_FIRST_YEAR_MAX: 10,
  ECONOMIC_CYCLE_DURATION_MIN: 3,
  ECONOMIC_CYCLE_DURATION_MAX: 5,
  ECONOMIC_MULTIPLIER_MIN: 0.4,
  ECONOMIC_MULTIPLIER_MAX: 1.6,

  // --- Salaire du fondateur ---
  SALARY_LEVELS: {
    none:    { label: 'Aucun', monthly: 0 },
    modest:  { label: 'Modeste (2K€/mois)', monthly: 2 },
    normal:  { label: 'Normal (5K€/mois)', monthly: 5 },
    high:    { label: 'Élevé (10K€/mois)', monthly: 10 },
    premium: { label: 'Premium (20K€/mois)', monthly: 20 },
  },
  SALARY_REVIEW_INTERVAL: 3,

  // --- Taxes foncières ---
  PROPERTY_TAX_RATE: 0.008,   // 0.8 % de la valeur du portefeuille par an

  // --- Fin de partie ---
  RETIREMENT_MIN_AGE: 60,
  GAME_OVER_MAX_AGE: 80,
};

export default GAME_CONFIG;

// Named exports for direct use in engine/components
export const STARTING_CASH       = GAME_CONFIG.STARTING_CASH;
export const STARTING_AGE        = GAME_CONFIG.STARTING_AGE;
export const STARTING_STRESS     = GAME_CONFIG.STARTING_STRESS;
export const STRESS_MAX          = 100;
export const GAME_OVER_MAX_AGE   = GAME_CONFIG.GAME_OVER_MAX_AGE;
export const RETIREMENT_MIN_AGE  = GAME_CONFIG.RETIREMENT_MIN_AGE;
export const PROPERTY_CONDITION_VALUES = GAME_CONFIG.PROPERTY_CONDITION_VALUES;
export const PROPERTY_LOAN_RATE   = GAME_CONFIG.PROPERTY_LOAN_RATE;
export const PROPERTY_LOAN_INTEREST = GAME_CONFIG.PROPERTY_LOAN_INTEREST;
export const PROPERTY_RENT_RATIO  = GAME_CONFIG.PROPERTY_RENT_RATIO;
export const STAGE_MULTIPLIERS    = GAME_CONFIG.STAGE_MULTIPLIERS;
export const PROPERTY_TAX_RATE    = GAME_CONFIG.PROPERTY_TAX_RATE;
