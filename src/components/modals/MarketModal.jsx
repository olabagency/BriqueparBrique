import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcLoanPayment } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';

const CYCLE_LABELS = { hausse: '📈 Marché haussier', neutre: '➡️ Marché neutre', baisse: '📉 Marché baissier' };
const MIN_APPORT_PCT = 10; // minimum 10% down

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
                Mensualité
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--red)' }}>
                −{fmtCash(loanInfo.monthlyPayment)}/mois
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

export default function MarketModal({ onClose }) {
  const { state, buyProperty, refreshMarket } = useGame();
  const { marketListings = [], cash, economicCycle } = state;
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const hasAgent = (state.contacts ?? []).includes('agent_immo');

  const filtered = filter
    ? marketListings.filter(l => l.type === filter || l.condition === filter)
    : marketListings;

  const types = [...new Set(marketListings.map(l => l.type))];

  return (
    <Modal title="🛒 Marché immobilier" onClose={onClose}>
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
        <button className={`market-filter-chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>Tous</button>
        {types.map(t => (
          <button key={t} className={`market-filter-chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      <div className="portfolio-list">
        {filtered.map(listing => {
          const basePrice = listing.price;
          const effectivePrice = hasAgent ? Math.round(basePrice * 0.95) : basePrice;
          const previewLoan = calcLoanPayment(effectivePrice, 0.8); // preview at 20% apport
          const minApport = Math.round(effectivePrice * MIN_APPORT_PCT / 100);
          const canAffordMin = cash >= minApport;
          const condLabel = propertyData.conditionLabels?.[listing.condition] ?? listing.condition;
          const isSelected = selectedId === listing.id;

          return (
            <div
              className="market-listing-card"
              key={listing.id}
              style={{ borderColor: isSelected ? 'var(--accent)' : undefined }}
            >
              <div className="market-listing-top">
                <span className="market-listing-name">{listing.type}</span>
                <div style={{ textAlign: 'right' }}>
                  {hasAgent && (
                    <div style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'line-through', opacity: .6 }}>
                      {fmtCash(basePrice)}
                    </div>
                  )}
                  <span className="market-listing-price">{fmtCash(effectivePrice)}</span>
                </div>
              </div>
              <div className="market-listing-meta">
                📍 {listing.place} · {condLabel}
                {hasAgent && <span style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 700 }}>−5% agent</span>}
              </div>
              <div className="market-listing-meta" style={{ color: 'var(--muted)' }}>
                Apport min 10% : {fmtCash(minApport)} · Mensualité indicative : {fmtCash(previewLoan.monthlyPayment)}/mois
              </div>

              {isSelected ? (
                <PurchaseConfigurator
                  listing={listing}
                  effectivePrice={effectivePrice}
                  cash={cash}
                  onConfirm={(apportPct) => {
                    buyProperty(listing, apportPct);
                    onClose();
                  }}
                  onCancel={() => setSelectedId(null)}
                />
              ) : (
                <button
                  className="market-listing-buy-btn"
                  disabled={!canAffordMin}
                  onClick={() => setSelectedId(listing.id)}
                  title={!canAffordMin ? `Apport minimum requis : ${fmtCash(minApport)}` : 'Configurer le financement'}
                >
                  {canAffordMin
                    ? `Financer →`
                    : `Apport insuffisant (min. ${fmtCash(minApport)})`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
