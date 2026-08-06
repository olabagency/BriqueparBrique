import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { freshState, buildRunSummary } from '../engine/gameState.js';
import { saveGame, loadGame, deleteSave, appendHistory } from '../engine/saveLoad.js';
import {
  generateMarketListings,
  collectRents,
  amortizeLoans,
  appreciateProperties,
  nextEconomicCycle,
  calcLoanPayment,
} from '../engine/market.js';
import { applyTraitEffect } from '../engine/traitEffect.js';
import { clamp, shuffleArray, stageFor, stageMultiplier } from '../engine/utils.js';
import {
  STRESS_MAX,
  GAME_OVER_MAX_AGE,
  RETIREMENT_MIN_AGE,
  STAGE_MULTIPLIERS,
} from '../config.js';

const PROPERTY_TYPES  = ['Studio','Appartement T2','Appartement T3','Duplex','Maison','Loft','Immeuble de rapport','Local commercial','Terrain','Parking'];
const PROPERTY_PLACES = ['rue des Lilas','avenue de la République','quartier des Tanneurs','impasse Voltaire','rue du Vieux-Port','allée des Platanes','quartier de la Gare','rue Saint-Michel','chemin des Vignes','boulevard Gambetta','rue des Acacias','place du Marché'];
const SALARY_AMOUNTS  = { none: 0, modest: 8, comfortable: 20, high: 45 };

function genPropertyRecord(value) {
  const type  = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
  const place = PROPERTY_PLACES[Math.floor(Math.random() * PROPERTY_PLACES.length)];
  return { id: crypto.randomUUID(), type, place, value: Math.max(1, Math.round(value || 35)), condition: 'bonEtat', rented: false };
}
import persoEvents from '../data/events_perso.json';
import immoEvents  from '../data/events_immo.json';
import renovationEvents from '../data/renovation_events.json';
import achievements from '../data/achievements.json';

const GameContext = createContext(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

// ─── Achievement evaluation ───────────────────────────────────────────────────

function evalAchievement(ach, state) {
  const props = state.propertyList ?? [];
  const loans = state.loans ?? [];
  switch (ach.checkType) {
    case 'propertiesOwned':   return (state.propertiesOwned ?? props.length) >= ach.checkValue;
    case 'valuation':         return state.valuation >= ach.checkValue;
    case 'stressBelow':       return state.stress <= ach.checkValue;
    case 'flag':              return !!state.flags?.[ach.checkFlag];
    case 'endgameFlag':
      if (!state.over) return false;
      return ach.checkFlagNot ? !state.flags?.[ach.checkFlagNot] : !!state.flags?.[ach.checkFlag];
    case 'retirementRich':
      return state.over && state.endingKind === 'retirement' && state.valuation >= ach.checkValue;
    default: return false;
  }
}

function checkAchievements(state) {
  const unlocked = [...(state.achievements ?? [])];
  for (const ach of achievements) {
    if (unlocked.includes(ach.id)) continue;
    if (ach.endgameOnly && !state.over) continue;
    if (evalAchievement(ach, state)) unlocked.push(ach.id);
  }
  return unlocked;
}

// ─── Event picking ────────────────────────────────────────────────────────────

function pickEvents(state, count = 3) {
  const eligible = [];
  const props = state.propertyList ?? [];

  for (const e of persoEvents) {
    if (e.minAge          && state.age < e.minAge) continue;
    if (e.minYear         && state.year < e.minYear) continue;
    if (e.minPersonalCash && (state.personalCash ?? 0) < e.minPersonalCash) continue;
    if (e.requireFlag     && !state.flags?.[e.requireFlag]) continue;
    if (e.excludeFlag     && state.flags?.[e.excludeFlag]) continue;
    eligible.push({ ...e, _pool: 'perso' });
  }

  for (const e of immoEvents) {
    if (e.minProperties   && props.length < e.minProperties) continue;
    if (e.minValuation    && state.valuation < e.minValuation) continue;
    if (e.minAge          && state.age < e.minAge) continue;
    if (e.minYear         && state.year < e.minYear) continue;
    if (e.minPersonalCash && (state.personalCash ?? 0) < e.minPersonalCash) continue;
    if (e.requireFlag     && !state.flags?.[e.requireFlag]) continue;
    eligible.push({ ...e, _pool: 'immo' });
  }

  const renovable = props.filter(p => p.condition === 'aRenover');
  if (renovable.length > 0) {
    for (const e of renovationEvents) {
      eligible.push({ ...e, _pool: 'reno', _targetProperty: renovable[Math.floor(Math.random() * renovable.length)] });
    }
  }

  // 83% immo, 17% perso bias (matching original)
  const immoPool  = eligible.filter(e => e._pool === 'immo' || e._pool === 'reno');
  const persoPool = eligible.filter(e => e._pool === 'perso');
  const result = [];
  for (let i = 0; i < count; i++) {
    const wantImmo = immoPool.length > 0 && (persoPool.length === 0 || Math.random() < 0.83);
    const pool = wantImmo ? immoPool : (persoPool.length > 0 ? persoPool : immoPool);
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case 'START_GAME': {
      const init = freshState(action.payload);
      const marketListings = generateMarketListings(init.economicCycle, 6);
      const events = pickEvents(init, init.eventsPerYear ?? 3);
      return { ...init, marketListings, pendingEvents: events, currentEventIndex: 0, screen: 'game' };
    }

    case 'LOAD_SAVE': {
      return { ...action.payload, screen: 'game' };
    }

    case 'RESOLVE_EVENT': {
      const { eff = {}, flag, unsetFlag, fatal, keepUnrenovated, costPct, gainPct, targetProperty } = action.payload;
      let s = { ...state };

      if (flag)      s.flags = { ...s.flags, [flag]: true };
      if (unsetFlag) { const f = { ...s.flags }; delete f[unsetFlag]; s.flags = f; }

      if (eff.cash)         s.cash         = (s.cash ?? 0) + eff.cash;
      if (eff.personalCash) s.personalCash = Math.max(0, (s.personalCash ?? 0) + eff.personalCash);
      if (eff.stress)       s.stress       = clamp((s.stress ?? 0) + eff.stress, 0, STRESS_MAX);
      if (eff.val !== undefined) {
        s.valuation = Math.max(0, (s.valuation ?? 0) + eff.val);
        // Distribute val change across properties proportionally (unless properties eff handles it)
        if (!eff.properties && (s.propertyList ?? []).length > 0 && eff.val !== 0) {
          const total = (s.propertyList ?? []).reduce((sum, p) => sum + (p.value ?? 0), 0) || 1;
          s.propertyList = (s.propertyList ?? []).map(p => ({
            ...p,
            value: Math.max(1, Math.round((p.value ?? 0) + eff.val * ((p.value ?? 0) / total))),
          }));
        }
      }

      // Handle eff.properties — add/remove property records
      if (eff.properties) {
        const props = [...(s.propertyList ?? [])];
        if (eff.properties > 0) {
          const perUnit = eff.val && eff.val > 0 ? Math.max(10, Math.round(eff.val / eff.properties)) : 35;
          for (let k = 0; k < eff.properties; k++) props.push(genPropertyRecord(perUnit));
        } else {
          const removeCount = Math.min(-eff.properties, props.length);
          for (let k = 0; k < removeCount; k++) props.splice(Math.floor(Math.random() * props.length), 1);
        }
        s.propertyList = props;
        s.propertiesOwned = Math.max(0, (s.propertiesOwned ?? 0) + eff.properties);
        s.valuation = props.reduce((sum, p) => sum + (p.value ?? 0), 0);
      }

      // Track year finances
      if (eff.cash) s.currentYearFinance = { ...s.currentYearFinance, evenements: (s.currentYearFinance?.evenements ?? 0) + (eff.cash ?? 0) };

      if (costPct !== undefined && gainPct !== undefined && targetProperty) {
        const props = [...(s.propertyList ?? [])];
        const idx = props.findIndex(p => p.id === targetProperty.id);
        if (idx !== -1) {
          const prop = { ...props[idx] };
          const cost = Math.round((prop.value ?? prop.baseValue ?? 0) * costPct);
          const gain = Math.round((prop.value ?? prop.baseValue ?? 0) * gainPct);
          s.cash = (s.cash ?? 0) - cost;
          s.currentYearFinance = { ...s.currentYearFinance, renovations: (s.currentYearFinance?.renovations ?? 0) - cost };
          if (!keepUnrenovated) {
            prop.value = (prop.value ?? prop.baseValue ?? 0) + gain;
            prop.condition = 'renove';
            s.flags = { ...s.flags, everRenovated: true };
          }
          props[idx] = prop;
          s.propertyList = props;
          s.valuation = props.reduce((sum, p) => sum + (p.value ?? 0), 0);
        }
      }

      if (fatal) {
        const summary = buildRunSummary({ ...s, endingKind: 'fatal_event', over: true });
        appendHistory(summary);
        deleteSave();
        return { ...s, over: true, endingKind: 'fatal_event', screen: 'end' };
      }

      s.achievements = checkAchievements(s);

      const nextIndex = (s.currentEventIndex ?? 0) + 1;
      if (nextIndex >= (s.pendingEvents ?? []).length) {
        return advanceYear({ ...s, currentEventIndex: nextIndex });
      }

      return { ...s, currentEventIndex: nextIndex };
    }

    case 'BUY_PROPERTY': {
      const { listing } = action.payload;
      const s = { ...state };
      const loanInfo = calcLoanPayment(listing.price ?? listing.baseValue ?? 0);
      const downPayment = (listing.price ?? listing.baseValue ?? 0) - loanInfo.loanAmount;

      if (s.cash < downPayment) return s;

      const prop = {
        ...listing,
        id: listing.id ?? crypto.randomUUID(),
        condition: listing.condition ?? 'bonEtat',
        value: listing.price ?? listing.baseValue ?? 0,
        rented: false,
        yearPurchased: s.year,
      };

      const newLoan = {
        id: crypto.randomUUID(),
        propertyId: prop.id,
        balance: loanInfo.loanAmount,
        remaining: loanInfo.loanAmount,
        annualPayment: loanInfo.annualPayment,
        totalYearly: loanInfo.annualPayment,
        rate: loanInfo.rate,
        yearsRemaining: loanInfo.years ?? loanInfo.termYears ?? 20,
        lastNegotiatedYear: null,
      };

      const props = [...(s.propertyList ?? []), prop];
      const newState = {
        ...s,
        cash: s.cash - downPayment,
        propertyList: props,
        propertiesOwned: (s.propertiesOwned ?? 0) + 1,
        loans: loanInfo.loanAmount > 0 ? [...(s.loans ?? []), newLoan] : s.loans,
        valuation: props.reduce((sum, p) => sum + (p.value ?? 0), 0),
        flags: { ...s.flags, everHadLoan: loanInfo.loanAmount > 0 ? true : s.flags?.everHadLoan },
        currentYearFinance: { ...s.currentYearFinance, achats: (s.currentYearFinance?.achats ?? 0) - (prop.value ?? 0) },
      };
      newState.achievements = checkAchievements(newState);
      return newState;
    }

    case 'SELL_PROPERTY': {
      const { propertyId } = action.payload;
      const s = { ...state };
      const props = (s.propertyList ?? []).filter(p => p.id !== propertyId);
      const sold  = (s.propertyList ?? []).find(p => p.id === propertyId);
      if (!sold) return s;

      const loanToRepay = (s.loans ?? []).find(l => l.propertyId === propertyId);
      let cashGain = sold.value ?? 0;
      if (loanToRepay) cashGain -= loanToRepay.balance;

      const loans = (s.loans ?? []).filter(l => l.propertyId !== propertyId);
      return {
        ...s,
        cash: (s.cash ?? 0) + cashGain,
        propertyList: props,
        loans,
        valuation: props.reduce((sum, p) => sum + (p.value ?? 0), 0),
        currentYearFinance: { ...s.currentYearFinance, ventes: (s.currentYearFinance?.ventes ?? 0) + cashGain },
      };
    }

    case 'TOGGLE_RENT': {
      const { propertyId } = action.payload;
      const props = (state.propertyList ?? []).map(p => {
        if (p.id !== propertyId) return p;
        if (p.lastRentToggleYear === state.year) return p;
        return { ...p, rented: !p.rented, lastRentToggleYear: state.year };
      });
      return { ...state, propertyList: props };
    }

    case 'BUY_LUXURY': {
      const { item } = action.payload;
      const s = { ...state };
      if ((s.personalCash ?? 0) < item.price) return s;
      const newItems = [...(s.luxuryItems ?? []), { ...item, purchasePrice: item.price, currentValue: item.price, boughtYear: s.year }];
      const newState = {
        ...s,
        personalCash: (s.personalCash ?? 0) - item.price,
        luxuryItems: newItems,
        currentYearFinance: { ...s.currentYearFinance, patrimoine: (s.currentYearFinance?.patrimoine ?? 0) - item.price },
      };
      newState.achievements = checkAchievements(newState);
      return newState;
    }

    case 'SELL_LUXURY': {
      const { itemId } = action.payload;
      const s = { ...state };
      const item = (s.luxuryItems ?? []).find(i => i.id === itemId);
      if (!item) return s;
      const rawValue = item.currentValue !== undefined ? Math.round(item.currentValue) : item.price;
      const fee      = Math.round(rawValue * 0.10);
      const netValue = rawValue - fee;
      const items = (s.luxuryItems ?? []).filter(i => i.id !== itemId);
      return {
        ...s,
        personalCash: (s.personalCash ?? 0) + netValue,
        luxuryItems: items,
        currentYearFinance: { ...s.currentYearFinance, patrimoine: (s.currentYearFinance?.patrimoine ?? 0) + netValue },
      };
    }

    case 'BANK_WITHDRAW': {
      const { pct } = action.payload;
      const s = { ...state };
      if ((s.bankOpsThisYear ?? 0) >= 2) return s;
      if ((s.cash ?? 0) <= 0) return s;
      const amount = Math.round(s.cash * pct);
      const fee = Math.round(amount * 0.08);
      const net = amount - fee;
      return {
        ...s,
        cash: s.cash - amount,
        personalCash: (s.personalCash ?? 0) + net,
        bankOpsThisYear: (s.bankOpsThisYear ?? 0) + 1,
        currentYearFinance: { ...s.currentYearFinance, banque: (s.currentYearFinance?.banque ?? 0) - fee },
      };
    }

    case 'BANK_INJECT': {
      const { pct } = action.payload;
      const s = { ...state };
      if ((s.bankOpsThisYear ?? 0) >= 2) return s;
      if ((s.personalCash ?? 0) <= 0) return s;
      const amount = Math.round(s.personalCash * pct);
      const fee = Math.round(amount * 0.02);
      const net = amount - fee;
      return {
        ...s,
        personalCash: s.personalCash - amount,
        cash: (s.cash ?? 0) + net,
        bankOpsThisYear: (s.bankOpsThisYear ?? 0) + 1,
        currentYearFinance: { ...s.currentYearFinance, banque: (s.currentYearFinance?.banque ?? 0) - fee },
      };
    }

    case 'RENEGOTIATE_LOAN': {
      const { loanId } = action.payload;
      const loans = (state.loans ?? []).map(l => {
        if (l.id !== loanId || l.lastNegotiatedYear === state.year) return l;
        const reduction = 0.003 + Math.random() * 0.002;
        const newRate = Math.max(0.005, l.rate - reduction);
        const yrs = Math.max(1, l.yearsRemaining ?? 1);
        const newAnnual = Math.round(l.balance * (newRate / (1 - Math.pow(1 + newRate, -yrs))));
        return { ...l, rate: newRate, annualPayment: newAnnual, totalYearly: newAnnual, lastNegotiatedYear: state.year };
      });
      return { ...state, loans };
    }

    case 'MASS_REPAY_LOANS': {
      const totalDebt = (state.loans ?? []).reduce((s, l) => s + Math.round((l.balance ?? 0) * 1.03), 0);
      if ((state.cash ?? 0) < totalDebt) return state;
      return {
        ...state,
        cash: (state.cash ?? 0) - totalDebt,
        loans: [],
        flags: { ...state.flags, everPaidOffLoan: true },
        currentYearFinance: { ...state.currentYearFinance, credits: (state.currentYearFinance?.credits ?? 0) - totalDebt },
      };
    }

    case 'REPAY_LOAN': {
      const { loanId } = action.payload;
      const s = { ...state };
      const loan = (s.loans ?? []).find(l => l.id === loanId);
      if (!loan || (s.cash ?? 0) < Math.round(loan.balance * 1.03)) return s;
      const payoffCost = Math.round(loan.balance * 1.03);
      const newState = {
        ...s,
        cash: (s.cash ?? 0) - payoffCost,
        loans: (s.loans ?? []).filter(l => l.id !== loanId),
        flags: { ...s.flags, everPaidOffLoan: true },
        currentYearFinance: { ...s.currentYearFinance, credits: (s.currentYearFinance?.credits ?? 0) - payoffCost },
      };
      newState.achievements = checkAchievements(newState);
      return newState;
    }

    case 'RETIRE': {
      if (state.age < RETIREMENT_MIN_AGE) return state;
      const newState = { ...state, over: true, endingKind: 'retirement' };
      newState.achievements = checkAchievements(newState);
      const summary = buildRunSummary(newState);
      appendHistory(summary);
      deleteSave();
      return { ...newState, screen: 'end' };
    }

    case 'REFRESH_MARKET': {
      return {
        ...state,
        marketListings: generateMarketListings(state.economicCycle, 6),
      };
    }

    case 'SET_SCREEN': {
      return { ...state, screen: action.payload };
    }

    case 'RESET': {
      deleteSave();
      return { screen: 'landing' };
    }

    default:
      return state;
  }
}

// ─── Year advancement ────────────────────────────────────────────────────────

function advanceYear(state) {
  let s = { ...state };

  // Archive current year finances
  const priorYearsFinance = {};
  for (const k in s.currentYearFinance) {
    priorYearsFinance[k] = (s.priorYearsFinance?.[k] ?? 0) + (s.currentYearFinance[k] ?? 0);
  }
  s.priorYearsFinance = priorYearsFinance;
  s.currentYearFinance = { loyers: 0, ventes: 0, achats: 0, credits: 0, renovations: 0, evenements: 0, banque: 0, patrimoine: 0 };

  s.year += 1;
  s.age  += 1;
  s.bankOpsThisYear = 0;
  s.eventsPerYear = 3 + Math.floor(Math.random() * 3);

  s.economicCycle = nextEconomicCycle(s.economicCycle);

  // Salary draw (cash → personalCash), scaled by stage
  const salaryBase  = SALARY_AMOUNTS[s.salary ?? s.salaryLevel ?? 'none'] ?? 0;
  const stageScale  = STAGE_MULTIPLIERS[stageFor(s.year)] ?? 1;
  const salaryDraw  = Math.round(salaryBase * stageScale);
  if (salaryDraw > 0) {
    s.cash        = (s.cash ?? 0) - salaryDraw;
    s.personalCash = (s.personalCash ?? 0) + salaryDraw;
  }

  const rentIncome = collectRents(s.propertyList ?? []);
  s.cash = (s.cash ?? 0) + rentIncome;
  if (rentIncome > 0) s.currentYearFinance.loyers += rentIncome;

  const { loans, cashDelta } = amortizeLoans(s.loans ?? [], s.cash);
  s.loans = loans;
  s.cash  = (s.cash ?? 0) + cashDelta;
  if (cashDelta < 0) s.currentYearFinance.credits += cashDelta;

  s.propertyList = appreciateProperties(s.propertyList ?? [], s.economicCycle);
  s.valuation = (s.propertyList ?? []).reduce((sum, p) => sum + (p.value ?? 0), 0);

  s.luxuryItems = (s.luxuryItems ?? []).map(item => {
    const current = item.currentValue !== undefined ? item.currentValue : item.price;
    return { ...item, currentValue: Math.max(1, Math.round(current * (1 + (item.yearlyDrift ?? 0)))) };
  });

  const traitDelta = applyTraitEffect(s.traitId, s);
  if (traitDelta.cash)   s.cash      = (s.cash ?? 0) + traitDelta.cash;
  if (traitDelta.val)    s.valuation = Math.max(0, (s.valuation ?? 0) + traitDelta.val);
  if (traitDelta.stress) s.stress    = clamp((s.stress ?? 0) + traitDelta.stress, 0, STRESS_MAX);

  // Flag checks
  if (!s.flags?.billionaireBefore45 && s.valuation >= 1000000 && s.age < 45) {
    s.flags = { ...s.flags, billionaireBefore45: true };
  }
  if (!s.flags?.twentyPropsBefore50 && (s.propertiesOwned ?? 0) >= 20 && s.age < 50) {
    s.flags = { ...s.flags, twentyPropsBefore50: true };
  }

  s.achievements = checkAchievements(s);
  s.marketListings = generateMarketListings(s.economicCycle, 6);
  s.pendingEvents = pickEvents(s, s.eventsPerYear ?? 3);
  s.currentEventIndex = 0;

  if (s.stress >= STRESS_MAX) {
    const summary = buildRunSummary({ ...s, endingKind: 'burnout', over: true });
    appendHistory(summary);
    deleteSave();
    return { ...s, over: true, endingKind: 'burnout', screen: 'end' };
  }
  if (s.age >= GAME_OVER_MAX_AGE) {
    const summary = buildRunSummary({ ...s, endingKind: 'age_limit', over: true });
    appendHistory(summary);
    deleteSave();
    return { ...s, over: true, endingKind: 'age_limit', screen: 'end' };
  }

  saveGame(s);
  return s;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { screen: 'landing' });

  const startGame    = useCallback((opts) => dispatch({ type: 'START_GAME',    payload: opts }), []);
  const loadSave     = useCallback((s)    => dispatch({ type: 'LOAD_SAVE',     payload: s }),    []);
  const resolveEvent = useCallback((p)    => dispatch({ type: 'RESOLVE_EVENT', payload: p }),    []);
  const buyProperty  = useCallback((l)    => dispatch({ type: 'BUY_PROPERTY',  payload: { listing: l } }), []);
  const sellProperty = useCallback((id)   => dispatch({ type: 'SELL_PROPERTY', payload: { propertyId: id } }), []);
  const toggleRent   = useCallback((id)   => dispatch({ type: 'TOGGLE_RENT',   payload: { propertyId: id } }), []);
  const buyLuxury    = useCallback((item) => dispatch({ type: 'BUY_LUXURY',    payload: { item } }), []);
  const sellLuxury   = useCallback((id)   => dispatch({ type: 'SELL_LUXURY',   payload: { itemId: id } }), []);
  const retire       = useCallback(()     => dispatch({ type: 'RETIRE' }), []);
  const repayLoan       = useCallback((id)  => dispatch({ type: 'REPAY_LOAN',        payload: { loanId: id } }), []);
  const renegotiateLoan = useCallback((id)  => dispatch({ type: 'RENEGOTIATE_LOAN',  payload: { loanId: id } }), []);
  const massRepayLoans  = useCallback(()    => dispatch({ type: 'MASS_REPAY_LOANS' }), []);
  const bankWithdraw = useCallback((pct)  => dispatch({ type: 'BANK_WITHDRAW', payload: { pct } }), []);
  const bankInject   = useCallback((pct)  => dispatch({ type: 'BANK_INJECT',   payload: { pct } }), []);
  const refreshMarket= useCallback(()     => dispatch({ type: 'REFRESH_MARKET' }), []);
  const setScreen    = useCallback((scr)  => dispatch({ type: 'SET_SCREEN',    payload: scr }), []);
  const resetGame    = useCallback(()     => dispatch({ type: 'RESET' }), []);

  const value = {
    state, dispatch,
    startGame, loadSave, resolveEvent,
    buyProperty, sellProperty, toggleRent,
    buyLuxury, sellLuxury,
    retire, repayLoan, renegotiateLoan, massRepayLoans,
    bankWithdraw, bankInject,
    refreshMarket, setScreen, resetGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
