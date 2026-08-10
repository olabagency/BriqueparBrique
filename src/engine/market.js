import {
  PROPERTY_CONDITION_VALUES,
  PROPERTY_LOAN_RATE,
  PROPERTY_LOAN_INTEREST,
  PROPERTY_RENT_RATIO,
  RENT_CYCLE_MULT,
} from '../config.js';
import propertyData from '../data/property_data.json';
import { randInt, shuffleArray } from './utils.js';

const CYCLE_MULT = {
  boom:   1.25,
  hausse: 1.15,
  neutre: 1.0,
  baisse: 0.85,
  crash:  0.65,
};

/**
 * Generate a single property listing.
 * @param {string} cycle  'hausse' | 'neutre' | 'baisse'
 */
function generateListing(cycle) {
  const types  = propertyData.types;
  const places = propertyData.places;
  const conds  = propertyData.conditions;

  const type      = types[randInt(0, types.length - 1)];
  const place     = places[randInt(0, places.length - 1)];
  const condition = conds[randInt(0, conds.length - 1)];

  const range  = propertyData.baseValues[type];
  const base   = randInt(range.min, range.max);
  const condMult = PROPERTY_CONDITION_VALUES[condition] ?? 1;
  const cycleMult = CYCLE_MULT[cycle] ?? 1;

  const price = Math.round(base * condMult * cycleMult);

  // Energy class: weighted towards lower ratings (most old properties are E-G)
  const energyWeights = [['A',2],['B',4],['C',10],['D',18],['E',28],['F',23],['G',15]];
  const totalW = energyWeights.reduce((s,[,w]) => s + w, 0);
  let rng = Math.random() * totalW, energyClass = 'E';
  for (const [cls, w] of energyWeights) { rng -= w; if (rng <= 0) { energyClass = cls; break; } }

  return {
    id:        crypto.randomUUID(),
    type,
    place,
    condition,
    price,              // ask price in k€
    baseValue: price,   // market value used for rent/loan calc
    energyClass,
  };
}

function generateOffMarketListing(cycle) {
  const listing = generateListing(cycle);
  // Off-market: 8-14% below ask price (negotiated privately)
  const discount = 0.08 + Math.random() * 0.06;
  listing.price = Math.round(listing.price * (1 - discount));
  listing.baseValue = listing.price;
  listing.offMarket = true;
  return listing;
}

const EXCEPTIONAL_PLACES = [
  'Monaco Port Hercule',
  'Cap d\'Antibes prestige',
  'Saint-Jean-Cap-Ferrat',
  'avenue Montaigne Paris 8e',
  'Courchevel 1850 Domaine',
  'Saint-Tropez Pampelonne',
  'île de Ré prestige',
  'Megève Grand Hôtel',
  'parc Monceau Paris 8e',
  'Cannes Croisette privée',
];

function generateExceptionalListing(cycle) {
  const types = propertyData.exceptionalTypes ?? [];
  if (types.length === 0) return null;
  const type  = types[randInt(0, types.length - 1)];
  const place = EXCEPTIONAL_PLACES[randInt(0, EXCEPTIONAL_PLACES.length - 1)];

  const range = propertyData.baseValues[type];
  if (!range) return null;
  const base      = randInt(range.min, range.max);
  const cycleMult = CYCLE_MULT[cycle] ?? 1;
  const price     = Math.round(base * cycleMult);

  const energyClass = Math.random() < 0.65 ? 'A' : 'B';

  return {
    id:         crypto.randomUUID(),
    type,
    place,
    condition:  'standing',
    price,
    baseValue:  price,
    energyClass,
    exceptional: true,
  };
}

/**
 * Generate a fresh set of market listings.
 * Always appends locked teaser listings when the player lacks the contact,
 * so they're visible but blurred in the UI to give motivation.
 *
 * @param {string} cycle           economic cycle
 * @param {number} count           number of standard listings
 * @param {number} offMarketCount  unlocked off-market listings (notaire); 0 = no notaire
 * @param {number} exceptionalCount unlocked exceptional listings (chasseur); 0 = no chasseur
 * @returns {object[]}
 */
export function generateMarketListings(cycle = 'neutre', count = 6, offMarketCount = 0, exceptionalCount = 0) {
  const listings = [];
  for (let i = 0; i < count; i++) listings.push(generateListing(cycle));

  // Off-market (notaire): real unlocked listings, then locked teasers if none
  for (let i = 0; i < offMarketCount; i++) listings.push(generateOffMarketListing(cycle));
  if (offMarketCount === 0) {
    for (let i = 0; i < 2; i++) {
      const l = generateOffMarketListing(cycle);
      l.locked = 'notaire';
      listings.push(l);
    }
  }

  // Exceptional (chasseur): real unlocked listings, then 1 locked teaser if none
  for (let i = 0; i < exceptionalCount; i++) {
    const l = generateExceptionalListing(cycle);
    if (l) listings.push(l);
  }
  if (exceptionalCount === 0) {
    const l = generateExceptionalListing(cycle);
    if (l) { l.locked = 'chasseur_exception'; listings.push(l); }
  }

  return listings;
}

/**
 * Calculate the annual rent for a property.
 * @param {object} property
 * @returns {number}  annual rent in k€
 */
export function calcRent(property) {
  const condMult = PROPERTY_CONDITION_VALUES[property.condition] ?? 1;
  const val = property.value ?? property.baseValue ?? 0;
  return Math.round(val * condMult * PROPERTY_RENT_RATIO);
}

/**
 * Calculate monthly loan payment (annuité mensuelle) in k€.
 * Uses a simple constant annuity formula.
 *
 * @param {number} price        — property price in k€
 * @param {number} loanRate     — fraction financed (default from config)
 * @param {number} interest     — annual interest rate (default from config)
 * @param {number} termYears    — loan duration in years
 * @returns {{ loanAmount, monthlyPayment, totalYearly }}
 */
export function calcLoanPayment(
  price,
  loanRate    = PROPERTY_LOAN_RATE,
  interest    = PROPERTY_LOAN_INTEREST,
  termYears   = 20,
) {
  const loanAmount = Math.round(price * loanRate);
  const n  = termYears * 12;
  const r  = interest / 12;

  let monthlyPayment;
  if (r === 0) {
    monthlyPayment = loanAmount / n;
  } else {
    monthlyPayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const annualPayment = Math.round(monthlyPayment * 12 * 10) / 10;
  return {
    loanAmount,
    monthlyPayment: Math.round(monthlyPayment * 10) / 10,
    totalYearly:    annualPayment,
    annualPayment,
    years:          termYears,
    termYears,
    rate:           interest,
    interestRate:   interest,
  };
}

/**
 * Apply one year of loan amortization to all active loans.
 * Deducts yearly payments from cash and reduces remaining balance.
 *
 * @param {object[]} loans   — current loan array
 * @param {number}   cash    — current business cash
 * @returns {{ loans: object[], cashDelta: number }}
 */
export function amortizeLoans(loans, cash) {
  let cashDelta = 0;
  const updated = loans
    .map((loan) => {
      const payment = loan.annualPayment ?? loan.totalYearly ?? 0;
      cashDelta -= payment;
      const balance = Math.max(0, (loan.balance ?? loan.remaining ?? loan.loanAmount ?? 0) - payment);
      const yearsRemaining = Math.max(1, (loan.yearsRemaining ?? loan.termYears ?? 20) - 1);
      return { ...loan, balance, remaining: balance, yearsRemaining };
    })
    .filter((loan) => loan.balance > 0);

  return { loans: updated, cashDelta };
}

/**
 * Advance property values by one year, applying cycle drift and random noise.
 * @param {object[]} properties
 * @param {string}   cycle
 * @returns {object[]}  updated properties
 */
export function appreciateProperties(properties, cycle = 'neutre') {
  const baseDrift = { boom: 0.12, hausse: 0.05, neutre: 0.02, baisse: -0.03, crash: -0.15 }[cycle] ?? 0.02;

  return properties.map((p) => {
    const noise   = (Math.random() - 0.5) * 0.04;
    const growth  = baseDrift + noise;
    const current = p.value ?? p.baseValue ?? 0;
    const newVal  = Math.round(current * (1 + growth));
    return { ...p, value: newVal, baseValue: newVal };
  });
}

/**
 * Pick the next economic cycle randomly.
 * Late game (year >= 15): 8% crash risk, 5% boom.
 * @param {string} current — current cycle
 * @param {number} year    — current game year
 * @returns {string}
 */
export function nextEconomicCycle(current, year = 1) {
  const r = Math.random();
  if (year >= 15 && r < 0.08) return 'crash';
  if (r < 0.05) return 'boom';
  if (r < 0.28) return 'hausse';
  if (r < 0.55) return 'baisse';
  return 'neutre';
}

/**
 * Collect all rents from rented properties for the year.
 * Applies an economic cycle multiplier (baisse = vacances, hausse = forte demande).
 * @param {object[]} properties
 * @param {string}   cycle  'hausse' | 'neutre' | 'baisse'
 * @returns {number}  total rent in k€
 */
export function collectRents(properties, cycle = 'neutre') {
  const cycleMult = RENT_CYCLE_MULT[cycle] ?? 0.95;
  return properties
    .filter((p) => p.rented)
    .reduce((sum, p) => sum + Math.round(calcRent(p) * cycleMult), 0);
}
