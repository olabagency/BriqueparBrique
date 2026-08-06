import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { freshState, buildRunSummary } from '../engine/gameState.js';
import { saveGame, loadGame, deleteSave, appendHistory } from '../engine/saveLoad.js';
import { pushGlobalScore } from '../engine/globalScores.js';
import { syncActiveGame, removeActiveGame, pushFinishedGame } from '../engine/firebaseGame.js';
import { removePresence } from '../engine/presence.js';
import { pushLiveNotification } from '../engine/liveNotifications.js';
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
import tenantEvents from '../data/tenant_events.json';
import networkEvents from '../data/network_events.json';
import econEvents from '../data/economic_events.json';
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

function notifyNewAchievements(name, oldList, newList) {
  if (!name) return;
  const newly = newList.filter(id => !oldList.includes(id));
  for (const id of newly) {
    const ach = achievements.find(a => a.id === id);
    if (ach) pushLiveNotification({ name, action: `a débloqué « ${ach.title} »` });
  }
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

  // Tenant events — only when there are rented properties
  const rentedProps = props.filter(p => p.rented);
  if (rentedProps.length > 0) {
    for (const e of tenantEvents) {
      eligible.push({
        ...e,
        _pool: 'tenant',
        _targetProperty: rentedProps[Math.floor(Math.random() * rentedProps.length)],
      });
    }
  }

  // Split pools by cash polarity
  const immoPool  = eligible.filter(e => e._pool === 'immo' || e._pool === 'reno' || e._pool === 'tenant');
  const immoPos   = immoPool.filter(e => e.choices?.some(c => (c.eff?.cash ?? 0) > 0));
  const persoPos  = eligible.filter(e => e._pool === 'perso' && e.choices?.some(c => (c.eff?.cash ?? 0) > 0 || (c.eff?.personalCash ?? 0) > 0));
  const persoPool = eligible.filter(e => e._pool === 'perso');
  const result = [];

  // Guarantee 1 positive-cash perso event per batch (if any available)
  if (persoPos.length > 0) {
    const idx = Math.floor(Math.random() * persoPos.length);
    result.push(persoPos[idx]);
    persoPool.splice(persoPool.indexOf(persoPos[idx]), 1);
  }

  // Guarantee 1 positive-cash immo event per batch when player owns at least 1 property
  const hasProperties = (state.propertyList ?? []).length > 0;
  if (hasProperties && immoPos.length > 0) {
    const idx = Math.floor(Math.random() * immoPos.length);
    result.push(immoPos[idx]);
    immoPool.splice(immoPool.indexOf(immoPos[idx]), 1);
  }

  // Fill remaining slots: 60% immo, 40% perso
  for (let i = result.length; i < count; i++) {
    const wantImmo = immoPool.length > 0 && (persoPool.length === 0 || Math.random() < 0.60);
    const pool = wantImmo ? immoPool : (persoPool.length > 0 ? persoPool : immoPool);
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Network contact events — one-time introductions, 30% chance/year after year 3
  if (state.year >= 3) {
    const unseen = networkEvents.filter(e => e.excludeFlag && !state.flags?.[e.excludeFlag]);
    if (unseen.length > 0 && Math.random() < 0.30) {
      result.push({ ...unseen[0], _pool: 'network' });
    }
  }

  // Economic events — rare macro shocks, only after age 30, 20% chance/year
  if (state.age >= 30 && Math.random() < 0.20) {
    const econ = econEvents[Math.floor(Math.random() * econEvents.length)];
    result.push({ ...econ, _pool: 'economic' });
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
      const { eff = {}, flag, unsetFlag, fatal, keepUnrenovated, costPct, gainPct, targetProperty, contact, valMultiplier, eventPool } = action.payload;
      let s = { ...state };

      if (flag)      s.flags = { ...s.flags, [flag]: true };
      if (unsetFlag) { const f = { ...s.flags }; delete f[unsetFlag]; s.flags = f; }

      // Network contact unlock
      if (contact && !(s.contacts ?? []).includes(contact)) {
        s.contacts = [...(s.contacts ?? []), contact];
      }

      // Economic event: apply portfolio-wide value multiplier
      if (valMultiplier !== undefined && (s.propertyList ?? []).length > 0) {
        s.propertyList = s.propertyList.map(p => ({
          ...p,
          value: Math.max(1, Math.round((p.value ?? 0) * valMultiplier)),
        }));
        s.valuation = s.propertyList.reduce((sum, p) => sum + (p.value ?? 0), 0);
      }

      if (eff.cash)         s.cash         = (s.cash ?? 0) + eff.cash;
      if (eff.personalCash) s.personalCash = Math.max(0, (s.personalCash ?? 0) + eff.personalCash);
      if (eff.stress)       s.stress       = clamp((s.stress ?? 0) + eff.stress, 0, STRESS_MAX);
      if (eff.setSalary)    s.salary       = eff.setSalary;
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

      // Push live notification for big cash swings
      if (s.name && eff.cash) {
        if (eff.cash >= 25) pushLiveNotification({ name: s.name, action: `vient de gagner ${eff.cash}k€ en trésorerie` });
        else if (eff.cash <= -50) pushLiveNotification({ name: s.name, action: `a perdu ${Math.abs(eff.cash)}k€ sur un événement` });
      }

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
        pushGlobalScore(summary);
        pushFinishedGame(summary);
        removePresence();
        removeActiveGame();
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
      const { listing, apportPct } = action.payload;
      const s = { ...state };
      const hasAgent = (s.contacts ?? []).includes('agent_immo');
      const basePrice = listing.price ?? listing.baseValue ?? 0;
      const effectivePrice = hasAgent ? Math.round(basePrice * 0.95) : basePrice;
      // apportPct in [0,1]: fraction paid upfront. loanRate = 1 - apportPct
      const loanRate = apportPct != null ? Math.max(0, 1 - apportPct) : PROPERTY_LOAN_RATE;
      const loanInfo = calcLoanPayment(effectivePrice, loanRate);
      const downPayment = effectivePrice - loanInfo.loanAmount;

      if (s.cash < downPayment) return s;

      const prop = {
        ...listing,
        id: listing.id ?? crypto.randomUUID(),
        condition: listing.condition ?? 'bonEtat',
        value: effectivePrice,
        baseValue: effectivePrice,
        rented: false,
        yearPurchased: s.year,
      };

      const newLoan = {
        id: crypto.randomUUID(),
        propertyId: prop.id,
        balance: loanInfo.loanAmount,
        remaining: loanInfo.loanAmount,
        originalAmount: loanInfo.loanAmount,
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
      const prevAchsBuy = s.achievements ?? [];
      newState.achievements = checkAchievements(newState);
      if (s.name) pushLiveNotification({ name: s.name, action: `vient d'acheter un ${prop.type} à ${prop.place}` });
      notifyNewAchievements(newState.name, prevAchsBuy, newState.achievements);
      return newState;
    }

    case 'SELL_PROPERTY': {
      const { propertyId } = action.payload;
      const s = { ...state };
      const props = (s.propertyList ?? []).filter(p => p.id !== propertyId);
      const sold  = (s.propertyList ?? []).find(p => p.id === propertyId);
      if (!sold) return s;

      const loanToRepay = (s.loans ?? []).find(l => l.propertyId === propertyId);
      // Rented property: 5% penalty (tenant in place = buyer discount)
      const baseValue = sold.value ?? 0;
      const saleValue = sold.rented ? Math.round(baseValue * 0.95) : baseValue;
      let cashGain = saleValue;
      if (loanToRepay) cashGain -= loanToRepay.balance;

      const loans = (s.loans ?? []).filter(l => l.propertyId !== propertyId);
      const pctGain = sold.value > 0 && sold.yearPurchased
        ? Math.round(((saleValue - (sold.baseValue ?? sold.value)) / (sold.baseValue ?? sold.value)) * 100)
        : null;
      if (s.name) {
        const gainStr = pctGain !== null && pctGain !== 0 ? ` (${pctGain > 0 ? '+' : ''}${pctGain}%)` : '';
        pushLiveNotification({ name: s.name, action: `a revendu son ${sold.type}${gainStr}` });
      }
      return {
        ...s,
        cash: (s.cash ?? 0) + cashGain,
        propertyList: props,
        loans,
        valuation: props.reduce((sum, p) => sum + (p.value ?? 0), 0),
        currentYearFinance: { ...s.currentYearFinance, ventes: (s.currentYearFinance?.ventes ?? 0) + cashGain },
      };
    }

    case 'RENOVATE_PROPERTY': {
      const { propertyId, costPct, gainPct, keepUnrenovated, stress: renoStress } = action.payload;
      const s = { ...state };
      const props = [...(s.propertyList ?? [])];
      const idx = props.findIndex(p => p.id === propertyId);
      if (idx === -1) return s;
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
      if (renoStress) s.stress = clamp((s.stress ?? 0) + renoStress, 0, STRESS_MAX);
      props[idx] = prop;
      s.propertyList = props;
      s.valuation = props.reduce((sum, p) => sum + (p.value ?? 0), 0);
      s.achievements = checkAchievements(s);
      if (s.name && !keepUnrenovated) pushLiveNotification({ name: s.name, action: `a rénové son ${prop.type ?? 'bien'}` });
      return s;
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
      // Stress relief proportional to price: sqrt(price) * 1.5, capped at 20
      const stressRelief = Math.min(20, Math.round(Math.sqrt(item.price) * 1.5));
      const newItems = [...(s.luxuryItems ?? []), { ...item, purchasePrice: item.price, currentValue: item.price, boughtYear: s.year }];
      const newState = {
        ...s,
        personalCash: (s.personalCash ?? 0) - item.price,
        stress: clamp((s.stress ?? 0) - stressRelief, 0, STRESS_MAX),
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
      const loan = (state.loans ?? []).find(l => l.id === loanId);
      if (!loan || loan.lastNegotiatedYear === state.year) return state;

      const fee = Math.round((loan.balance ?? 0) * 0.01);
      if ((state.cash ?? 0) < fee) return { ...state, lastRenegotiationResult: { loanId, success: false, reason: 'insufficient_funds', fee } };

      const success = Math.random() < 0.65;
      const rateBefore = loan.rate;
      const reduction = success ? (0.003 + Math.random() * 0.002) : 0;
      const newRate = success ? Math.max(0.005, rateBefore - reduction) : rateBefore;
      const yrs = Math.max(1, loan.yearsRemaining ?? 1);
      const newAnnual = success ? Math.round(loan.balance * (newRate / (1 - Math.pow(1 + newRate, -yrs)))) : (loan.annualPayment ?? loan.totalYearly);

      const loans = (state.loans ?? []).map(l => {
        if (l.id !== loanId) return l;
        return { ...l, rate: newRate, annualPayment: newAnnual, totalYearly: newAnnual, lastNegotiatedYear: state.year };
      });

      return {
        ...state,
        cash: (state.cash ?? 0) - fee,
        loans,
        lastRenegotiationResult: { loanId, success, rateBefore, rateAfter: newRate, saving: success ? (loan.annualPayment ?? 0) - newAnnual : 0, fee },
        currentYearFinance: { ...state.currentYearFinance, credits: (state.currentYearFinance?.credits ?? 0) - fee },
      };
    }

    case 'CLEAR_RENEGOTIATION_RESULT':
      return { ...state, lastRenegotiationResult: null };

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
      pushGlobalScore(summary);
      pushFinishedGame(summary);
      removePresence();
      removeActiveGame();
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

    case 'DISMISS_YEAR_REPORT':
      return { ...state, yearReport: null };

    case 'SET_SALARY': {
      const { level } = action.payload;
      if (!SALARY_AMOUNTS[level] !== undefined) return state;
      return { ...state, salary: level, lastSalaryChangeYear: state.year };
    }

    default:
      return state;
  }
}

// ─── Year advancement ────────────────────────────────────────────────────────

function advanceYear(state) {
  let s = { ...state };

  // Snapshot before archiving — used for year report
  const lastYearFinance = { ...s.currentYearFinance };
  const prevYear = s.year;
  const prevAge  = s.age;

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

  // Management stress: 1 point per rented property (capped at 8)
  const rentedCount = (s.propertyList ?? []).filter(p => p.rented).length;
  const mgmtStress  = Math.min(rentedCount, 8);
  if (mgmtStress > 0) s.stress = clamp((s.stress ?? 0) + mgmtStress, 0, STRESS_MAX);

  // Debt stress: negative cash adds stress every year
  const cashAfterRent = s.cash ?? 0;
  if (cashAfterRent < -500) {
    s.stress = clamp((s.stress ?? 0) + 18, 0, STRESS_MAX);
  } else if (cashAfterRent < -200) {
    s.stress = clamp((s.stress ?? 0) + 10, 0, STRESS_MAX);
  } else if (cashAfterRent < 0) {
    s.stress = clamp((s.stress ?? 0) + 5, 0, STRESS_MAX);
  }

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
  if (!s.flags?.billionaireBefore45 && s.valuation >= 10000 && s.age < 45) {
    s.flags = { ...s.flags, billionaireBefore45: true };
  }
  if (!s.flags?.twentyPropsBefore50 && (s.propertiesOwned ?? 0) >= 20 && s.age < 50) {
    s.flags = { ...s.flags, twentyPropsBefore50: true };
  }

  const contacts = s.contacts ?? [];

  // Contact bonuses
  if (contacts.includes('expert_comptable')) {
    s.stress = clamp(s.stress - 3, 0, STRESS_MAX);
  }
  if (contacts.includes('courtier') && (s.loans ?? []).length > 0) {
    const courtierSaving = (s.loans ?? []).length * 3;
    s.cash = (s.cash ?? 0) + courtierSaving;
  }

  s.achievements = checkAchievements(s);

  // Wealth history snapshot for charts
  s.wealthHistory = [...(s.wealthHistory ?? []), {
    year: s.year, age: s.age, valuation: s.valuation,
    cash: s.cash, personalCash: s.personalCash ?? 0,
  }];

  // Year report data (shown as modal at start of new year)
  s.yearReport = {
    year: prevYear,
    age: prevAge,
    finance: lastYearFinance,
    stress: s.stress,
    valuation: s.valuation,
    cash: s.cash,
    propCount: (s.propertyList ?? []).length,
    rentedCount: (s.propertyList ?? []).filter(p => p.rented).length,
    contacts: [...contacts],
    courtierSaving: contacts.includes('courtier') ? (s.loans ?? []).length * 3 : 0,
  };

  const listingCount = contacts.includes('notaire') ? 8 : 6;
  s.marketListings = generateMarketListings(s.economicCycle, listingCount);
  s.pendingEvents = pickEvents(s, s.eventsPerYear ?? 3);
  s.currentEventIndex = 0;

  // Insolvency check: cash below what can be mobilised (30% of portfolio + personal savings)
  const insolvencyThreshold = Math.min(-50, -((s.valuation ?? 0) * 0.3 + (s.personalCash ?? 0)));
  if ((s.cash ?? 0) < insolvencyThreshold) {
    const summary = buildRunSummary({ ...s, endingKind: 'insolvency', over: true });
    appendHistory(summary);
    pushGlobalScore(summary);
    pushFinishedGame(summary);
    removePresence();
    removeActiveGame();
    deleteSave();
    return { ...s, over: true, endingKind: 'insolvency', screen: 'end' };
  }

  if (s.stress >= STRESS_MAX) {
    const summary = buildRunSummary({ ...s, endingKind: 'burnout', over: true });
    appendHistory(summary);
    pushGlobalScore(summary);
    pushFinishedGame(summary);
    removePresence();
    removeActiveGame();
    deleteSave();
    return { ...s, over: true, endingKind: 'burnout', screen: 'end' };
  }
  if (s.age >= GAME_OVER_MAX_AGE) {
    const summary = buildRunSummary({ ...s, endingKind: 'age_limit', over: true });
    appendHistory(summary);
    pushGlobalScore(summary);
    pushFinishedGame(summary);
    removePresence();
    removeActiveGame();
    deleteSave();
    return { ...s, over: true, endingKind: 'age_limit', screen: 'end' };
  }

  saveGame(s);
  syncActiveGame(s);
  return s;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { screen: 'landing' });

  const startGame    = useCallback((opts) => dispatch({ type: 'START_GAME',    payload: opts }), []);
  const loadSave     = useCallback((s)    => dispatch({ type: 'LOAD_SAVE',     payload: s }),    []);
  const resolveEvent = useCallback((p)    => dispatch({ type: 'RESOLVE_EVENT', payload: p }),    []);
  const buyProperty  = useCallback((l, apportPct) => dispatch({ type: 'BUY_PROPERTY',  payload: { listing: l, apportPct } }), []);
  const sellProperty = useCallback((id)   => dispatch({ type: 'SELL_PROPERTY', payload: { propertyId: id } }), []);
  const toggleRent       = useCallback((id)   => dispatch({ type: 'TOGGLE_RENT',       payload: { propertyId: id } }), []);
  const renovateProperty = useCallback((p)    => dispatch({ type: 'RENOVATE_PROPERTY', payload: p }), []);
  const buyLuxury    = useCallback((item) => dispatch({ type: 'BUY_LUXURY',    payload: { item } }), []);
  const sellLuxury   = useCallback((id)   => dispatch({ type: 'SELL_LUXURY',   payload: { itemId: id } }), []);
  const retire       = useCallback(()     => dispatch({ type: 'RETIRE' }), []);
  const repayLoan       = useCallback((id)  => dispatch({ type: 'REPAY_LOAN',        payload: { loanId: id } }), []);
  const renegotiateLoan = useCallback((id)  => dispatch({ type: 'RENEGOTIATE_LOAN',  payload: { loanId: id } }), []);
  const clearRenegotiationResult = useCallback(() => dispatch({ type: 'CLEAR_RENEGOTIATION_RESULT' }), []);
  const massRepayLoans  = useCallback(()    => dispatch({ type: 'MASS_REPAY_LOANS' }), []);
  const bankWithdraw = useCallback((pct)  => dispatch({ type: 'BANK_WITHDRAW', payload: { pct } }), []);
  const bankInject   = useCallback((pct)  => dispatch({ type: 'BANK_INJECT',   payload: { pct } }), []);
  const changeSalary = useCallback((level) => dispatch({ type: 'SET_SALARY', payload: { level } }), []);
  const refreshMarket      = useCallback(()    => dispatch({ type: 'REFRESH_MARKET' }), []);
  const setScreen          = useCallback((scr) => dispatch({ type: 'SET_SCREEN',    payload: scr }), []);
  const dismissYearReport  = useCallback(()    => dispatch({ type: 'DISMISS_YEAR_REPORT' }), []);
  const resetGame    = useCallback(()     => dispatch({ type: 'RESET' }), []);

  const value = {
    state, dispatch,
    startGame, loadSave, resolveEvent,
    buyProperty, sellProperty, toggleRent, renovateProperty,
    buyLuxury, sellLuxury,
    retire, repayLoan, renegotiateLoan, clearRenegotiationResult, massRepayLoans,
    bankWithdraw, bankInject, changeSalary,
    refreshMarket, setScreen, resetGame, dismissYearReport,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
