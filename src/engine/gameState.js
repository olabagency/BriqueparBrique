import {
  STARTING_CASH,
  STARTING_AGE,
  STARTING_STRESS,
  GAME_OVER_MAX_AGE,
} from '../config.js';

export function freshState({ name, companyName, gender, sector, traitId, challengeId } = {}) {
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
    economicCycle:  'neutre',

    // Rival
    rival: null,
    teamRelation: 50,

    // Salary
    salary: 'none',

    // Bank
    bankOpsThisYear: 0,

    // Finance tracking
    currentYearFinance: { loyers: 0, ventes: 0, achats: 0, credits: 0, renovations: 0, evenements: 0, banque: 0, patrimoine: 0 },
    priorYearsFinance:  { loyers: 0, ventes: 0, achats: 0, credits: 0, renovations: 0, evenements: 0, banque: 0, patrimoine: 0 },

    // End-game
    over:       false,
    endingKind: null,

    // UI helpers
    maxAge: GAME_OVER_MAX_AGE,
  };
}

export function buildRunSummary(state) {
  return {
    name:         state.name,
    companyName:  state.companyName,
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
    date:         Date.now(),
  };
}
