import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash, fmtMonthly } from '../../engine/utils.js';
import { calcLoanPayment } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';
import { LOAN_RATE_SCALE, MAX_ACTIVE_LOANS, LTV_MAX_RATIO, NOTAIRE_FEES_PCT } from '../../config.js';

const CYCLE_LABELS = { boom: '🚀 Boom immobilier', hausse: '📈 Marché haussier', neutre: '➡️ Marché neutre', baisse: '📉 Marché baissier', crash: '💥 Krach immobilier' };
const COND_EMOJI = { bonEtat: '✅', aRenover: '🔨', renove: '⭐', standing: '💎', incendie: '🔥' };
const ENERGY_COLOR = { A:'#22c55e',B:'#84cc16',C:'#a3e635',D:'#facc15',E:'#fb923c',F:'#f87171',G:'#ef4444' };
const MIN_APPORT_PCT = 10;
const TYPE_EMOJI = {
  'Studio':               '🛏️',
  'Appartement T2':       '🏠',
  'Appartement T3':       '🏢',
  'Duplex':               '🏘️',
  'Maison':               '🏡',
  'Loft':                 '✨',
  'Immeuble de rapport':  '🏗️',
  'Local commercial':     '🏪',
  'Terrain':              '🌿',
  'Parking':              '🚗',
};

function PurchaseConfigurator({ listing, effectivePrice, cash, loans, valuation, onConfirm, onCancel }) {
  const [apportPct, setApportPct] = useState(20);

  const loanPct = Math.max(0, 100 - apportPct) / 100;
  const isCash = apportPct >= 100;

  // 1. Taux variable selon nb de crédits actifs
  const activeLoanCount = (loans ?? []).length;
  const interestRate = LOAN_RATE_SCALE[Math.min(activeLoanCount, LOAN_RATE_SCALE.length - 1)];
  const loanInfo = useMemo(
    () => calcLoanPayment(effectivePrice, loanPct, interestRate),
    [effectivePrice, loanPct, interestRate],
  );
  const downPayment = effectivePrice - loanInfo.loanAmount;

  // 5. Frais de notaire
  const notaireFees = Math.round(effectivePrice * NOTAIRE_FEES_PCT);
  const totalUpfront = downPayment + notaireFees;
  const canAfford = cash >= totalUpfront;

  // 2. LTV check
  const existingDebt = (loans ?? []).reduce((sum, l) => sum + (l.balance ?? 0), 0);
  const newValuation = (valuation ?? 0) + effectivePrice;
  const ltv = !isCash && newValuation > 0 ? (existingDebt + loanInfo.loanAmount) / newValuation : 0;
  const ltvExceeded = !isCash && ltv > LTV_MAX_RATIO;

  // 8. Max crédits actifs
  const maxLoansReached = !isCash && activeLoanCount >= MAX_ACTIVE_LOANS;

  const canBuy = canAfford && !ltvExceeded && !maxLoansReached;

  return (
    <div style={{
      marginTop: 10, padding: '14px 16px', borderRadius: 14,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        Financement · {listing.type}
      </div>

      {/* Slider */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Apport personnel</span>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
            {apportPct}% · {fmtCash(downPayment)}
          </span>
        </div>
        <input
          type="range"
          min={MIN_APPORT_PCT}
          max={100}
          step={5}
          value={apportPct}
          onChange={e => setApportPct(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          <span>{MIN_APPORT_PCT}% (effet de levier max)</span>
          <span>100% (comptant)</span>
        </div>
      </div>

      {/* Blocages */}
      {maxLoansReached && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)' }}>Limite de {MAX_ACTIVE_LOANS} crédits atteinte</div>
            <div style={{ color: 'var(--muted)', marginTop: 2 }}>Remboursez un crédit ou achetez comptant.</div>
          </div>
        </div>
      )}
      {ltvExceeded && !maxLoansReached && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)' }}>Ratio d'endettement dépassé ({Math.round(ltv * 100)}% / {Math.round(LTV_MAX_RATIO * 100)}% max)</div>
            <div style={{ color: 'var(--muted)', marginTop: 2 }}>Augmentez l'apport ou remboursez des crédits.</div>
          </div>
        </div>
      )}

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            Apport
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: canAfford ? 'var(--accent)' : 'var(--red)' }}>
            {fmtCash(downPayment)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            + {fmtCash(notaireFees)} notaire = <strong>{fmtCash(totalUpfront)}</strong>
          </div>
          {!canAfford && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>
              Manque {fmtCash(totalUpfront - cash)}
            </div>
          )}
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            {isCash ? 'Achat comptant' : 'Crédit'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: isCash ? 'var(--muted)' : 'var(--amber)' }}>
            {isCash ? '—' : fmtCash(loanInfo.loanAmount)}
          </div>
        </div>
        {!isCash && (
          <>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Annuité
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--red)' }}>
                −{fmtCash(loanInfo.annualPayment)}/an
              </div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                Taux · Durée
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: activeLoanCount >= 2 ? 'var(--red)' : 'var(--text)' }}>
                {(interestRate * 100).toFixed(1)}% · 20 ans
              </div>
              {activeLoanCount > 0 && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  ({activeLoanCount} crédit{activeLoanCount > 1 ? 's' : ''} actif{activeLoanCount > 1 ? 's' : ''})
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cash shortcut */}
      {apportPct < 100 && (
        <button
          onClick={() => setApportPct(100)}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
            cursor: 'pointer', marginBottom: 8,
          }}
        >
          💰 Acheter comptant à {fmtCash(effectivePrice)} (+ {fmtCash(notaireFees)} notaire)
        </button>
      )}

      {/* Confirm / Cancel */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => canBuy && onConfirm(apportPct / 100)}
          disabled={!canBuy}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700,
            background: canBuy ? 'var(--accent)' : 'var(--surface2)',
            border: 'none', color: canBuy ? '#fff' : 'var(--muted)',
            cursor: canBuy ? 'pointer' : 'not-allowed',
          }}
        >
          {isCash
            ? `✅ Acheter comptant — ${fmtCash(totalUpfront)}`
            : `✅ Confirmer — total ${fmtCash(totalUpfront)}`}
        </button>
      </div>
    </div>
  );
}

const PRICE_TIERS = [
  { id: 'all',       label: 'Tous',           unlock: 0    },
  { id: 'budget',    label: '< 100 k€',       max: 100,    unlock: 0    },
  { id: 'standard',  label: '100–300 k€',     min: 100,  max: 300,  unlock: 100  },
  { id: 'premium',   label: '300–700 k€',     min: 300,  max: 700,  unlock: 300  },
  { id: 'exception', label: '700k–1M€',       min: 700,  max: 1000, unlock: 700  },
  { id: 'million',   label: '1M€+',           min: 1000,             unlock: 2000 },
];

const PAGE_SIZE = 6;

export default function MarketModal({ onClose }) {
  const { state, buyProperty, refreshMarket } = useGame();
  const { marketListings = [], cash, economicCycle, valuation = 0, loans = [] } = state;
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [priceTier, setPriceTier] = useState('all');
  const [page, setPage] = useState(0);

  const hasAgent = (state.contacts ?? []).includes('agent_immo');

  const filtered = marketListings.filter(l => {
    if (filter && l.type !== filter && l.condition !== filter) return false;
    if (priceTier !== 'all') {
      const tier = PRICE_TIERS.find(t => t.id === priceTier);
      if (tier) {
        if (tier.min !== undefined && l.price < tier.min) return false;
        if (tier.max !== undefined && l.price >= tier.max) return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleFilterChange = (newFilter) => { setFilter(newFilter); setPage(0); };
  const handleTierChange = (newTier) => { setPriceTier(newTier); setPage(0); };

  const types = [...new Set(marketListings.map(l => l.type))];

  return (
    <Modal title="🛒 Marché immobilier" onClose={onClose} wide>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{CYCLE_LABELS[economicCycle]}</span>
        <button
          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)' }}
          onClick={() => { refreshMarket(); setSelectedId(null); }}
        >
          🔄 Actualiser
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="market-filters">
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, alignSelf: 'center', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>Type</span>
          <button className={`market-filter-chip ${!filter ? 'active' : ''}`} onClick={() => handleFilterChange('')}>Tous</button>
          {types.map(t => (
            <button key={t} className={`market-filter-chip ${filter === t ? 'active' : ''}`} onClick={() => handleFilterChange(t)}>{t}</button>
          ))}
        </div>
        <div className="market-filters">
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, alignSelf: 'center', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.05em' }}>Prix</span>
          {PRICE_TIERS.map(tier => {
            const unlocked = valuation >= tier.unlock;
            const active = priceTier === tier.id;
            return (
              <button
                key={tier.id}
                className={`market-filter-chip ${active ? 'active' : ''}`}
                onClick={() => unlocked && handleTierChange(active ? 'all' : tier.id)}
                disabled={!unlocked}
                title={!unlocked ? `Débloqué à ${tier.unlock} k€ de patrimoine` : undefined}
                style={{ opacity: unlocked ? 1 : 0.4, cursor: unlocked ? 'pointer' : 'not-allowed' }}
              >
                {tier.label}{!unlocked && ' 🔒'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: safePage === 0 ? 'var(--muted)' : 'var(--text)',
              cursor: safePage === 0 ? 'default' : 'pointer', opacity: safePage === 0 ? 0.4 : 1,
            }}
          >← Précédent</button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Page {safePage + 1} / {totalPages} · {filtered.length} biens
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: safePage >= totalPages - 1 ? 'var(--muted)' : 'var(--text)',
              cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
              opacity: safePage >= totalPages - 1 ? 0.4 : 1,
            }}
          >Suivant →</button>
        </div>
      )}

      <div className="market-grid">
        {paginated.map(listing => {
          const basePrice = listing.price;
          const effectivePrice = hasAgent ? Math.round(basePrice * 0.95) : basePrice;
          const minApport = Math.round(effectivePrice * MIN_APPORT_PCT / 100);
          const notaireMin = Math.round(effectivePrice * NOTAIRE_FEES_PCT);
          const canAffordMin = cash >= minApport + notaireMin && loans.length < MAX_ACTIVE_LOANS;
          const condLabel = propertyData.conditionLabels?.[listing.condition] ?? listing.condition;
          const condEmoji = COND_EMOJI[listing.condition] ?? '';
          const isSelected = selectedId === listing.id;
          const emoji = TYPE_EMOJI[listing.type] ?? '🏠';
          const dpeClass = listing.energyClass ?? null;

          return (
            <div className={`market-grid-card${isSelected ? ' market-grid-card--selected' : ''}`} key={listing.id}>
              {isSelected ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{listing.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {listing.place} · {condLabel}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent)' }}>
                      {fmtCash(effectivePrice)}
                    </div>
                  </div>
                  <PurchaseConfigurator
                    listing={listing}
                    effectivePrice={effectivePrice}
                    cash={cash}
                    loans={loans}
                    valuation={valuation}
                    onConfirm={(apportPct) => { buyProperty(listing, apportPct); onClose(); }}
                    onCancel={() => setSelectedId(null)}
                  />
                </>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <div className="market-grid-card-emoji">{emoji}</div>
                    {listing.offMarket && (
                      <span
                        data-tip="Bien off-market : négocié en direct via ton notaire, prix inférieur au marché"
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          fontSize: 14, cursor: 'default',
                          background: 'var(--accent-soft)', borderRadius: 6,
                          padding: '1px 4px', border: '1px solid rgba(31,122,77,.3)',
                        }}
                      >🔑</span>
                    )}
                  </div>
                  <div className="market-grid-card-type" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {listing.type}
                    {listing.offMarket && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>OFF-MARKET</span>}
                  </div>
                  <div className="market-grid-card-price">
                    {hasAgent && <span style={{ textDecoration: 'line-through', opacity: .5, marginRight: 4, fontSize: 11 }}>{fmtCash(basePrice)}</span>}
                    {fmtCash(effectivePrice)}
                  </div>
                  <div className="market-grid-card-meta">📍 {listing.place}</div>
                  <div className="market-grid-card-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span>{condEmoji} {condLabel}</span>
                    {dpeClass && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                        background: (ENERGY_COLOR[dpeClass] ?? '#888') + '22',
                        border: `1px solid ${ENERGY_COLOR[dpeClass] ?? '#888'}`,
                        color: ENERGY_COLOR[dpeClass] ?? '#888',
                      }}>DPE {dpeClass}</span>
                    )}
                    {hasAgent && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>−5%</span>}
                  </div>
                  <button
                    className="market-listing-buy-btn"
                    style={{ marginTop: 'auto' }}
                    disabled={!canAffordMin}
                    onClick={() => setSelectedId(listing.id)}
                  >
                    {canAffordMin ? 'Financer →' : `Min. ${fmtCash(minApport)}`}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
