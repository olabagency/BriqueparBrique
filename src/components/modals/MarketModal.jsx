import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcLoanPayment } from '../../engine/market.js';
import propertyData from '../../data/property_data.json';

const CYCLE_LABELS = { hausse: '📈 Marché haussier', neutre: '➡️ Marché neutre', baisse: '📉 Marché baissier' };

export default function MarketModal({ onClose }) {
  const { state, buyProperty, refreshMarket } = useGame();
  const { marketListings = [], cash, economicCycle } = state;
  const [filter, setFilter] = useState('');

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
          onClick={refreshMarket}
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
          const loan = calcLoanPayment(listing.price);
          const downPayment = listing.price - loan.loanAmount;
          const canAfford = cash >= downPayment;
          const condLabel = propertyData.conditionLabels?.[listing.condition] ?? listing.condition;

          return (
            <div className="market-listing-card" key={listing.id}>
              <div className="market-listing-top">
                <span className="market-listing-name">{listing.type}</span>
                <span className="market-listing-price">{fmtCash(listing.price)}</span>
              </div>
              <div className="market-listing-meta">
                📍 {listing.place} · {condLabel}
              </div>
              <div className="market-listing-meta" style={{ color: 'var(--accent)' }}>
                Apport : {fmtCash(downPayment)} · Mensualité : {fmtCash(loan.monthlyPayment)}/mois
              </div>
              <button
                className="market-listing-buy-btn"
                disabled={!canAfford}
                onClick={() => {
                  buyProperty(listing);
                  onClose();
                }}
                title={!canAfford ? `Il te faut ${fmtCash(downPayment)} d'apport` : ''}
              >
                {canAfford ? `Acheter — apport ${fmtCash(downPayment)}` : `Apport insuffisant (${fmtCash(downPayment)} requis)`}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
