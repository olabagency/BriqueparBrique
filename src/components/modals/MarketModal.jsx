import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash, fmtMonthly } from '../../engine/utils.js';
import { calcLoanPayment } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';

const CYCLE_LABELS = { hausse: '📈 Marché haussier', neutre: '➡️ Marché neutre', baisse: '📉 Marché baissier' };
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

function PurchaseConfigurator({ listing, effectivePrice, cash, onConfirm, onCancel }) {
  const [apportPct, setApportPct] = useState(20);

  const loanPct = Math.max(0, 100 - apportPct) / 100;
  const loanInfo = useMemo(() => calcLoanPayment(effectivePrice, loanPct), [effectivePrice, loanPct]);
  const downPayment = effectivePrice - loanInfo.loanAmount;
  const canAfford = cash >= downPayment;
  const isCash = apportPct >= 100;

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

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            Apport
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: canAfford ? 'var(--accent)' : 'var(--red)' }}>
            {fmtCash(downPayment)}
          </div>
          {!canAfford && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>
              Manque {fmtCash(downPayment - cash)}
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
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
                {(loanInfo.rate * 100).toFixed(1)}% · 20 ans
              </div>
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
          💰 Acheter comptant à {fmtCash(effectivePrice)}
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
          onClick={() => canAfford && onConfirm(apportPct / 100)}
          disabled={!canAfford}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 700,
            background: canAfford ? 'var(--accent)' : 'var(--surface2)',
            border: 'none', color: canAfford ? '#fff' : 'var(--muted)',
            cursor: canAfford ? 'pointer' : 'not-allowed',
          }}
        >
          {isCash
            ? `✅ Acheter comptant — ${fmtCash(effectivePrice)}`
            : `✅ Confirmer — apport ${fmtCash(downPayment)}`}
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
  const { marketListings = [], cash, economicCycle, valuation = 0 } = state;
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

      <div className="market-filters">
        <button className={`market-filter-chip ${!filter ? 'active' : ''}`} onClick={() => handleFilterChange('')}>Tous</button>
        {types.map(t => (
          <button key={t} className={`market-filter-chip ${filter === t ? 'active' : ''}`} onClick={() => handleFilterChange(t)}>{t}</button>
        ))}
      </div>

      <div className="market-filters" style={{ marginTop: 0 }}>
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
          const canAffordMin = cash >= minApport;
          const condLabel = propertyData.conditionLabels?.[listing.condition] ?? listing.condition;
          const isSelected = selectedId === listing.id;
          const emoji = TYPE_EMOJI[listing.type] ?? '🏠';

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
                    onConfirm={(apportPct) => { buyProperty(listing, apportPct); onClose(); }}
                    onCancel={() => setSelectedId(null)}
                  />
                </>
              ) : (
                <>
                  <div className="market-grid-card-emoji">{emoji}</div>
                  <div className="market-grid-card-type">{listing.type}</div>
                  <div className="market-grid-card-price">
                    {hasAgent && <span style={{ textDecoration: 'line-through', opacity: .5, marginRight: 4, fontSize: 11 }}>{fmtCash(basePrice)}</span>}
                    {fmtCash(effectivePrice)}
                  </div>
                  <div className="market-grid-card-meta">📍 {listing.place}</div>
                  <div className="market-grid-card-meta">
                    {condLabel}{hasAgent && <span style={{ color: 'var(--accent)', marginLeft: 4, fontWeight: 700 }}>−5%</span>}
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
